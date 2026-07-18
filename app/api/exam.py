from fastapi import APIRouter, Depends, status, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Dict, Any
import datetime
import os
import shutil
import uuid

from app.core.dependencies import get_db, get_current_user, RequireRoles
from app.models.user import User
from app.models.exam import Exam, ExamQuestion, ExamSubmission, ExamGrade
from app.models.course import Course
from app.models.department import Department
from app.schemas.exam import (
    ExamCreate, ExamResponse, ExamQuestionResponse,
    ExamSubmissionResponse, ExamGradeCreate, ExamGradeResponse
)

router = APIRouter(prefix="/api/exams", tags=["Exams"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post(
    "",
    response_model=ExamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Exam"
)
def create_exam(
    exam_in: ExamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure current user is Admin or Manager (Course Admin)
    # Check roles
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_430_FORBIDDEN if hasattr(status, 'HTTP_430_FORBIDDEN') else 403,
            detail="Only Admins or Course Managers can create exams."
        )

    # Validate Course & Department exist
    course = db.query(Course).filter(Course.id == exam_in.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    dept = db.query(Department).filter(Department.id == exam_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Create Exam
    new_exam = Exam(
        course_id=exam_in.course_id,
        department_id=exam_in.department_id,
        title=exam_in.title,
        duration_minutes=exam_in.duration_minutes,
        is_published=exam_in.is_published,
        created_by=current_user.id
    )
    db.add(new_exam)
    db.flush()  # Get ID

    # Add questions
    for q in exam_in.questions:
        db_q = ExamQuestion(
            exam_id=new_exam.id,
            question_text=q.question_text,
            question_type=q.question_type
        )
        db.add(db_q)

    db.commit()
    db.refresh(new_exam)
    return new_exam

@router.get(
    "/assigned",
    response_model=List[ExamSubmissionResponse],
    summary="Get Assigned Exams for Current User"
)
def get_assigned_exams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve all published exams corresponding to the user's department
    if not current_user.department_id:
        return []

    published_exams = db.query(Exam).filter(
        Exam.department_id == current_user.department_id,
        Exam.is_published == True
    ).all()

    response_list = []
    for exam in published_exams:
        # Check if submission exists
        sub = db.query(ExamSubmission).filter(
            ExamSubmission.exam_id == exam.id,
            ExamSubmission.user_id == current_user.id
        ).first()

        # If not, auto-create the assigned submission state
        if not sub:
            sub = ExamSubmission(
                exam_id=exam.id,
                user_id=current_user.id,
                status="assigned",
                answers={}
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)

        # Map to response schema
        response_list.append(
            ExamSubmissionResponse(
                id=sub.id,
                exam_id=sub.exam_id,
                user_id=sub.user_id,
                status=sub.status,
                started_at=sub.started_at,
                submitted_at=sub.submitted_at,
                answers=sub.answers or {},
                exam_title=exam.title
            )
        )

    return response_list

@router.get(
    "/{exam_id}",
    response_model=ExamResponse,
    summary="Get Exam Details"
)
def get_exam_details(
    exam_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

@router.post(
    "/{exam_id}/start",
    response_model=ExamSubmissionResponse,
    summary="Start Assigned Exam"
)
def start_exam(
    exam_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(ExamSubmission).filter(
        ExamSubmission.exam_id == exam_id,
        ExamSubmission.user_id == current_user.id
    ).first()

    if not sub:
        raise HTTPException(status_code=404, detail="Assigned exam not found")

    if sub.status != "assigned":
        return ExamSubmissionResponse(
            id=sub.id,
            exam_id=sub.exam_id,
            user_id=sub.user_id,
            status=sub.status,
            started_at=sub.started_at,
            submitted_at=sub.submitted_at,
            answers=sub.answers or {},
            exam_title=sub.exam.title
        )

    # Set in-progress state and timer started_at
    sub.status = "in_progress"
    sub.started_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(sub)

    return ExamSubmissionResponse(
        id=sub.id,
        exam_id=sub.exam_id,
        user_id=sub.user_id,
        status=sub.status,
        started_at=sub.started_at,
        submitted_at=sub.submitted_at,
        answers=sub.answers or {},
        exam_title=sub.exam.title
    )

@router.post(
    "/{exam_id}/submit",
    response_model=ExamSubmissionResponse,
    summary="Submit Exam Answers"
)
def submit_exam(
    exam_id: UUID,
    answers_in: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(ExamSubmission).filter(
        ExamSubmission.exam_id == exam_id,
        ExamSubmission.user_id == current_user.id
    ).first()

    if not sub:
        raise HTTPException(status_code=404, detail="Exam submission not found")

    if sub.status in ["submitted", "graded"]:
        raise HTTPException(status_code=400, detail="Exam has already been submitted.")

    # Guard: Verify countdown hasn't exceeded time limit by more than a 2-minute buffer
    if sub.started_at:
        elapsed = datetime.datetime.now(datetime.timezone.utc) - sub.started_at
        limit = datetime.timedelta(minutes=sub.exam.duration_minutes + 2)
        if elapsed > limit:
            # Enforce automatic locking
            sub.status = "submitted"
            sub.submitted_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()
            raise HTTPException(status_code=400, detail="Time limit exceeded. Exam has been locked and auto-submitted.")

    sub.answers = answers_in
    sub.status = "submitted"
    sub.submitted_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(sub)

    return ExamSubmissionResponse(
        id=sub.id,
        exam_id=sub.exam_id,
        user_id=sub.user_id,
        status=sub.status,
        started_at=sub.started_at,
        submitted_at=sub.submitted_at,
        answers=sub.answers or {},
        exam_title=sub.exam.title
    )

@router.post(
    "/submissions/{submission_id}/upload",
    summary="Upload Exam Document Attachment"
)
def upload_submission_file(
    submission_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(ExamSubmission).filter(
        ExamSubmission.id == submission_id,
        ExamSubmission.user_id == current_user.id
    ).first()

    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if sub.status in ["submitted", "graded"]:
        raise HTTPException(status_code=400, detail="Cannot upload files to a completed exam.")

    # Check file size (limit: 10MB)
    MAX_SIZE = 10 * 1024 * 1024
    # Read chunk
    contents = file.file.read(MAX_SIZE + 10)
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size allowed is 10MB.")
    # Reset seek pointer
    file.file.seek(0)

    # Check extension
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = [".pdf", ".docx", ".zip", ".png", ".jpg", ".txt"]
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"File extension {ext} is not allowed. Only PDF, DOCX, ZIP, PNG, JPG, and TXT are supported.")

    # Save to disk
    safe_filename = f"{submission_id}_{uuid.uuid4().hex}{ext}"
    target_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(target_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    relative_url = f"/uploads/{safe_filename}"
    return {"file_url": relative_url, "original_name": filename}

@router.get(
    "/submissions",
    response_model=List[ExamSubmissionResponse],
    summary="Get Submissions List for Review"
)
def get_submissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure current user is Admin or Manager
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Unauthorized role access.")

    # Get submissions in submitted or graded state
    subs = db.query(ExamSubmission).filter(
        ExamSubmission.status.in_(["submitted", "graded"])
    ).all()

    res = []
    for s in subs:
        # Load user and department names
        dept_name = s.user.department.name if s.user.department else "General"
        res.append(
            ExamSubmissionResponse(
                id=s.id,
                exam_id=s.exam_id,
                user_id=s.user_id,
                status=s.status,
                started_at=s.started_at,
                submitted_at=s.submitted_at,
                answers=s.answers or {},
                user_name=f"{s.user.first_name} {s.user.last_name}",
                user_email=s.user.email,
                department_name=dept_name,
                exam_title=s.exam.title
            )
        )
    return res

@router.post(
    "/submissions/{submission_id}/grade",
    response_model=ExamGradeResponse,
    summary="Grade Submission"
)
def grade_submission(
    submission_id: UUID,
    grade_in: ExamGradeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure role is Admin or Manager
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Unauthorized role access.")

    sub = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Validate score range (0-10) for each question
    for q_id, score in grade_in.scores.items():
        if score < 0 or score > 10:
            raise HTTPException(status_code=400, detail="Each question score must be strictly between 0 and 10.")

    # Set or update grade
    grade = db.query(ExamGrade).filter(ExamGrade.submission_id == submission_id).first()
    if not grade:
        grade = ExamGrade(
            submission_id=submission_id,
            scores=grade_in.scores,
            overall_feedback=grade_in.overall_feedback,
            graded_by=current_user.id
        )
        db.add(grade)
    else:
        grade.scores = grade_in.scores
        grade.overall_feedback = grade_in.overall_feedback
        grade.graded_by = current_user.id
        grade.graded_at = datetime.datetime.now(datetime.timezone.utc)

    # Set submission status to graded
    sub.status = "graded"
    db.commit()
    db.refresh(grade)

    return grade
