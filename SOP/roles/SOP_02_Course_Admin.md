# 🎓 Standard Operating Procedure: Course Admin Role

**Internal Code**: `COURSE_MANAGER`  
**Version**: 1.0  
**Effective Date**: 09-Jul-2026  
**Audience**: Course Managers, Training Department, Content Creators  
**Scope**: Course Lifecycle, Content Creation, and Student Rosters  

---

## 1. Purpose & Scope
This SOP covers the course publishing pipeline, module structure configurations, quiz management, student enrollment rosters, and course evaluations within Kiezen ELMS.

---

## 2. Capabilities & Scope
Course Managers focus on the content and delivery of courses. They do not have access to system logs, database settings, or user deactivations (which are restricted to `SYSTEM_ADMIN` and `HR_ADMIN`).

---

## 3. Course Creation & Content Structuring

### 3.1 Course Design Steps
1. Navigate to **Course Creator**.
2. Click **Create New Course**.
3. Fill out the course metadata:
    *   **Title** (Clear, descriptive)
    *   **Description** (Expected learning outcomes)
    *   **Department Scope** (Target department)
    *   **Access Deadline** (Time allowed for completion once enrolled, e.g., 30 days)
4. Click **Save Draft**.

### 3.2 Building Modules and Adding Content
1. Within the Course Creator panel, click **Add Module**.
2. Define a Title (e.g., "Module 1: Introduction") and Sequence number.
3. Click **Add Content** inside the module.
4. Select Content Type:
    *   **Video URL**: YouTube, Vimeo, or internal storage stream.
    *   **Text Content**: Markdown/HTML editor for text-based study guides.
    *   **PDF Document**: Link to slide decks or reference materials.
    *   **External Link**: URLs to additional external resources.

### 3.3 Adding a Quiz
1. At the end of a module, click **Create Quiz**.
2. Define a Pass Score (e.g., 80%).
3. Click **Add Question**, choose MCQ format, input 4 options, and mark the correct option.
4. Click **Save Quiz**.

---

## 4. Course Approvals & Publishing Workflow
Courses created by Employees (collaborative creators) must go through the Course Manager approval loop:
1. View pending submissions in the **Dashboard -> Pending Approvals**.
2. Click **Review Course** to view course player contents.
3. **Action**:
    *   **Approve**: Click **Approve**. State advances from `pending_approval` to `approved`.
    *   **Reject**: Click **Reject**, input a rejection reason (e.g., "Add more quiz questions"). State reverts to `draft`.
4. Once approved, click **Publish Course** to make it available to the catalog.

---

## 5. Roster Management & Course Assignment
1. To assign a published course, navigate to **View Courses -> Course Details**.
2. Click **Assign to Employees**.
3. Select target users or assign to an entire **Department** (e.g., "Engineering").
4. Click **Confirm**. Employees receive an automatic email notification.
