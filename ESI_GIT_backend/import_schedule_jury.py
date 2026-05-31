# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

"""
import_schedule_jury.py
======================
Reads parsed_teams.json and populates:
  - schedules  (presentation_date, presentation_time, room, duration=60)
  - project_jury (teacher1=president, teacher2=examiner1, teacher3=examiner2,
                  supervisor=project TID from projects_projects)

Matching logic:
  • Students → project: match by last name (normalised, case-insensitive).
    First student in the list is used as the anchor; if ≥1 of the team's
    students exist in sprojects for the same PID the project is considered found.
  • Teacher names → staff TID: match by last name (normalised).
    First jury member listed = President (teacher1).
    Second = Examiner-1 (teacher2).
    Third  = Examiner-2 (teacher3).
    Supervisor is taken from projects_projects.TID_id (already set).

Run from the ESI_GIT_backend directory:
    venv/Scripts/python.exe import_schedule_jury.py

Dry-run by default; pass --commit to actually write to the database.
"""

import os, sys, json, re
from datetime import date, time
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import psycopg2

# ─── helpers ──────────────────────────────────────────────────────────────────

def normalise(name: str) -> str:
    """Lower-case, strip accents (rough), remove punctuation."""
    import unicodedata
    name = unicodedata.normalize("NFD", name)
    name = "".join(c for c in name if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z ]", "", name.lower()).strip()


def parse_date(s: str) -> date:
    """'Mardi 02/06/2026\n09h00-10h00'  →  date(2026,6,2)"""
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", s)
    if not m:
        raise ValueError(f"Cannot parse date from: {s!r}")
    d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return date(y, mo, d)


def parse_time(s: str) -> time:
    """'Mardi 02/06/2026\n09h00-10h00'  →  time(9,0)"""
    m = re.search(r"(\d{1,2})h(\d{2})-", s)
    if not m:
        raise ValueError(f"Cannot parse time from: {s!r}")
    return time(int(m.group(1)), int(m.group(2)))


def duration_minutes(s: str) -> int:
    """'09h00-10h00' → 60"""
    m = re.search(r"(\d{1,2})h(\d{2})-(\d{1,2})h(\d{2})", s)
    if not m:
        return 60
    start = int(m.group(1)) * 60 + int(m.group(2))
    end   = int(m.group(3)) * 60 + int(m.group(4))
    return end - start


# ─── load parsed teams ────────────────────────────────────────────────────────

json_path = os.path.join(os.path.dirname(__file__), "parsed_teams.json")
with open(json_path, encoding="utf-8") as f:
    teams = json.load(f)

print(f"Loaded {len(teams)} teams from parsed_teams.json\n")

# ─── connect ──────────────────────────────────────────────────────────────────

conn = psycopg2.connect(
    dbname=os.environ["DB_NAME"],
    user=os.environ["DB_USER"],
    password=os.environ["DB_PASSWORD"],
    host=os.environ["DB_HOST"],
    port=int(os.environ.get("DB_PORT", 5432)),
)
cur = conn.cursor()

# ─── build lookup maps ────────────────────────────────────────────────────────

# staff: normalised last_name → TID
cur.execute('SELECT "TID", first_name, last_name FROM staff')
staff_map: dict[str, int] = {}
staff_full: dict[int, str] = {}
for tid, fn, ln in cur.fetchall():
    key = normalise(ln)
    staff_map[key] = tid
    staff_full[tid] = f"{fn} {ln}"

print("Staff name -> TID map:")
for k, v in sorted(staff_map.items()):
    print(f"  {k!r:30s} -> TID={v}  ({staff_full[v]})")
print()

# student last_name → list of PIDs
cur.execute("""
    SELECT s.last_name, sp."PID_id"
    FROM students s
    JOIN sprojects sp ON sp."CID_id" = s."CID"
""")
student_to_pids: dict[str, list[int]] = {}
for last_name, pid in cur.fetchall():
    key = normalise(last_name)
    student_to_pids.setdefault(key, []).append(pid)

# PID → supervisor TID
cur.execute('SELECT "PID", "TID_id" FROM projects_projects')
pid_to_supervisor: dict[int, int | None] = {r[0]: r[1] for r in cur.fetchall()}

# ─── match each team ──────────────────────────────────────────────────────────

COMMIT = "--commit" in sys.argv
if not COMMIT:
    print("[DRY RUN] pass --commit to write to database\n")

success, skipped, errors = 0, 0, 0

