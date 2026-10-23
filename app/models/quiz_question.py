import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.base import Base

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(String, nullable=False)
    options = Column(JSON, nullable=False)
    correct_answer = Column(String, nullable=False)
    explanation = Column(String, nullable=True)
    points = Column(Integer, default=1, nullable=False)
    question_type = Column(String, nullable=False, server_default="mcq")
    is_required = Column(Boolean, default=False, nullable=False)

    # Relationships
    quiz = relationship("Quiz", back_populates="questions")
