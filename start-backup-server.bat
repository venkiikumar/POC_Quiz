@echo off
cd /d "c:\Users\2188221\OneDrive - Cognizant\Documents\POC_Quiz"
echo ==========================================
echo    Quiz Application Server (Port 3002)
echo ==========================================
echo.
echo Starting server on port 3002...
echo Server will be available at: http://localhost:3002
echo Applications will show: RoadOps, RoadSales, UES
echo.
echo ==========================================
echo    Server Output:
echo ==========================================
node server-backup.js
echo.
echo ==========================================
echo Server stopped. Press any key to exit...
pause
