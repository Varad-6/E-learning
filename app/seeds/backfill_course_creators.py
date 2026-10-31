"""
Migration / Repair Script: Backfill Course Creators
Scans all courses in the database where created_by is None/empty and attempts
to determine ownership via Audit Logs, Course Approvals, or unique matching users.
Courses whose creator cannot be determined are left with created_by=None,
meaning ONLY Administrators can delete or edit them (strict rule).
"""
import sys
import os

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.session import SessionLocal
from app.models.course import Course
from app.models.course_approval import CourseApproval
from app.models.audit_log import AuditLog
from app.models.user import User

def backfill_course_creators():
    db = SessionLocal()
    try:
        print("--- Scanning for courses with missing created_by ---")
        courses_missing = db.query(Course).filter(Course.created_by == None).all()
        print(f"Found {len(courses_missing)} courses with empty created_by.")
        
        fixed_count = 0
        admin_only_count = 0
        
        for course in courses_missing:
            determined_user_id = None
            reason = ""
            
            # 1. Check Audit Logs for CREATE_COURSE event
            audit = db.query(AuditLog).filter(
                AuditLog.action == "CREATE_COURSE",
                (AuditLog.target == course.course_code) | (AuditLog.target == str(course.id))
            ).order_by(AuditLog.timestamp.asc()).first()
            
            if audit and audit.actor:
                user = db.query(User).filter(User.email.ilike(audit.actor)).first()
                if user:
                    determined_user_id = user.id
                    reason = f"Audit log actor: {audit.actor}"
            
            # 2. Check Course Approvals
            if not determined_user_id:
                approval = db.query(CourseApproval).filter(
                    CourseApproval.course_id == course.id,
                    CourseApproval.submitted_by != None
                ).order_by(CourseApproval.submitted_at.asc()).first()
                if approval and approval.submitted_by:
                    determined_user_id = approval.submitted_by
                    reason = f"Course approval submitted_by: {approval.submitted_by}"
            
            # 3. Apply fix if determined
            if determined_user_id:
                course.created_by = determined_user_id
                fixed_count += 1
                print(f"  [FIXED] Course '{course.title}' ({course.course_code}) -> created_by set to {determined_user_id} ({reason})")
            else:
                admin_only_count += 1
                print(f"  [ADMIN-ONLY] Course '{course.title}' ({course.course_code}) -> creator undetermined; restricted to Admin delete only.")
        
        db.commit()
        print(f"\nCompleted backfill. Fixed: {fixed_count}, Admin-Only (Undetermined): {admin_only_count}")
        return fixed_count, admin_only_count
    finally:
        db.close()

if __name__ == "__main__":
    backfill_course_creators()
