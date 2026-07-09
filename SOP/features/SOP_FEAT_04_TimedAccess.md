# ⏳ Features & Capabilities: Timed Access & Deadline Locks

**Version**: 1.0  
**Effective Date**: 09-Jul-2026  

---

## 1. Automatic Locking Rules
*   Courses can be configured with an `access_deadline` duration.
*   Once a user starts, a cron scheduler or middleware checks if `current_date > start_date + access_deadline`.
*   If true, status changes to `locked` and the user gets a locked screen in the Course Player.
