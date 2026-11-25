@echo off
title Kaizen LMS - FastAPI Backend (Port 8000)
cd /d "%~dp0"
set PYTHONPATH=.
call venv\Scripts\activate.bat
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
