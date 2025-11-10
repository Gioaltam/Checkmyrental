@echo off
echo FORCING BACKEND RESTART
echo ========================

echo.
echo Step 1: Killing all Python processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM pythonw.exe 2>nul
echo Done.

echo.
echo Step 2: Clearing cache directories...
cd /d C:\inspection-agent
rmdir /S /Q backend\__pycache__ 2>nul
rmdir /S /Q backend\app\__pycache__ 2>nul
rmdir /S /Q backend\app\api\__pycache__ 2>nul
rmdir /S /Q __pycache__ 2>nul
echo Cache cleared.

echo.
echo Step 3: Starting backend fresh...
cd backend
echo.
echo Backend will start now. Watch for any errors.
echo ========================
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000