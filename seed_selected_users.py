"""
Kaizen LMS - Production User Seeder Script
Seeds specific priority users from user request and/or Excel spreadsheet
Idempotent: updates existing users, inserts new users, establishes department & role relations.
"""

import sys
import os
import uuid
from typing import List, Dict, Optional

# Reconfigure stdout for UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.department import Department
from app.core.security import get_password_hash

# Fixed Role UUIDs
ROLE_MAP = {
    "SYSTEM_ADMIN": uuid.UUID("a0a0a0a0-0000-0000-0000-000000000001"),
    "COURSE_MANAGER": uuid.UUID("a0a0a0a0-0000-0000-0000-000000000002"),
    "EMPLOYEE": uuid.UUID("a0a0a0a0-0000-0000-0000-000000000003"),
    "HR_ADMIN": uuid.UUID("a0a0a0a0-0000-0000-0000-000000000004"),
}

# Standard Departments to ensure existence
STANDARD_DEPTS = [
    {"code": "AI", "name": "Artificial Intelligence", "desc": "AI & Machine Learning Engineering"},
    {"code": "MM", "name": "SAP MM", "desc": "SAP Materials Management"},
    {"code": "FICO", "name": "SAP FICO", "desc": "SAP Financial Accounting & Controlling"},
    {"code": "SAC", "name": "SAP SAC", "desc": "SAP Analytics Cloud"},
    {"code": "ABAP", "name": "SAP ABAP", "desc": "SAP ABAP Development"},
    {"code": "BASIS", "name": "SAP Basis", "desc": "SAP Basis Administration"},
    {"code": "PP", "name": "SAP PP", "desc": "SAP Production Planning"},
    {"code": "SD", "name": "SAP SD", "desc": "SAP Sales & Distribution"},
    {"code": "HR", "name": "Human Resources", "desc": "HR & People Operations"},
]

# The 17 Selected Priority Users requested by the user
# Note: Umesh Shinde (AIS001 / umesh@abhiyantatech.com) is explicitly EXCLUDED
SELECTED_USERS = [
    {
        "first_name": "Ali",
        "last_name": "Faiz",
        "employee_code": "INT055",
        "email": "Ali.F@abhiyantatech.com",
        "dept_code": None,  # Unscoped / No Department
        "role_name": "HR_ADMIN"
    },
    {
        "first_name": "Yash",
        "last_name": "Kolte",
        "employee_code": "INT069",
        "email": "Yash.K@abhiyantatech.com",
        "dept_code": "MM",  # SAP MM
        "role_name": "EMPLOYEE"
    },
    {
        "first_name": "Ritesh",
        "last_name": "Patil",
        "employee_code": "INT054",
        "email": "Ritesh.P@abhiyantatech.com",
        "dept_code": "AI",
        "role_name": "COURSE_MANAGER"
    },
    {
        "first_name": "Samiksha",
        "last_name": "Jagtap",
        "employee_code": "INT052",
        "email": "Samiksha.J@abhiyantatech.com",
        "dept_code": None,  # Unscoped / No Department
        "role_name": "SYSTEM_ADMIN"
    },
    {
        "first_name": "Akanksha",
        "last_name": "Kumbhar",
        "employee_code": "AIS226",
        "email": "Akanksha.K@abhiyantatech.com",
        "dept_code": None,  # Unscoped / No Department
        "role_name": "SYSTEM_ADMIN"
    },
    {
        "first_name": "Sayali",
        "last_name": "Shirbhate",
        "employee_code": "AIS246",
        "email": "Sayali.S@abhiyantatech.com",
        "dept_code": None,  # Unscoped / No Department
        "role_name": "HR_ADMIN"
    },
    {
        "first_name": "Akshata",
        "last_name": "Kshirsagar",
        "employee_code": "AIS242",
        "email": "Akshata.K@abhiyantatech.com",
        "dept_code": None,  # Unscoped / No Department
        "role_name": "HR_ADMIN"
    },
    {
        "first_name": "Faisal",
        "last_name": "Khan",
        "employee_code": "AIS201",
        "email": "faisal.k@abhiyantatech.com",
        "dept_code": None,  # Unscoped / No Department
        "role_name": "SYSTEM_ADMIN"
    },
    {
        "first_name": "System",
        "last_name": "Admin",
        "employee_code": "AIS000",
        "email": "systemadmin@abhiyantatech.com",
        "dept_code": None,  # Unscoped / No Department
        "role_name": "SYSTEM_ADMIN"
    },
    {
        "first_name": "Varad",
        "last_name": "Kadam",
        "employee_code": "INT049",
        "email": "Varad.K@abhiyantatech.com",
        "dept_code": None,  # Unscoped / No Department
        "role_name": "SYSTEM_ADMIN"
    },
    {
        "first_name": "Aniket",
        "last_name": "Patro",
        "employee_code": "AIS255",
        "email": "Aniket.p@abhiyantatech.com",
        "dept_code": "FICO",  # SAP FICO
        "role_name": "COURSE_MANAGER"
    },
    {
        "first_name": "Prithviraj",
        "last_name": "Taware",
        "employee_code": "INT080",
        "email": "Prithviraj.t@abhiyantatech.com",
        "dept_code": "FICO",  # SAP FICO
        "role_name": "EMPLOYEE"
    },
    {
        "first_name": "Pallavi",
        "last_name": "Daruka",
        "employee_code": "INT070",
        "email": "Pallavi.D@abhiyantatech.com",
        "dept_code": "FICO",  # SAP FICO
        "role_name": "EMPLOYEE"
    },
    {
        "first_name": "Tejas",
        "last_name": "Charhate",
        "employee_code": "INT073",
        "email": "Tejas.C@abhiyantatech.com",
        "dept_code": "SAC",  # SAP SAC
        "role_name": "EMPLOYEE"
    },
    {
        "first_name": "Lokesh",
        "last_name": "Jadhao",
        "employee_code": "AIS244",
        "email": "Lokesh.ja@abhiyantatech.com",
        "dept_code": "SAC",  # SAP SAC
        "role_name": "EMPLOYEE"
    },
    {
        "first_name": "Shantanu",
        "last_name": "Yadav",
        "employee_code": "INT060",
        "email": "Shantanu.Y@abhiyantatech.com",
        "dept_code": "MM",  # SAP MM
        "role_name": "COURSE_MANAGER"
    },
    {
        "first_name": "Shyamli",
        "last_name": "Sharma",
        "employee_code": "INT062",
        "email": "shyamli.s@abhiyantatech.com",
        "dept_code": "MM",  # SAP MM
        "role_name": "EMPLOYEE"
    }
]

