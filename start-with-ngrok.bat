@echo off
title Starting All Services for eBay OAuth
echo ============================================
echo Starting Listing App with ngrok for eBay OAuth
echo ============================================
echo.

REM Start Frontend with host flag
echo Starting Frontend Dev Server...
start "Frontend (Port 5173)" cmd /k "cd /d \"C:\Users\brooi\Downloads\listing app\frontend\" && npm run dev"

REM Wait for frontend to start
echo Waiting for frontend to start...
timeout /t 8 /nobreak > nul

REM Start ngrok tunnel
echo Starting ngrok HTTPS tunnel...
start "ngrok HTTPS Tunnel" cmd /k "cd /d \"C:\Users\brooi\Downloads\listing app\" && .\ngrok.exe http 5173"

REM Wait for ngrok to start
echo Waiting for ngrok to establish tunnel...
timeout /t 8 /nobreak > nul

REM Get ngrok URL
echo.
echo ============================================
echo Getting your ngrok HTTPS URL...
echo ============================================

powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://localhost:4040/api/tunnels' -Method Get; $httpsUrl = ($response.tunnels | Where-Object { $_.proto -eq 'https' }).public_url; Write-Host '✅ Your ngrok HTTPS URL: ' $httpsUrl; Write-Host ''; Write-Host '📋 NEXT STEPS:'; Write-Host '1. Update eBay Developer Portal redirect URI to:'; Write-Host '   ' $httpsUrl'/auth/ebay/callback'; Write-Host '2. Go to: ' $httpsUrl; Write-Host '3. Navigate to Settings and test eBay connection'; Write-Host '' } catch { Write-Host '❌ Could not get ngrok URL. Check the ngrok window.' }"

echo.
echo ============================================
echo All services started! Check the windows above.
echo ============================================
pause
