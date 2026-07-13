# TEMP — safe to delete after verifying Difficulty Tiers feature logic (2026-07-10)
import os
import sys
import unittest
from datetime import datetime, timezone

# Add parent directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.models.course import Course
from app.models.course_module import CourseModule
from app.models.module_content import ModuleContent
from app.models.user import User
from app.models.course_enrollment import CourseEnrollment
from app.schemas.course import ModuleCreate, CourseUpdate
from app.schemas.enrollment import ProgressUpdate
from app.services.course_service import CourseService
from app.services.module_service import ModuleService
from app.services.enrollment_service import EnrollmentService

class TestDifficultyTiersAndTimer(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        # Clean up database courses created during test
        self.test_courses = []
        self.test_users = []
        self.test_enrollments = []
        
        # Get or create a system user for testing
        self.user = self.db.query(User).filter(User.email == "test_user_tiers@example.com").first()
        if not self.user:
            self.user = User(
                email="test_user_tiers@example.com",
                employee_code="TEST-EMP-TIERS",
                first_name="Test",
                last_name="User",
                password_hash="fakehashedpassword",
                is_active=True
            )
            self.db.add(self.user)
            self.db.commit()
            self.db.refresh(self.user)
        self.test_users.append(self.user)

    def tearDown(self):
        # Delete created records
        for enroll in self.test_enrollments:
            self.db.execute(text("delete from user_course_progress where enrollment_id = :id"), {"id": enroll.id})
            self.db.delete(enroll)
        for course in self.test_courses:
            self.db.execute(text("delete from course_modules where course_id = :id"), {"id": course.id})
            self.db.delete(course)
        self.db.commit()
        self.db.close()

    def test_publish_validation_and_sequence_collision(self):
        from sqlalchemy import text
        # 1. Create a course
        course = Course(
            course_code="TEST-TIERS-101",
            title="Test Course for Tiers",
            difficulty_level="beginner",
            status="approved",
            is_published=False,
            duration="3d",
            created_by=self.user.id
        )
        self.db.add(course)
        self.db.commit()
        self.db.refresh(course)
        self.test_courses.append(course)
        
        # Try to publish - should fail because tiers have < 2 modules
        with self.assertRaises(Exception) as ctx:
            CourseService.publish_course(self.db, course_id=course.id)
        self.assertIn("must have at least 2 modules", str(ctx.exception))
        
        # 2. Add modules to satisfy validation
        # We need 2 beginner, 2 intermediate, 2 advanced modules
        tiers = ["beginner", "intermediate", "advanced"]
        for tier in tiers:
            # Create module 1
            m1 = ModuleService.create_module(self.db, ModuleCreate(
                course_id=course.id,
                title=f"{tier} Module 1",
                description="desc",
                sequence_no=1,
                tier=tier
            ))
            # Create module 2
            m2 = ModuleService.create_module(self.db, ModuleCreate(
                course_id=course.id,
                title=f"{tier} Module 2",
                description="desc",
                sequence_no=2,
                tier=tier
            ))
            
        # Verify sequence and tier ordering in get_modules_by_course
        modules = ModuleService.get_modules_by_course(self.db, course_id=course.id)
        self.assertEqual(len(modules), 6)
        
        # Verify they are ordered: beginner 1, 2, intermediate 1, 2, advanced 1, 2
        self.assertEqual(modules[0].tier, "beginner")
        self.assertEqual(modules[0].sequence_no, 1)
        self.assertEqual(modules[1].tier, "beginner")
        self.assertEqual(modules[1].sequence_no, 2)
        
        self.assertEqual(modules[2].tier, "intermediate")
        self.assertEqual(modules[2].sequence_no, 1)
        
        self.assertEqual(modules[4].tier, "advanced")
        self.assertEqual(modules[4].sequence_no, 1)
        
        # Test collision shifting: Add another intermediate module at sequence_no=1
        m_collision = ModuleService.create_module(self.db, ModuleCreate(
            course_id=course.id,
            title="intermediate Module New 1",
            description="desc",
            sequence_no=1,
            tier="intermediate"
        ))
        
        # Verify the old intermediate modules shifted up
        modules_after = ModuleService.get_modules_by_course(self.db, course_id=course.id)
        # We now have 3 intermediate modules
        int_mods = [m for m in modules_after if m.tier == "intermediate"]
        self.assertEqual(len(int_mods), 3)
        # The new one is at sequence_no=1, others are at 2 and 3
        self.assertEqual(int_mods[0].title, "intermediate Module New 1")
        self.assertEqual(int_mods[0].sequence_no, 1)
        self.assertEqual(int_mods[1].sequence_no, 2)
        self.assertEqual(int_mods[2].sequence_no, 3)
        
        # Now publish the course
        published_course = CourseService.publish_course(self.db, course_id=course.id)
        self.assertTrue(published_course.is_published)
        self.assertEqual(published_course.status, "published")
        self.assertIsNotNone(published_course.published_at)

    def test_enrollment_timer_and_sequential_locks(self):
        from sqlalchemy import text
        # Create course with modules and publish
        course = Course(
            course_code="TEST-TIERS-202",
            title="Test Course for Locks",
            difficulty_level="beginner",
            status="approved",
            is_published=False,
            duration="3d",
            created_by=self.user.id
        )
        self.db.add(course)
        self.db.commit()
        self.db.refresh(course)
        self.test_courses.append(course)

        # Add modules: 2 beginner, 2 intermediate, 2 advanced
        tiers = ["beginner", "intermediate", "advanced"]
        modules_map = {}
        for tier in tiers:
            modules_map[tier] = []
            for i in range(1, 3):
                m = ModuleService.create_module(self.db, ModuleCreate(
                    course_id=course.id,
                    title=f"{tier} Module {i}",
                    description="desc",
                    sequence_no=i,
                    tier=tier
                ))
                modules_map[tier].append(m)
                
                # Add active content to each module so we can check completion
                content = ModuleContent(
                    module_id=m.id,
                    title="content",
                    content_type="text",
                    sequence_no=1,
                    is_active=True
                )
                self.db.add(content)
        self.db.commit()
        
        # Publish
        CourseService.publish_course(self.db, course_id=course.id)
        self.db.refresh(course)
        
        # Enroll user
        enrollment = EnrollmentService.enroll_user(self.db, user_id=self.user.id, course_id=course.id)
        self.test_enrollments.append(enrollment)
        
        # Check that expires_at is based on published_at
        expected_expiry = course.published_at + EnrollmentService.enroll_user.__globals__['parse_duration'](course.duration)
        self.assertEqual(enrollment.expires_at, expected_expiry)
        
        # Test sequential locking on progress updates:
        # Beginner 1 module id
        b1 = modules_map["beginner"][0]
        b1_content = self.db.query(ModuleContent).filter(ModuleContent.module_id == b1.id).first()
        
        # Beginner 2 module id
        b2 = modules_map["beginner"][1]
        b2_content = self.db.query(ModuleContent).filter(ModuleContent.module_id == b2.id).first()
        
        # Intermediate 1 module id
        i1 = modules_map["intermediate"][0]
        i1_content = self.db.query(ModuleContent).filter(ModuleContent.module_id == i1.id).first()
        
        # Try to complete Beginner 2 content first - should FAIL since Beginner 1 is not completed
        with self.assertRaises(Exception) as ctx:
            EnrollmentService.update_progress(self.db, user_id=self.user.id, request=ProgressUpdate(
                module_id=b2.id,
                content_id=b2_content.id,
                completed=True,
                time_spent_seconds=10
            ))
        self.assertIn("is locked. You must complete", str(ctx.exception))
        
        # Now complete Beginner 1
        EnrollmentService.update_progress(self.db, user_id=self.user.id, request=ProgressUpdate(
            module_id=b1.id,
            content_id=b1_content.id,
            completed=True,
            time_spent_seconds=10
        ))
        
        # Now completing Beginner 2 should succeed
        EnrollmentService.update_progress(self.db, user_id=self.user.id, request=ProgressUpdate(
            module_id=b2.id,
            content_id=b2_content.id,
            completed=True,
            time_spent_seconds=10
        ))
        
        # Intermediate 1 should now be unlocked since all Beginner modules are completed
        EnrollmentService.update_progress(self.db, user_id=self.user.id, request=ProgressUpdate(
            module_id=i1.id,
            content_id=i1_content.id,
            completed=True,
            time_spent_seconds=10
        ))
        
        # Verify enrollment progress percent recalculation (3 completed out of 6 contents = 50%)
        self.db.refresh(enrollment)
        self.assertEqual(enrollment.progress_percent, 50)
        
        print("All database stored progress and logic tests passed!")

if __name__ == '__main__':
    from sqlalchemy import text
    unittest.main()
