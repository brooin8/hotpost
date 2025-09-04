@echo off
title ngrok HTTPS Tunnel
cd /d "C:\Users\brooi\Downloads\listing app"
echo Starting ngrok tunnel for port 5173...
echo.
echo Copy the HTTPS URL from below and use it to update your eBay app settings!
echo.
.\ngrok.exe http 5173
