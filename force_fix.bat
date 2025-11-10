@echo off
echo ============================================================
echo FORCE FIX - PRODUCTION TOKEN UPDATE
echo ============================================================
echo.

echo Step 1: Killing backend processes...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *uvicorn*" 2>nul
taskkill /F /IM python.exe /FI "COMMANDLINE eq *uvicorn*" 2>nul
taskkill /F /IM uvicorn.exe 2>nul
timeout /t 3 /nobreak >nul

echo.
echo Step 2: Updating database tokens...
python fix_production_tokens.py

echo.
echo Step 3: Starting backend with fresh data...
cd backend
start cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo ============================================================
echo DONE! Backend is restarting with production tokens.
echo.
echo In the Operator App:
echo   1. Click Refresh button
echo   2. Select "Juliana Shewmaker (JS2024001)"
echo   3. Retry the failed inspections
echo ============================================================
echo.
pause