for team_num, team in teams.items():
    date_heure = team["date_heure"]
    lieu       = team["lieu"]
    jury_raw   = team["jury"]
    students   = team["students"]

    # ── parse date/time ──────────────────────────────────────────────────────
    try:
        pres_date = parse_date(date_heure)
        pres_time = parse_time(date_heure)
        duration  = duration_minutes(date_heure)
    except ValueError as e:
        print(f"[TEAM {team_num}] ⚠ Date parse error: {e}")
        errors += 1
        continue

    # ── match project by students ─────────────────────────────────────────────
    pid_votes: dict[int, int] = {}
    for st in students:
        key = normalise(st["nom"])
        for pid in student_to_pids.get(key, []):
            pid_votes[pid] = pid_votes.get(pid, 0) + 1

    if not pid_votes:
        print(f"[TEAM {team_num}] ⚠ No students matched any project – skipping")
        print(f"          Students: {[s['nom'] for s in students]}")
        skipped += 1
        continue

    # pick PID with most matches
    best_pid = max(pid_votes, key=lambda p: pid_votes[p])
    match_count = pid_votes[best_pid]

    # ── resolve jury teachers ─────────────────────────────────────────────────
    jury_names = [n.strip() for n in jury_raw.split("\n") if n.strip()]
    jury_tids: list[int | None] = []
    for jname in jury_names:
        # extract last name part (last word, or UPPERCASE token)
        tokens = jname.split()
        # Try to find an all-caps token (last name convention in PDF)
        caps_tokens = [t for t in tokens if t.isupper() and len(t) > 2]
        candidates = caps_tokens if caps_tokens else tokens

        matched_tid = None
        for token in candidates:
            norm_token = normalise(token)
            if norm_token in staff_map:
                matched_tid = staff_map[norm_token]
                break

        if matched_tid is None:
            # Try partial match (first 5 chars)
            for token in candidates:
                norm_token = normalise(token)
                for staff_key, tid in staff_map.items():
                    if norm_token and (staff_key.startswith(norm_token[:5]) or norm_token[:5] in staff_key):
                        matched_tid = tid
                        break
                if matched_tid:
                    break

        jury_tids.append(matched_tid)

    # Pad to 3
    while len(jury_tids) < 3:
        jury_tids.append(None)

    t1, t2, t3 = jury_tids[0], jury_tids[1], jury_tids[2]
    supervisor = pid_to_supervisor.get(best_pid)

    # ── report ────────────────────────────────────────────────────────────────
    jury_resolved = [
        f"{jury_names[i] if i < len(jury_names) else '?'} -> TID={jury_tids[i]} ({staff_full.get(jury_tids[i], 'UNKNOWN') if jury_tids[i] else 'NOT FOUND'})"
        for i in range(3)
    ]
    print(f"[TEAM {team_num}] PID={best_pid} ({match_count}/{len(students)} students matched)")
    print(f"          Date: {pres_date}  Time: {pres_time}  Room: {lieu}  Duration: {duration}m")
    print(f"          President:    {jury_resolved[0]}")
    print(f"          Examiner1:    {jury_resolved[1]}")
    print(f"          Examiner2:    {jury_resolved[2]}")
    print(f"          Supervisor (from DB): TID={supervisor} ({staff_full.get(supervisor, 'none')})")

    if not t1:
        print(f"          ⚠ President not resolved – skipping jury insert")
        skipped += 1
        continue

    # ── write to DB ───────────────────────────────────────────────────────────
    if COMMIT:
        try:
            # SCHEDULE: upsert
            cur.execute("""
                INSERT INTO schedules ("PID_id", presentation_date, presentation_time, room, duration_minutes)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT ("PID_id") DO UPDATE SET
                    presentation_date = EXCLUDED.presentation_date,
                    presentation_time = EXCLUDED.presentation_time,
                    room              = EXCLUDED.room,
                    duration_minutes  = EXCLUDED.duration_minutes
            """, (best_pid, pres_date, pres_time, lieu, duration))

            # PROJECT_JURY: upsert
            cur.execute("""
                INSERT INTO project_jury ("PID_id", teacher1_id_id, teacher2_id_id, teacher3_id_id, supervisor_id_id, assigned_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT ("PID_id") DO UPDATE SET
                    teacher1_id_id   = EXCLUDED.teacher1_id_id,
                    teacher2_id_id   = EXCLUDED.teacher2_id_id,
                    teacher3_id_id   = EXCLUDED.teacher3_id_id,
                    supervisor_id_id = EXCLUDED.supervisor_id_id
            """, (best_pid, t1, t2, t3, supervisor))

            success += 1
        except Exception as e:
            print(f"          ❌ DB error: {e}")
            conn.rollback()
            errors += 1
            continue

    print()

if COMMIT:
    conn.commit()
    print(f"\n[OK] Committed to DB: {success} teams | Skipped: {skipped} | Errors: {errors}")
else:
    print(f"\n[DRY RUN] {success + skipped} teams would be processed | {skipped} skipped | {errors} errors")
    print("   Run with --commit to apply changes.")

cur.close()
conn.close()
