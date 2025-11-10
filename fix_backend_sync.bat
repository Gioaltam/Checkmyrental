@echo off
echo =============================================
echo FIXING BACKEND SYNC ISSUE
echo =============================================
echo.
echo Stopping any existing backend processes...
taskkill /F /IM uvicorn.exe 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *uvicorn*" 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting backend with fresh data...
cd backend
start cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo Waiting for backend to start...
timeout /t 5 /nobreak

echo.
echo Backend should now be running with updated data!
echo.
echo IMPORTANT: In the Operator App:
echo   1. Click Refresh to reload accounts
echo   2. Select "Juliana Shewmaker (JS2024001)"
echo   3. Retry the failed inspections
echo.
pause