EXCLUDED_EMAILS = {"umesh@abhiyantatech.com"}
EXCLUDED_CODES = {"AIS001"}

DEFAULT_PASSWORD = "Password123!"

def seed_users(seed_all_excel: bool = False, excel_path: Optional[str] = None):
    db = SessionLocal()
    try:
        print("=" * 70)
        print("KAIZEN LMS - ENTERPRISE USER SEEDER")
        print("=" * 70)

        # 1. Ensure Roles
        print("\n1. Verifying System Roles...")
        roles_dict = {}
        for r_name, r_id in ROLE_MAP.items():
            role = db.query(Role).filter(Role.id == r_id).first()
            if not role:
                role = db.query(Role).filter(Role.name == r_name).first()
            if not role:
                role = Role(id=r_id, name=r_name)
                db.add(role)
                db.commit()
                db.refresh(role)
            roles_dict[r_name] = role
            print(f"   [OK] Role {r_name} (ID: {role.id})")

        # 2. Ensure Departments
        print("\n2. Verifying Departments...")
        depts_dict = {}
        for d_info in STANDARD_DEPTS:
            dept = db.query(Department).filter(Department.code == d_info["code"]).first()
            if not dept:
                dept = Department(
                    id=uuid.uuid4(),
                    code=d_info["code"],
                    name=d_info["name"],
                    description=d_info["desc"]
                )
                db.add(dept)
                db.commit()
                db.refresh(dept)
            depts_dict[d_info["code"]] = dept
            print(f"   [OK] Dept [{dept.code}] {dept.name} (ID: {dept.id})")

        # 3. Build Users List
        users_to_process = list(SELECTED_USERS)

        if seed_all_excel and excel_path and os.path.exists(excel_path):
            import openpyxl
            print(f"\n3. Loading full Excel from {excel_path}...")
            wb = openpyxl.load_workbook(excel_path)
            sheet = wb.active
            rows = list(sheet.iter_rows(values_only=True))
            excel_added = 0
            selected_emails = {u["email"].lower() for u in users_to_process}

            for r in rows[1:]:
                if not r or len(r) < 9 or not r[5]:
                    continue
                code = str(r[1] or "").strip()
                email = str(r[5] or "").strip()
                if email.lower() in EXCLUDED_EMAILS or code.upper() in EXCLUDED_CODES:
                    print(f"   [SKIP] Skipping excluded user: {email} ({code})")
                    continue
                if email.lower() in selected_emails:
                    continue  # Priority list takes precedence

                fn = str(r[2] or "").strip()
                ln = str(r[3] or "").strip()
                if not fn and r[4]:
                    parts = str(r[4]).split(" ", 1)
                    fn = parts[0]
                    ln = parts[1] if len(parts) > 1 else ""

                dept_raw = str(r[6] or "").strip().upper()
                d_code = None
                if dept_raw in ["AI", "AI DEPARTMENT"]:
                    d_code = "AI"
                elif dept_raw in ["MM", "SAP MM"]:
                    d_code = "MM"
                elif dept_raw in ["FICO", "SAP FICO"]:
                    d_code = "FICO"
                elif dept_raw in ["SAC", "SAP SAC"]:
                    d_code = "SAC"
                elif dept_raw in ["ABAP"]:
                    d_code = "ABAP"
                elif dept_raw in ["BASIS"]:
                    d_code = "BASIS"
                elif dept_raw in ["PP"]:
                    d_code = "PP"
                elif dept_raw in ["SD"]:
                    d_code = "SD"
                elif dept_raw in ["HR", "HUMAN RESOURCE"]:
                    d_code = "HR"

                r_raw = str(r[8] or "").strip().upper()
                r_name = "EMPLOYEE"
                if "ADMIN" in r_raw or "SYSTEM" in r_raw:
                    r_name = "SYSTEM_ADMIN" if "SYSTEM" in r_raw else "HR_ADMIN"
                elif "MANAGER" in r_raw or "DELIVERY" in r_raw:
                    r_name = "COURSE_MANAGER"

                users_to_process.append({
                    "first_name": fn,
                    "last_name": ln or "User",
                    "employee_code": code,
                    "email": email,
                    "dept_code": d_code,
                    "role_name": r_name
                })
                selected_emails.add(email.lower())
                excel_added += 1

            print(f"   [OK] Appended {excel_added} additional users from Excel.")

        # 4. Upsert Users
        print(f"\n4. Upserting {len(users_to_process)} Users (Default Password: '{DEFAULT_PASSWORD}')...")
        hashed_pwd = get_password_hash(DEFAULT_PASSWORD)
        created_count = 0
        updated_count = 0

        for u_data in users_to_process:
            email = u_data["email"].strip()
            code = u_data["employee_code"].strip()

            if email.lower() in EXCLUDED_EMAILS or code.upper() in EXCLUDED_CODES:
                print(f"   [SKIP] Skipping excluded: {email}")
                continue

            target_dept_id = None
            if u_data.get("dept_code"):
                dept_obj = depts_dict.get(u_data["dept_code"])
                if dept_obj:
                    target_dept_id = dept_obj.id

            target_role = roles_dict.get(u_data["role_name"], roles_dict["EMPLOYEE"])

            # Check if user exists by email or employee_code
            user = db.query(User).filter(User.email.ilike(email)).first()
            if not user:
                user = db.query(User).filter(User.employee_code == code).first()

            if user:
                # Update existing
                user.first_name = u_data["first_name"]
                user.last_name = u_data["last_name"]
                user.employee_code = code
                user.email = email
                user.department_id = target_dept_id
                user.is_active = True
                user.is_deleted = False
                user.email_verified = True
                user.must_change_password = False
                user.password_hash = hashed_pwd

                # Update role
                db.query(UserRole).filter(UserRole.user_id == user.id).delete()
                db.add(UserRole(user_id=user.id, role_id=target_role.id))
                db.commit()
                updated_count += 1
                dept_label = u_data.get('dept_code') or 'Unscoped'
                print(f"   [UPDATED] [{code}] {user.first_name} {user.last_name} ({email}) -> Dept: {dept_label}, Role: {target_role.name}")
            else:
                # Create new
                new_user = User(
                    id=uuid.uuid4(),
                    employee_code=code,
                    first_name=u_data["first_name"],
                    last_name=u_data["last_name"],
                    email=email,
                    password_hash=hashed_pwd,
                    department_id=target_dept_id,
                    is_active=True,
                    is_deleted=False,
                    email_verified=True,
                    must_change_password=False
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)

                db.add(UserRole(user_id=new_user.id, role_id=target_role.id))
                db.commit()
                created_count += 1
                dept_label = u_data.get('dept_code') or 'Unscoped'
                print(f"   [CREATED] [{code}] {new_user.first_name} {new_user.last_name} ({email}) -> Dept: {dept_label}, Role: {target_role.name}")

        print("\n" + "=" * 70)
        print("SEEDING COMPLETE!")
        print(f"   Total Users Processed: {created_count + updated_count}")
        print(f"   Created: {created_count}")
        print(f"   Updated: {updated_count}")
        print("   Excluded: Umesh Shinde (AIS001) - SKIPPED")
        print(f"   Default Login Password: {DEFAULT_PASSWORD}")
        print("=" * 70)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during seeding: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_all = "--all" in sys.argv
    excel_file = r"C:\Users\Varad\Downloads\Kaizen_Employee_Seed_Data_Updated (1).xlsx"
    for arg in sys.argv:
        if arg.endswith(".xlsx"):
            excel_file = arg
    seed_users(seed_all_excel=seed_all, excel_path=excel_file)
