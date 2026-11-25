@echo off
title Kaizen LMS - Frontend Dev Server (Port 5180)
cd /d "%~dp0frontend"
set PATH=C:\Users\arati\.local\node;%PATH%
echo Starting Vite Frontend on http://localhost:5180 ...
npm run dev
pause
