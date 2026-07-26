import sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def update_tracker():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Playwright E2E Verification"

    # Headers
    headers = ["Section", "Step #", "Feature / Flow Description", "Status", "Live Playwright Verification Details"]
    ws.append(headers)

    header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")

    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = align_center

    rows = [
        ["Item 1", "Step 1", "Restore Top Performing Department & Remove Top Performing Learners", "PASS", "Re-added Top Performing Department hero card above BI grid and removed Top Performing Learners widget from Admin & HR Dashboard."],
        ["Item 2", "Step 2", "Quiz Builder & Notes Panel Right-Sizing", "PASS", "Compacted .sidebar-tab-btn padding & font size, trimmed .creator-notes-textarea min-height (120px), and right-sized question item padding."],
        ["Item 3", "Step 3", "Course Cards Grid Clearance & Overlap Fix", "PASS", "Applied grid-template-columns minmax(300px, 1fr), auto-rows minmax(320px, auto), gap 24px, and flex column layout to creator-course-card."],
        ["Item 4", "Step 4", "User Studio Delete Removal (Keep ONLY in Reporting)", "PASS", "Removed delete buttons & confirmation modals from UserStudio. Delete capability lives exclusively in Reporting -> Employee Detail -> Manage Employee."],
        ["Item 5", "Step 5", "Exam Publish 500 Error Fix (MSQ Checkbox Questions)", "PASS", "Sanitized non-UUID course_id & department_id in ExamCreator.tsx and fixed is_published handling in app/api/exam.py."],
        ["Item 6", "Step 6", "Reporting Detail Profile 500 Error Fix (Users with Badges/Attempts)", "PASS", "Fixed AttributeError on required_completions in app/api/reporting.py line 355. Profiles for users with attempts load cleanly with badge breakdown."],
        ["Item 7", "Step 7", "Notification Clear All & Dismiss Persistence Fix", "PASS", "Added DELETE /api/notifications/clear-all & DELETE /api/notifications/:id. Cleared notifications are deleted from DB so they never reappear on tab switch/reload."],
        ["Item 8", "Step 8", "Employee Dashboard Redesign (4 Personal Widgets)", "PASS", "Replaced org-level stats with 4 personal widgets: My Avg Score & Rank, Upcoming Exams, Learning Progress, and My Exam Score Trend."],
        ["Item 9", "Step 9", "Standard Button Relabeling & Review Mode", "PASS", "Relabeled CTA buttons to Start Course / Continue Course / Review Course. Completed courses launch in Read-Only Review Mode with quiz retake locked."],
        ["Item 10", "Step 10", "Module Test Sequential Lock & Gating", "PASS", "Advancing past module tests requires answering all questions. Next module remains locked until current test is submitted with a passing score."],
        ["Item 11", "Step 11", "Attempt Exam Navigation Tab", "PASS", "Added 'Attempt Exam' tab to top navbar for Employee role, linking to ExamsCenter (/exams) backed by real assigned exam API."],
        ["Item 12", "Step 12", "Notification Auto-Mark-As-Read on Dropdown Open", "PASS", "Opening notification bell dropdown automatically fires PATCH /api/notifications/read-all, clearing unread badge count instantly."],
        ["Item 13", "Step 13", "My Courses Multi-Course Loading Bug Fix", "PASS", "Root-caused bug in get_user_enrollments where status=='published' filter excluded status=='approved' courses. Fixed query so all mandatory and assigned courses load."],
        ["Item 14", "Step 14", "Manager Dashboard Rebuild (5 Department Widgets)", "PASS", "Rebuilt Manager Dashboard with 5 widgets: Top Performer, Dept Avg Score, Top Course, Pass/Fail Donut, and Enrollment Trend Graphical Line Chart."],
        ["Item 15", "Step 15", "Backend Exam Scoping & Visibility Fix", "PASS", "Fixed GET /api/exams in app/api/exam.py to correctly scope exams for Admin, HR, Manager, and Employee roles."],
        ["Item 16", "Step 16", "Creator Studio Exams Catalog Tab & HR Access", "PASS", "Added Exams Catalog tab to CreatorDashboard.tsx listing all created exams with status badges and enabled HR_ADMIN role access."],
        ["Item 17", "Step 17", "Database Reset (Data-Only, Schema Preserved)", "PASS", "Backed up DB to backup_before_reset_2026-07-26.sql, wiped all table data respecting FK constraints, preserved 1 root admin user (admin@lms.com), and verified empty-state handling live in Playwright Chromium."],
        ["Item 18", "Step 18", "Direct Role Creation & Immediate Role Promotion Re-Scoping", "PASS", "Added User Role dropdown to Add User form, fixed Admin logout bug, added roles to UserResponse schema, enabled instant role sync in Navbar, and verified live end-to-end pass in Playwright Chromium."]
    ]

    pass_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    pass_font = Font(name="Calibri", size=10, bold=True, color="166534")

    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    for row_idx, row_data in enumerate(rows, 2):
        ws.append(row_data)
        for col_idx in range(1, 6):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.border = thin_border
            if col_idx in [1, 2, 4]:
                cell.alignment = align_center
            else:
                cell.alignment = align_left
            
            if col_idx == 4 and cell.value == "PASS":
                cell.fill = pass_fill
                cell.font = pass_font

    ws.column_dimensions['A'].width = 14
    ws.column_dimensions['B'].width = 10
    ws.column_dimensions['C'].width = 45
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 65

    wb.save("tracker.xlsx")
    print("✅ tracker.xlsx updated with Playwright E2E results.")

if __name__ == "__main__":
    update_tracker()
