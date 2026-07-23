import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

class Exam(Base):
    __tablename__ = "exams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=True) # None = All Departments
    title = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=60)
    is_published = Column(Boolean, default=False, nullable=False)
    status = Column(String, default="draft", nullable=False)  # draft, pending, approved, rejected
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    course = relationship("Course")
    department = relationship("Department")
    creator = relationship("User", foreign_keys=[created_by])
    questions = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan")
    submissions = relationship("ExamSubmission", back_populates="exam", cascade="all, delete-orphan")
    reviews = relationship("ExamReview", back_populates="exam", cascade="all, delete-orphan")
    assignments = relationship("ExamAssignment", back_populates="exam", cascade="all, delete-orphan")


class ExamAssignment(Base):
    """
    Relational link between an Exam and target department(s).
    Supports single department targeting or NULL (All Departments).
    Retroactive inclusion rule: When an employee accesses assigned exams,
    any employee in a matching target department is dynamically assigned,
    so newly added employees during the exam's active window automatically receive it.
    """
    __tablename__ = "exam_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    exam = relationship("Exam", back_populates="assignments")
    department = relationship("Department")


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(String, nullable=False)
    question_type = Column(String, nullable=False)  # short_answer, descriptive, file_upload

    # Relationships
    exam = relationship("Exam", back_populates="questions")


class ExamSubmission(Base):
    __tablename__ = "exam_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False, default="assigned")  # assigned, in_progress, submitted, graded
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    answers = Column(JSON, nullable=False, default=dict)  # maps question_id to answer_text or file path

    # Relationships
    exam = relationship("Exam", back_populates="submissions")
    user = relationship("User")
    grade = relationship("ExamGrade", back_populates="submission", uselist=False, cascade="all, delete-orphan")


class ExamGrade(Base):
    __tablename__ = "exam_grades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("exam_submissions.id", ondelete="CASCADE"), nullable=False)
    scores = Column(JSON, nullable=False, default=dict)  # maps question_id to integer score 0-10
    overall_score = Column(Float, nullable=True) # overall average score 0-10
    overall_feedback = Column(String, nullable=True)
    graded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    graded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    submission = relationship("ExamSubmission", back_populates="grade")
    grader = relationship("User", foreign_keys=[graded_by])


class ExamReview(Base):
    __tablename__ = "exam_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="pending", nullable=False)  # pending, approved, rejected
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)
    rejection_reason = Column(String, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    exam = relationship("Exam", back_populates="reviews")
    submitter = relationship("User", foreign_keys=[submitted_by])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    department = relationship("Department")

