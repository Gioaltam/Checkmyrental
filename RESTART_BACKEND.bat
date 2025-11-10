@echo off
echo ============================================================
echo COMPLETE BACKEND RESTART
echo ============================================================
echo.

echo Step 1: Killing ALL Python processes...
echo (This will close all Python windows including the operator app)
pause
taskkill /F /IM python.exe
taskkill /F /IM pythonw.exe
timeout /t 2

echo.
echo Step 2: Backend will start in 3 seconds...
timeout /t 3

echo.
echo Step 3: Starting fresh backend...
cd /d C:\inspection-agent\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000