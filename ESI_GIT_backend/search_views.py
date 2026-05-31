with open("c:\\Users\\RAM Tech\\Downloads\\ESI_GIT_V1\\ESI_GIT_backend\\projects\\views.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "studentprojectserializer" in line.lower():
        print(f"Line {idx+1}: {line.strip()}")
