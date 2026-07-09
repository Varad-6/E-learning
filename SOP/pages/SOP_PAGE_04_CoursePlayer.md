# 🎬 Standard Operating Procedure: Course Player Interface

**URL Route**: `/courses/{course_id}/player`  
**Version**: 1.0  
**Effective Date**: 09-Jul-2026  
**Audience**: Employees, Course Managers  

---

## 1. Screen Layout
The Course Player splits into three panels:
1.  **Module Navigator (Left)**: Collapsible sidebar showing modules and contents. Completed items have checkmarks.
2.  **Content Window (Center)**: Renders videos, text guides, or PDF slide decks.
3.  **Utility Sidebar (Right)**: Contains the personal note pad and discussion panels.

---

## 2. Progress Tracking & Completion
*   **Auto-Track**: Progress is automatically updated and sent to `/api/enrollments/{id}/progress` as each module item is viewed.
*   **Unlock Conditions**: Modules must be completed sequentially if sequential locking is enabled by the course manager.
