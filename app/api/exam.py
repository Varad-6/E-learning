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
from app.models.exam import Exam, ExamAssignment, ExamQuestion, ExamSubmission, ExamGrade, ExamReview
from app.models.course import Course
from app.models.department import Department
from app.models.role import Role
from app.services.notification_service import NotificationService
from app.schemas.exam import (
    ExamCreate, ExamResponse, ExamQuestionResponse,
    ExamSubmissionResponse, ExamGradeCreate, ExamGradeResponse, ExamReviewResponse
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
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(
            status_code=403,
            detail="Only Admins or Course Managers can create exams."
        )

    # Validate Course exists if course_id is provided
    if exam_in.course_id:
        course = db.query(Course).filter(Course.id == exam_in.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

    # If department_id is provided, validate Department exists
    if exam_in.department_id:
        dept = db.query(Department).filter(Department.id == exam_in.department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
    elif "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles:
        # Managers must create exams for their own department
        exam_in.department_id = current_user.department_id

    # Create Exam starting as unpublished pending approval
    new_exam = Exam(
        course_id=exam_in.course_id,
        department_id=exam_in.department_id,
        title=exam_in.title,
        duration_minutes=exam_in.duration_minutes,
        is_published=False,
        status="pending",
        created_by=current_user.id
    )
    db.add(new_exam)
    db.flush()  # Get ID

    # Create corresponding ExamAssignment record (relational link for department targeting)
    # Retroactive inclusion rule: All employees currently in target department (or all departments if NULL)
    # automatically receive this exam when active.
    assignment = ExamAssignment(
        exam_id=new_exam.id,
        department_id=new_exam.department_id
    )
    db.add(assignment)

    # Create corresponding ExamReview record
    new_review = ExamReview(
        exam_id=new_exam.id,
        submitted_by=current_user.id,
        status="pending",
        department_id=new_exam.department_id
    )
    db.add(new_review)

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
    # Retrieve all published exams corresponding to the user's department or all-departments exams
    # This automatically includes new employees added to the department retroactively.
    published_exams = db.query(Exam).filter(
        Exam.is_published == True,
        (Exam.department_id == current_user.department_id) | (Exam.department_id == None)
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

        # Load grade information if graded
        overall_score = None
        overall_feedback = None
        scores_dict = None
        if sub.status == "graded" and sub.grade:
            overall_score = sub.grade.overall_score
            overall_feedback = sub.grade.overall_feedback
            scores_dict = sub.grade.scores

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
                exam_title=exam.title,
                overall_score=overall_score,
                overall_feedback=overall_feedback,
                scores=scores_dict
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

    # 🟢 Trigger notifications
    # Learner notification
    NotificationService.create_notification(
        db,
        user_id=current_user.id,
        type="exam_submitted",
        title="Exam Answers Submitted",
        message=f"Your descriptive exam answers for '{sub.exam.title}' have been submitted successfully and are waiting for review.",
        related_entity_id=sub.exam_id
    )
    
    # Reviewer notification (Creator of the exam)
    if sub.exam.created_by:
        NotificationService.create_notification(
            db,
            user_id=sub.exam.created_by,
            type="exam_submission_pending",
            title="New Student Exam Submitted",
            message=f"An employee ({current_user.first_name} {current_user.last_name}) has submitted answers for descriptive exam: '{sub.exam.title}'.",
            related_entity_id=sub.id
        )

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
    if "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Unauthorized role access.")

    # Get submissions in submitted or graded state
    query = db.query(ExamSubmission).join(Exam, ExamSubmission.exam_id == Exam.id).filter(
        ExamSubmission.status.in_(["submitted", "graded"])
    )

    # CRITICAL BUSINESS RULE B: Submission Routing — Manager vs Admin Reviewer Logic
    # 1. If Admin created exam -> routes to Admin's review queue only.
    # 2. If Manager created exam -> routes to Manager's review queue only.
    if "SYSTEM_ADMIN" in user_roles or "HR_ADMIN" in user_roles:
        admin_user_ids = [u.id for u in db.query(User.id).join(User.roles).filter(Role.name.in_(["SYSTEM_ADMIN", "HR_ADMIN"])).all()]
        query = query.filter(Exam.created_by.in_(admin_user_ids))
    else:
        # Manager sees ONLY submissions for exams created by themselves
        query = query.filter(Exam.created_by == current_user.id)

    subs = query.all()

    res = []
    for s in subs:
        dept_name = s.user.department.name if s.user and s.user.department else "General"
        overall_score = s.grade.overall_score if s.grade else None
        overall_feedback = s.grade.overall_feedback if s.grade else None
        scores_dict = s.grade.scores if s.grade else None

        res.append(
            ExamSubmissionResponse(
                id=s.id,
                exam_id=s.exam_id,
                user_id=s.user_id,
                status=s.status,
                started_at=s.started_at,
                submitted_at=s.submitted_at,
                answers=s.answers or {},
                user_name=f"{s.user.first_name} {s.user.last_name}" if s.user else "Learner",
                user_email=s.user.email if s.user else "",
                department_name=dept_name,
                exam_title=s.exam.title if s.exam else "Untitled Exam",
                overall_score=overall_score,
                overall_feedback=overall_feedback,
                scores=scores_dict
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
    if "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Unauthorized role access.")

    sub = db.query(ExamSubmission).filter(ExamSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Validate score range (0-10) for each question
    for q_id, score in grade_in.scores.items():
        if score < 0 or score > 10:
            raise HTTPException(status_code=400, detail="Each question score must be strictly between 0 and 10.")

    # Calculate overall average score (0-10)
    scores_list = list(grade_in.scores.values())
    calculated_avg = sum(scores_list) / max(len(scores_list), 1) if scores_list else 0.0
    overall_score = round(float(calculated_avg), 2)

    # Set or update grade
    grade = db.query(ExamGrade).filter(ExamGrade.submission_id == submission_id).first()
    if not grade:
        grade = ExamGrade(
            submission_id=submission_id,
            scores=grade_in.scores,
            overall_score=overall_score,
            overall_feedback=grade_in.overall_feedback,
            graded_by=current_user.id
        )
        db.add(grade)
    else:
        grade.scores = grade_in.scores
        grade.overall_score = overall_score
        grade.overall_feedback = grade_in.overall_feedback
        grade.graded_by = current_user.id
        grade.graded_at = datetime.datetime.now(datetime.timezone.utc)

    # Set submission status to graded
    sub.status = "graded"
    db.commit()
    db.refresh(grade)

    # 🟢 Trigger notification
    NotificationService.create_notification(
        db,
        user_id=sub.user_id,
        type="exam_graded",
        title="Exam Results Available! 📝",
        message=f"Your descriptive exam answers for '{sub.exam.title if sub.exam else 'Exam'}' have been graded. Score: {overall_score}/10.",
        related_entity_id=sub.exam_id
    )

    return grade


# Exam Review and Approval endpoints
@router.post(
    "/{exam_id}/submit-for-review",
    response_model=ExamReviewResponse,
    summary="Submit Exam Syllabus for Department Head Review"
)
def submit_exam_for_review(
    exam_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure current user is Admin or Manager
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Unauthorized role access.")

    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Update Exam status to pending, and set is_published to False
    exam.status = "pending"
    exam.is_published = False

    # Check if there is an existing pending review for this exam
    existing_review = db.query(ExamReview).filter(
        ExamReview.exam_id == exam_id,
        ExamReview.status == "pending"
    ).first()

    if existing_review:
        db.commit()
        db.refresh(existing_review)
        existing_review.exam_title = exam.title
        existing_review.creator_name = f"{exam.creator.first_name} {exam.creator.last_name}" if exam.creator else "System"
        existing_review.department_name = exam.department.name if exam.department else "General"
        
        # 🟢 Trigger notifications
        NotificationService.create_notification(
            db,
            user_id=existing_review.submitted_by,
            type="exam_submitted",
            title="Exam Syllabus Submitted",
            message=f"Your exam syllabus '{exam.title}' has been submitted for review.",
            related_entity_id=exam.id
        )
        if exam.department_id:
            managers = db.query(User).join(User.roles).filter(
                User.department_id == exam.department_id,
                Role.name == "COURSE_MANAGER"
            ).all()
            for mgr in managers:
                NotificationService.create_notification(
                    db,
                    user_id=mgr.id,
                    type="exam_pending",
                    title="New Exam Syllabus Pending Review",
                    message=f"Exam syllabus '{exam.title}' by {exam.creator.first_name if exam.creator else 'System'} is pending your review.",
                    related_entity_id=exam.id
                )
        return existing_review

    # Create new review record
    new_review = ExamReview(
        exam_id=exam_id,
        submitted_by=current_user.id,
        status="pending",
        department_id=exam.department_id
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    # Populate extra fields for response model
    new_review.exam_title = exam.title
    new_review.creator_name = f"{current_user.first_name} {current_user.last_name}"
    new_review.department_name = exam.department.name if exam.department else "General"

    # 🟢 Trigger notifications
    NotificationService.create_notification(
        db,
        user_id=current_user.id,
        type="exam_submitted",
        title="Exam Syllabus Submitted",
        message=f"Your exam syllabus '{exam.title}' has been submitted for review.",
        related_entity_id=exam.id
    )
    if exam.department_id:
        managers = db.query(User).join(User.roles).filter(
            User.department_id == exam.department_id,
            Role.name == "COURSE_MANAGER"
        ).all()
        for mgr in managers:
            NotificationService.create_notification(
                db,
                user_id=mgr.id,
                type="exam_pending",
                title="New Exam Syllabus Pending Review",
                message=f"Exam syllabus '{exam.title}' by {current_user.first_name} {current_user.last_name} is pending your review.",
                related_entity_id=exam.id
            )

    return new_review


@router.get(
    "/reviews/pending",
    response_model=List[ExamReviewResponse],
    summary="Get Pending Exam Reviews for Current Department / Scope"
)
def get_pending_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure current user is Admin or Manager
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Unauthorized role access.")

    query = db.query(ExamReview).filter(ExamReview.status == "pending")

    # If the user is a COURSE_MANAGER, filter reviews scoped to their department
    if "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles:
        query = query.filter(ExamReview.department_id == current_user.department_id)

    reviews = query.all()

    res = []
    for r in reviews:
        # Populate extra response fields
        exam_title = r.exam.title if r.exam else "Untitled Exam"
        creator_name = f"{r.submitter.first_name} {r.submitter.last_name}" if r.submitter else "System"
        dept_name = r.department.name if r.department else "General"

        res.append(
            ExamReviewResponse(
                id=r.id,
                exam_id=r.exam_id,
                submitted_by=r.submitted_by,
                status=r.status,
                reviewer_id=r.reviewer_id,
                department_id=r.department_id,
                rejection_reason=r.rejection_reason,
                submitted_at=r.submitted_at,
                reviewed_at=r.reviewed_at,
                exam_title=exam_title,
                creator_name=creator_name,
                department_name=dept_name
            )
        )
    return res


@router.post(
    "/reviews/{review_id}/approve",
    response_model=ExamReviewResponse,
    summary="Approve Exam Syllabus Review"
)
def approve_exam_review(
    review_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure current user is Admin or Manager
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Unauthorized role access.")

    review = db.query(ExamReview).filter(ExamReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Exam review not found")

    review.status = "approved"
    review.reviewer_id = current_user.id
    review.reviewed_at = datetime.datetime.now(datetime.timezone.utc)

    # Update associated exam to approved and published
    if review.exam:
        review.exam.status = "approved"
        review.exam.is_published = True

    db.commit()
    db.refresh(review)

    # 🟢 Trigger notification
    if review.submitted_by:
        NotificationService.create_notification(
            db,
            user_id=review.submitted_by,
            type="exam_approved",
            title="Exam Syllabus Approved! 🎉",
            message=f"Your exam syllabus '{review.exam.title if review.exam else 'Untitled Exam'}' has been approved and published.",
            related_entity_id=review.exam_id
        )

    review.exam_title = review.exam.title if review.exam else "Untitled Exam"
    review.creator_name = f"{review.submitter.first_name} {review.submitter.last_name}" if review.submitter else "System"
    review.department_name = review.department.name if review.department else "General"

    return review


@router.post(
    "/reviews/{review_id}/reject",
    response_model=ExamReviewResponse,
    summary="Reject Exam Syllabus Review"
)
def reject_exam_review(
    review_id: UUID,
    rejection_reason: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure current user is Admin or Manager
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Unauthorized role access.")

    review = db.query(ExamReview).filter(ExamReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Exam review not found")

    review.status = "rejected"
    review.reviewer_id = current_user.id
    review.rejection_reason = rejection_reason
    review.reviewed_at = datetime.datetime.now(datetime.timezone.utc)

    # Update associated exam status
    if review.exam:
        review.exam.status = "rejected"
        review.exam.is_published = False

    db.commit()
    db.refresh(review)

    # 🟢 Trigger notification
    if review.submitted_by:
        NotificationService.create_notification(
            db,
            user_id=review.submitted_by,
            type="exam_rejected",
            title="Exam Syllabus Rejected ❌",
            message=f"Your exam syllabus '{review.exam.title if review.exam else 'Untitled Exam'}' was rejected. Reason: {rejection_reason}",
            related_entity_id=review.exam_id
        )

    review.exam_title = review.exam.title if review.exam else "Untitled Exam"
    review.creator_name = f"{review.submitter.first_name} {review.submitter.last_name}" if review.submitter else "System"
    review.department_name = review.department.name if review.department else "General"

    return review


@router.get(
    "",
    response_model=List[ExamResponse],
    summary="Get All Exams (scoped by role/department)"
)
def get_all_exams(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_roles = [r.name for r in current_user.roles]
    query = db.query(Exam)

    # Scoping filter
    if "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles and "COURSE_MANAGER" in user_roles:
        query = query.filter(Exam.department_id == current_user.department_id)
    elif "SYSTEM_ADMIN" not in user_roles and "HR_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        query = query.filter(
            (Exam.created_by == current_user.id) | (Exam.is_published == True)
        )

    return query.all()
