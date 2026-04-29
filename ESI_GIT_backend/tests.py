"""
ESI-GIT Backend — Comprehensive API Test Suite
Run with:
    DJANGO_SETTINGS_MODULE=ESI_GIT.test_settings python manage.py test tests --verbosity=2
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ESI_GIT.test_settings")

import django
django.setup()

from django.test import TestCase, Client
from django.urls import reverse, resolve
import json


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_student(cid=1001, email="student@esi.dz", password="StrongPass1!",
                 first_name="Ali", last_name="Benali",
                 academic_year="2024/2025", level=3, specialty="GL"):
    from users.models import Student
    s = Student(
        CID=cid, email=email, first_name=first_name,
        last_name=last_name, academic_year=academic_year,
        level=level, specialty=specialty,
        is_active=True, is_blocked=False,
    )
    s.set_password(password)
    s.save()
    return s


def make_staff(email="teacher@esi.dz", password="TeachPass1!",
               first_name="Karim", last_name="Meziane",
               is_admin=False, is_teacher=True):
    from users.models import Staff
    s = Staff(
        email=email, first_name=first_name, last_name=last_name,
        is_admin=is_admin, is_teacher=is_teacher,
        is_active=True, is_blocked=False,
    )
    s.set_password(password)
    s.save()
    return s


def make_admin(email="admin@esi.dz", password="AdminPass1!"):
    return make_staff(email=email, password=password,
                      first_name="Admin", last_name="User",
                      is_admin=True, is_teacher=False)


def get_token(client, email, password):
    """Login and return the access token."""
    resp = client.post(
        "/api/login/",
        data=json.dumps({"email": email, "password": password}),
        content_type="application/json",
    )
    assert resp.status_code == 200, f"Login failed: {resp.json()}"
    return resp.json()["access"]


def auth_headers(token):
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


def make_project(name="Test Project", type="web", specialty="GL",
                 year="2024/2025", supervisor=None):
    import random, string
    from projects.models import Projects
    invite = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    p = Projects.objects.create(
        name=name, type=type, specialty=specialty, year=year,
        TID=supervisor,
        invite_code=invite,
    )
    return p


def make_membership(student, project, is_leader=False, role="backend"):
    from projects.models import SProjects
    return SProjects.objects.create(
        CID=student, PID=project, is_leader=is_leader, role=role
    )


# ─── 1. Authentication ────────────────────────────────────────────────────────

class AuthTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.student = make_student()
        self.staff = make_staff()

    def test_login_student_success(self):
        resp = self.client.post(
            "/api/login/",
            data=json.dumps({"email": "student@esi.dz", "password": "StrongPass1!"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("access", data)
        self.assertEqual(data["role"], "student")
        self.assertIn("user", data)

    def test_login_staff_success(self):
        resp = self.client.post(
            "/api/login/",
            data=json.dumps({"email": "teacher@esi.dz", "password": "TeachPass1!"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["role"], "staff")
        self.assertIn("access", data)

    def test_login_wrong_password(self):
        resp = self.client.post(
            "/api/login/",
            data=json.dumps({"email": "student@esi.dz", "password": "wrong"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_login_missing_fields(self):
        resp = self.client.post(
            "/api/login/",
            data=json.dumps({"email": "student@esi.dz"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_login_blocked_student(self):
        # block_student sets is_blocked=True AND is_active=False
        # The authentication backend checks is_active, so authenticate() returns None → 401
        # The 403 branch in login view is only reached if authenticate() succeeds AND is_blocked=True
        self.student.is_blocked = True
        self.student.is_active = False   # mimic what block_student view does
        self.student.save()
        resp = self.client.post(
            "/api/login/",
            data=json.dumps({"email": "student@esi.dz", "password": "StrongPass1!"}),
            content_type="application/json",
        )
        # Backend rejects (is_active=False) → returns None → 401
        self.assertIn(resp.status_code, [401, 403])

    def test_me_endpoint_student(self):
        token = get_token(self.client, "student@esi.dz", "StrongPass1!")
        resp = self.client.get("/api/me/", **auth_headers(token))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["role"], "student")
        self.assertEqual(data["email"], "student@esi.dz")

    def test_me_endpoint_staff(self):
        token = get_token(self.client, "teacher@esi.dz", "TeachPass1!")
        resp = self.client.get("/api/me/", **auth_headers(token))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["role"], "staff")

    def test_me_unauthenticated(self):
        resp = self.client.get("/api/me/")
        self.assertEqual(resp.status_code, 401)

    def test_change_password(self):
        token = get_token(self.client, "student@esi.dz", "StrongPass1!")
        resp = self.client.post(
            "/api/change-password/",
            data=json.dumps({"old_password": "StrongPass1!", "new_password": "NewPass99!"}),
            content_type="application/json",
            **auth_headers(token),
        )
        self.assertEqual(resp.status_code, 200)
        # verify new password works
        resp2 = self.client.post(
            "/api/login/",
            data=json.dumps({"email": "student@esi.dz", "password": "NewPass99!"}),
            content_type="application/json",
        )
        self.assertEqual(resp2.status_code, 200)

    def test_change_password_wrong_old(self):
        token = get_token(self.client, "student@esi.dz", "StrongPass1!")
        resp = self.client.post(
            "/api/change-password/",
            data=json.dumps({"old_password": "WrongOld!", "new_password": "NewPass99!"}),
            content_type="application/json",
            **auth_headers(token),
        )
        self.assertEqual(resp.status_code, 400)


# ─── 2. Admin — User Management ───────────────────────────────────────────────

class AdminUserTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = make_admin()
        self.admin_token = get_token(self.client, "admin@esi.dz", "AdminPass1!")
        self.student = make_student(cid=2001, email="existstudent@esi.dz")

    def test_list_users(self):
        resp = self.client.get("/api/admin/users/", **auth_headers(self.admin_token))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("users", data)

    def test_list_users_filter_staff(self):
        resp = self.client.get(
            "/api/admin/users/?role=staff", **auth_headers(self.admin_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_list_users_requires_admin(self):
        teacher = make_staff(email="teacher2@esi.dz", password="Pass1234!")
        token = get_token(self.client, "teacher2@esi.dz", "Pass1234!")
        resp = self.client.get("/api/admin/users/", **auth_headers(token))
        self.assertEqual(resp.status_code, 403)

    def test_create_student(self):
        resp = self.client.post(
            "/api/admin/students/create/",
            data=json.dumps({
                "CID": 3001,
                "email": "newstudent@esi.dz",
                "first_name": "Yacine",
                "last_name": "Amrani",
                "specialty": "SI",
                "academic_year": "2024/2025",
                "is_active": True,
            }),
            content_type="application/json",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn("student_id", data)

    def test_create_student_duplicate_email(self):
        resp = self.client.post(
            "/api/admin/students/create/",
            data=json.dumps({
                "CID": 3002,
                "email": "existstudent@esi.dz",  # already exists
                "first_name": "Dup",
                "last_name": "Student",
                "specialty": "GL",
                "academic_year": "2024/2025",
                "is_active": True,
            }),
            content_type="application/json",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 400)

    def test_get_student(self):
        resp = self.client.get(
            f"/api/admin/students/{self.student.CID}/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)

    def test_get_student_not_found(self):
        resp = self.client.get(
            "/api/admin/students/9999/", **auth_headers(self.admin_token)
        )
        self.assertEqual(resp.status_code, 404)

    def test_block_student(self):
        resp = self.client.patch(
            f"/api/admin/students/block/{self.student.CID}/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)
        self.student.refresh_from_db()
        self.assertTrue(self.student.is_blocked)

    def test_unblock_student(self):
        self.student.is_blocked = True
        self.student.save()
        resp = self.client.patch(
            f"/api/admin/students/unblock/{self.student.CID}/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)
        self.student.refresh_from_db()
        self.assertFalse(self.student.is_blocked)

    def test_reset_password_student(self):
        resp = self.client.post(
            f"/api/admin/students/reset-password/{self.student.CID}/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("message", resp.json())

    def test_delete_student(self):
        s = make_student(cid=9001, email="todelete@esi.dz")
        resp = self.client.delete(
            f"/api/admin/students/{s.CID}/delete/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)
        from users.models import Student
        self.assertFalse(Student.objects.filter(CID=9001).exists())

    def test_create_staff(self):
        resp = self.client.post(
            "/api/admin/staff/create/",
            data=json.dumps({
                "email": "newteacher@esi.dz",
                "first_name": "Sara",
                "last_name": "Kaci",
                "is_admin": False,
                "is_teacher": True,
                "is_active": True,
            }),
            content_type="application/json",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 201)

    def test_block_staff(self):
        staff = make_staff(email="blockme@esi.dz", password="BlockPass1!")
        resp = self.client.patch(
            f"/api/admin/staff/block/{staff.TID}/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)
        staff.refresh_from_db()
        self.assertTrue(staff.is_blocked)

    def test_unblock_staff(self):
        staff = make_staff(email="unblocky@esi.dz", password="UnblockP1!")
        staff.is_blocked = True
        staff.save()
        resp = self.client.patch(
            f"/api/admin/staff/unblock/{staff.TID}/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)
        staff.refresh_from_db()
        self.assertFalse(staff.is_blocked)

    def test_reset_password_staff(self):
        staff = make_staff(email="resetme@esi.dz", password="ResetMe1!")
        resp = self.client.post(
            f"/api/admin/staff/reset-password/{staff.TID}/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)


# ─── 3. Admin — Dashboard ─────────────────────────────────────────────────────

class AdminDashboardTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = make_admin()
        self.admin_token = get_token(self.client, "admin@esi.dz", "AdminPass1!")

    def test_admin_dashboard(self):
        resp = self.client.get(
            "/api/admin/dashboard/", **auth_headers(self.admin_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_projects_analytics(self):
        resp = self.client.get(
            "/api/projects/admin/analytics/", **auth_headers(self.admin_token)
        )
        self.assertEqual(resp.status_code, 200)


# ─── 4. Projects ──────────────────────────────────────────────────────────────

class ProjectTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = make_admin()
        self.admin_token = get_token(self.client, "admin@esi.dz", "AdminPass1!")
        self.student = make_student(cid=5001, email="projstudent@esi.dz")
        self.student_token = get_token(self.client, "projstudent@esi.dz", "StrongPass1!")
        self.teacher = make_staff(email="projteacher@esi.dz", password="TeachProj1!")

    def test_create_project(self):
        resp = self.client.post(
            "/api/projects/create/",
            data=json.dumps({
                "name": "My Project",
                "type": "web",
                "specialite": "GL",
                "role": "backend",
            }),
            content_type="application/json",
            **auth_headers(self.student_token),
        )
        self.assertIn(resp.status_code, [200, 201])

    def test_my_project_no_project(self):
        resp = self.client.get(
            "/api/projects/my-project/", **auth_headers(self.student_token)
        )
        self.assertEqual(resp.status_code, 404)

    def test_my_project_with_project(self):
        project = make_project(supervisor=self.teacher)
        make_membership(self.student, project, is_leader=True)
        resp = self.client.get(
            "/api/projects/my-project/", **auth_headers(self.student_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_join_project_invalid_code(self):
        resp = self.client.post(
            "/api/projects/join/",
            data=json.dumps({"invite_code": "INVALID1", "role": "backend"}),
            content_type="application/json",
            **auth_headers(self.student_token),
        )
        self.assertIn(resp.status_code, [400, 404])

    def test_leave_project(self):
        project = make_project(supervisor=self.teacher)
        make_membership(self.student, project, is_leader=False, role="frontend")
        resp = self.client.post(
            "/api/projects/leave/", **auth_headers(self.student_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_supervisor_request_requires_student(self):
        teacher_token = get_token(self.client, "projteacher@esi.dz", "TeachProj1!")
        resp = self.client.get(
            "/api/projects/supervisor-request/", **auth_headers(teacher_token)
        )
        self.assertEqual(resp.status_code, 403)

    def test_admin_groups_list(self):
        resp = self.client.get(
            "/api/projects/admin/groups/", **auth_headers(self.admin_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_admin_project_detail(self):
        project = make_project(supervisor=self.teacher)
        resp = self.client.get(
            f"/api/projects/admin/projects/{project.PID}/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)

    def test_admin_archive_project(self):
        project = make_project(supervisor=self.teacher)
        resp = self.client.patch(
            f"/api/projects/admin/projects/{project.PID}/archive/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)
        project.refresh_from_db()
        self.assertTrue(project.archived)

    def test_admin_restore_project(self):
        project = make_project(supervisor=self.teacher)
        project.archived = True
        project.save()
        resp = self.client.patch(
            f"/api/projects/admin/projects/{project.PID}/restore/",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)
        project.refresh_from_db()
        self.assertFalse(project.archived)

    def test_admin_assign_jury(self):
        project = make_project(supervisor=self.teacher)
        t2 = make_staff(email="jury2@esi.dz", password="Jury2Pass!")
        t3 = make_staff(email="jury3@esi.dz", password="Jury3Pass!")
        resp = self.client.post(
            f"/api/projects/admin/groups/{project.PID}/assign-jury/",
            data=json.dumps({
                "teacher1_id": self.teacher.TID,
                "teacher2_id": t2.TID,
                "teacher3_id": t3.TID,
            }),
            content_type="application/json",
            **auth_headers(self.admin_token),
        )
        self.assertEqual(resp.status_code, 200)

    def test_archived_projects_list(self):
        resp = self.client.get(
            "/api/projects/projects/archived/", **auth_headers(self.admin_token)
        )
        self.assertEqual(resp.status_code, 200)


# ─── 5. Tasks ─────────────────────────────────────────────────────────────────

class TaskTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.teacher = make_staff(email="task_teacher@esi.dz", password="TaskTeach1!")
        self.leader = make_student(cid=6001, email="leader@esi.dz")
        self.member = make_student(cid=6002, email="member@esi.dz")
        self.project = make_project(
            supervisor=self.teacher, year="2024/2025"
        )
        self.leader.academic_year = "2024/2025"
        self.leader.save()
        self.member.academic_year = "2024/2025"
        self.member.save()
        make_membership(self.leader, self.project, is_leader=True)
        make_membership(self.member, self.project, is_leader=False, role="frontend")
        self.leader_token = get_token(self.client, "leader@esi.dz", "StrongPass1!")
        self.member_token = get_token(self.client, "member@esi.dz", "StrongPass1!")

    def _create_task(self, token=None):
        if token is None:
            token = self.leader_token
        resp = self.client.post(
            "/api/tasks/",
            data=json.dumps({
                "title": "Implement login",
                "description": "Build the login page",
                "type": "feature",
                "priority": 2,
                "deadline": "2025-06-30",
            }),
            content_type="application/json",
            **auth_headers(token),
        )
        return resp

    def test_list_tasks(self):
        resp = self.client.get("/api/tasks/", **auth_headers(self.leader_token))
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_create_task_leader(self):
        resp = self._create_task()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["title"], "Implement login")

    def test_create_task_member_forbidden(self):
        resp = self._create_task(token=self.member_token)
        self.assertEqual(resp.status_code, 403)

    def test_update_task_state(self):
        task_resp = self._create_task()
        task_id = task_resp.json()["id"]
        resp = self.client.patch(
            f"/api/tasks/{task_id}/state/",
            data=json.dumps({"state": "in_progress"}),
            content_type="application/json",
            **auth_headers(self.member_token),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["state"], "in_progress")

    def test_update_task_state_invalid(self):
        task_resp = self._create_task()
        task_id = task_resp.json()["id"]
        resp = self.client.patch(
            f"/api/tasks/{task_id}/state/",
            data=json.dumps({"state": "invalid_state"}),
            content_type="application/json",
            **auth_headers(self.member_token),
        )
        self.assertEqual(resp.status_code, 400)

    def test_assign_task(self):
        task_resp = self._create_task()
        task_id = task_resp.json()["id"]
        resp = self.client.post(
            f"/api/tasks/{task_id}/assign/",
            data=json.dumps({"target_cid": self.member.CID}),
            content_type="application/json",
            **auth_headers(self.leader_token),
        )
        self.assertEqual(resp.status_code, 200)

    def test_assign_task_member_forbidden(self):
        task_resp = self._create_task()
        task_id = task_resp.json()["id"]
        resp = self.client.post(
            f"/api/tasks/{task_id}/assign/",
            data=json.dumps({"target_cid": self.member.CID}),
            content_type="application/json",
            **auth_headers(self.member_token),
        )
        self.assertEqual(resp.status_code, 403)

    def test_delete_task_leader(self):
        task_resp = self._create_task()
        task_id = task_resp.json()["id"]
        resp = self.client.delete(
            f"/api/tasks/{task_id}/",
            **auth_headers(self.leader_token),
        )
        self.assertEqual(resp.status_code, 200)

    def test_delete_task_member_forbidden(self):
        task_resp = self._create_task()
        task_id = task_resp.json()["id"]
        resp = self.client.delete(
            f"/api/tasks/{task_id}/",
            **auth_headers(self.member_token),
        )
        self.assertEqual(resp.status_code, 403)

    def test_task_not_found(self):
        resp = self.client.patch(
            "/api/tasks/9999/state/",
            data=json.dumps({"state": "done"}),
            content_type="application/json",
            **auth_headers(self.leader_token),
        )
        self.assertEqual(resp.status_code, 404)

    def test_tasks_requires_authentication(self):
        resp = self.client.get("/api/tasks/")
        self.assertEqual(resp.status_code, 401)


# ─── 6. Meetings ──────────────────────────────────────────────────────────────

class MeetingTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.teacher = make_staff(email="meet_teacher@esi.dz", password="MeetTeach1!")
        self.student = make_student(cid=7001, email="meetstudent@esi.dz")
        self.student.academic_year = "2024/2025"
        self.student.save()
        self.project = make_project(supervisor=self.teacher, year="2024/2025")
        make_membership(self.student, self.project, is_leader=True)
        self.student_token = get_token(self.client, "meetstudent@esi.dz", "StrongPass1!")

    def test_list_meetings(self):
        resp = self.client.get("/api/meetings/", **auth_headers(self.student_token))
        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.json(), list)

    def test_create_meeting(self):
        resp = self.client.post(
            "/api/meetings/",
            data=json.dumps({
                "title": "Weekly Sync",
                "date": "2025-05-10",
                "time": "10:00:00",
                "location": "Room A101",
            }),
            content_type="application/json",
            **auth_headers(self.student_token),
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["title"], "Weekly Sync")
        self.assertEqual(data["status"], "pending")

    def test_create_meeting_no_supervisor(self):
        project2 = make_project(supervisor=None, year="2024/2025", name="NoSup")
        student2 = make_student(cid=7002, email="nosup@esi.dz")
        student2.academic_year = "2024/2025"
        student2.save()
        make_membership(student2, project2, is_leader=True)
        token2 = get_token(self.client, "nosup@esi.dz", "StrongPass1!")
        resp = self.client.post(
            "/api/meetings/",
            data=json.dumps({
                "title": "Orphan Meeting",
                "date": "2025-05-10",
                "time": "10:00:00",
                "location": "Room B202",
            }),
            content_type="application/json",
            **auth_headers(token2),
        )
        self.assertEqual(resp.status_code, 400)

    def test_get_meeting_by_id(self):
        create_resp = self.client.post(
            "/api/meetings/",
            data=json.dumps({
                "title": "Detail Test",
                "date": "2025-06-01",
                "time": "14:00:00",
                "location": "Online",
            }),
            content_type="application/json",
            **auth_headers(self.student_token),
        )
        meeting_id = create_resp.json()["id"]
        resp = self.client.get(
            f"/api/meetings/{meeting_id}/", **auth_headers(self.student_token)
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["title"], "Detail Test")

    def test_delete_meeting(self):
        create_resp = self.client.post(
            "/api/meetings/",
            data=json.dumps({
                "title": "To Delete",
                "date": "2025-07-01",
                "time": "09:00:00",
                "location": "Room C303",
            }),
            content_type="application/json",
            **auth_headers(self.student_token),
        )
        meeting_id = create_resp.json()["id"]
        resp = self.client.delete(
            f"/api/meetings/{meeting_id}/", **auth_headers(self.student_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_meetings_requires_authentication(self):
        resp = self.client.get("/api/meetings/")
        self.assertEqual(resp.status_code, 401)

    def test_meeting_no_project(self):
        student2 = make_student(cid=7003, email="noproj@esi.dz")
        student2.academic_year = "2024/2025"
        student2.save()
        token2 = get_token(self.client, "noproj@esi.dz", "StrongPass1!")
        resp = self.client.get("/api/meetings/", **auth_headers(token2))
        self.assertEqual(resp.status_code, 404)


# ─── 7. Teacher Endpoints ─────────────────────────────────────────────────────

class TeacherTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.teacher = make_staff(email="teacher_ep@esi.dz", password="TeacherEP1!")
        self.teacher_token = get_token(self.client, "teacher_ep@esi.dz", "TeacherEP1!")
        self.student = make_student(cid=8001, email="stud_teach@esi.dz")
        self.student.academic_year = "2024/2025"
        self.student.save()
        self.project = make_project(supervisor=self.teacher, year="2024/2025")
        make_membership(self.student, self.project, is_leader=True)

    def test_teacher_dashboard(self):
        resp = self.client.get(
            "/api/teacher/dashboard/", **auth_headers(self.teacher_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_teacher_profile(self):
        resp = self.client.get(
            "/api/teacher/profile/", **auth_headers(self.teacher_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_teacher_groups(self):
        resp = self.client.get(
            "/api/teacher/groups/", **auth_headers(self.teacher_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_teacher_group_detail(self):
        resp = self.client.get(
            f"/api/teacher/groups/{self.project.PID}/",
            **auth_headers(self.teacher_token),
        )
        self.assertEqual(resp.status_code, 200)

    def test_teacher_jury_list(self):
        resp = self.client.get(
            "/api/teacher/jury/", **auth_headers(self.teacher_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_teacher_meetings(self):
        resp = self.client.get(
            "/api/teacher/meetings/", **auth_headers(self.teacher_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_teacher_endpoints_student_forbidden(self):
        student_token = get_token(self.client, "stud_teach@esi.dz", "StrongPass1!")
        resp = self.client.get(
            "/api/teacher/dashboard/", **auth_headers(student_token)
        )
        self.assertEqual(resp.status_code, 403)

    def test_teacher_assign_task_to_group(self):
        resp = self.client.post(
            f"/api/teacher/groups/{self.project.PID}/tasks/",
            data=json.dumps({
                "title": "Teacher Task",
                "description": "Assigned by teacher",
                "type": "feature",
                "priority": 2,
                "deadline": "2025-07-15",
            }),
            content_type="application/json",
            **auth_headers(self.teacher_token),
        )
        self.assertIn(resp.status_code, [200, 201])


# ─── 8. Academic Structure ────────────────────────────────────────────────────

class AcademicStructureTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = make_admin()
        self.admin_token = get_token(self.client, "admin@esi.dz", "AdminPass1!")

    def test_get_academic_structure(self):
        resp = self.client.get(
            "/api/admin/academic-structure/", **auth_headers(self.admin_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_get_departments(self):
        resp = self.client.get(
            "/api/admin/departments/", **auth_headers(self.admin_token)
        )
        self.assertEqual(resp.status_code, 200)

    def test_get_specialties(self):
        resp = self.client.get(
            "/api/admin/specialties/", **auth_headers(self.admin_token)
        )
        self.assertEqual(resp.status_code, 200)


# ─── 9. URL Resolution Tests ──────────────────────────────────────────────────

class URLResolutionTests(TestCase):
    """Verify all API URLs from the spec are resolvable."""

    def _check(self, url):
        try:
            match = resolve(url)
            return True, match
        except Exception as e:
            return False, str(e)

    def test_login_url(self):
        ok, _ = self._check("/api/login/")
        self.assertTrue(ok, "URL /api/login/ not found")

    def test_me_url(self):
        ok, _ = self._check("/api/me/")
        self.assertTrue(ok, "URL /api/me/ not found")

    def test_change_password_url(self):
        ok, _ = self._check("/api/change-password/")
        self.assertTrue(ok, "URL /api/change-password/ not found")

    def test_admin_users_url(self):
        ok, _ = self._check("/api/admin/users/")
        self.assertTrue(ok)

    def test_admin_student_create_url(self):
        ok, _ = self._check("/api/admin/students/create/")
        self.assertTrue(ok)

    def test_admin_student_block_url(self):
        ok, _ = self._check("/api/admin/students/block/1/")
        self.assertTrue(ok)

    def test_admin_student_reset_password_url(self):
        ok, _ = self._check("/api/admin/students/reset-password/1/")
        self.assertTrue(ok, "URL /api/admin/students/reset-password/<id>/ not found")

    def test_admin_staff_reset_password_url(self):
        ok, _ = self._check("/api/admin/staff/reset-password/1/")
        self.assertTrue(ok, "URL /api/admin/staff/reset-password/<id>/ not found")

    def test_admin_dashboard_url(self):
        ok, _ = self._check("/api/admin/dashboard/")
        self.assertTrue(ok)

    def test_projects_my_project_url(self):
        ok, _ = self._check("/api/projects/my-project/")
        self.assertTrue(ok)

    def test_projects_create_url(self):
        ok, _ = self._check("/api/projects/create/")
        self.assertTrue(ok)

    def test_projects_join_url(self):
        ok, _ = self._check("/api/projects/join/")
        self.assertTrue(ok)

    def test_projects_leave_url(self):
        ok, _ = self._check("/api/projects/leave/")
        self.assertTrue(ok)

    def test_admin_groups_url(self):
        ok, _ = self._check("/api/projects/admin/groups/")
        self.assertTrue(ok)

    def test_admin_assign_jury_url(self):
        ok, _ = self._check("/api/projects/admin/groups/1/assign-jury/")
        self.assertTrue(ok)

    def test_admin_archive_project_url(self):
        ok, _ = self._check("/api/projects/admin/projects/1/archive/")
        self.assertTrue(ok)

    def test_admin_restore_project_url(self):
        ok, _ = self._check("/api/projects/admin/projects/1/restore/")
        self.assertTrue(ok)

    def test_tasks_url(self):
        ok, _ = self._check("/api/tasks/")
        self.assertTrue(ok)

    def test_task_detail_url(self):
        ok, _ = self._check("/api/tasks/1/")
        self.assertTrue(ok)

    def test_task_state_url(self):
        ok, _ = self._check("/api/tasks/1/state/")
        self.assertTrue(ok, "URL /api/tasks/<id>/state/ not found")

    def test_task_assign_url(self):
        ok, _ = self._check("/api/tasks/1/assign/")
        self.assertTrue(ok)

    def test_meetings_url(self):
        ok, _ = self._check("/api/meetings/")
        self.assertTrue(ok)

    def test_meeting_detail_url(self):
        ok, _ = self._check("/api/meetings/1/")
        self.assertTrue(ok, "URL /api/meetings/<id>/ not found")

    def test_teacher_dashboard_url(self):
        ok, _ = self._check("/api/teacher/dashboard/")
        self.assertTrue(ok)

    def test_teacher_groups_url(self):
        ok, _ = self._check("/api/teacher/groups/")
        self.assertTrue(ok)

    def test_teacher_supervisor_requests_url(self):
        ok, _ = self._check("/api/teacher/supervisor-requests/1/")
        self.assertTrue(ok)

    def test_teacher_jury_evaluate_url(self):
        ok, _ = self._check("/api/teacher/jury/1/evaluate/")
        self.assertTrue(ok)

    def test_supervisor_request_project_url(self):
        ok, _ = self._check("/api/projects/supervisor-request/")
        self.assertTrue(ok)


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import subprocess, sys
    result = subprocess.run(
        [
            sys.executable, "manage.py", "test", "tests",
            "--settings=ESI_GIT.test_settings",
            "--verbosity=2",
        ],
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )
    sys.exit(result.returncode)
