@echo off
chcp 65001 >nul
echo ================================================================
echo   Kaizen Enterprise LMS - Database Restore from 01-init.sql
echo ================================================================
echo.
echo Restoring full database with 108 enterprise users and curriculum...
docker exec -i elearning-postgres psql -U elearning_user -d elearning < init-db\01-init.sql
if %errorlevel% neq 0 (
    echo [ERROR] Restore failed. Make sure elearning-postgres is running!
) else (
    echo.
    echo [SUCCESS] Database restored successfully! All 108 users are intact.
)
echo.
pause
