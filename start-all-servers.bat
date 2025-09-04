@echo off
echo Starting Frontend and Backend Dev Servers...

REM Start Frontend
start "Frontend Dev Server" cmd /k "cd /d \"C:\Users\brooi\Downloads\listing app\frontend\" && npm run dev"

REM Wait a moment
timeout /t 2 /nobreak > nul

REM Start Backend
start "Backend Dev Server" cmd /k "cd /d \"C:\Users\brooi\Downloads\listing app\backend\" && npm run start:dev"

echo Both servers are starting in separate windows...
echo You can close this window now.
pause
