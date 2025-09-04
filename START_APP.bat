@echo off
echo ===============================================
echo    Cross-Listing App Launcher
echo ===============================================
echo.

:: Check if running as admin (optional, not required)
echo Starting the application servers...
echo.

:: Start Backend in new window
echo Starting Backend Server (Port 3000)...
start "Backend Server" cmd /k "cd backend && echo Backend starting on http://localhost:3000 && npm run start:dev"

:: Wait a bit for backend to initialize
timeout /t 3 /nobreak > nul

:: Start Frontend in new window
echo Starting Frontend Server (Port 5173)...
start "Frontend Server" cmd /k "cd frontend && echo Frontend starting on http://localhost:5173 && npm run dev"

echo.
echo ===============================================
echo    Application Starting...
echo ===============================================
echo.
echo Backend API:  http://localhost:3000
echo Frontend UI:  http://localhost:5173
echo.
echo Two new windows will open:
echo - Backend Server (NestJS)
echo - Frontend Server (React)
echo.
echo NOTE: If you see database connection errors,
echo make sure PostgreSQL is running!
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak > nul

:: Open browser
start http://localhost:5173

echo.
echo App launched! You can close this window.
echo To stop the servers, close the server windows.
pause
