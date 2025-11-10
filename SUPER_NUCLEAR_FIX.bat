@echo off
echo ============================================================
echo SUPER NUCLEAR FIX - COMPLETE CACHE PURGE
echo ============================================================
echo.
echo WARNING: This will kill ALL Python processes!
echo Press Ctrl+C now to cancel, or
pause

echo.
echo Phase 1: Terminating all Python processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM pythonw.exe 2>nul
taskkill /F /IM uvicorn.exe 2>nul
timeout /t 3 /nobreak >nul

echo.
echo Phase 2: Deleting ALL cache directories...
rd /s /q backend\__pycache__ 2>nul
rd /s /q backend\app\__pycache__ 2>nul
rd /s /q backend\app\api\__pycache__ 2>nul
rd /s /q backend\app\lib\__pycache__ 2>nul
rd /s /q __pycache__ 2>nul
rd /s /q .pytest_cache 2>nul

echo.
echo Phase 3: Running Python cache clear...
python clear_all_caches.py

echo.
echo Phase 4: Starting fresh backend (NO RELOAD FLAG)...
cd backend
start cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo.
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

cd ..
echo.
echo Phase 5: Testing the API...
python test_api_direct.py

echo.
echo ============================================================
echo NUCLEAR FIX COMPLETE!
echo ============================================================
echo.
echo If the API test shows "JS2024001", then:
echo   1. Start a fresh operator app
echo   2. Click Refresh
echo   3. Select "Juliana Shewmaker (JS2024001)"
echo   4. Retry the failed inspections
echo.
echo If it still shows "DEMO1234", run this script again!
echo ============================================================
pause