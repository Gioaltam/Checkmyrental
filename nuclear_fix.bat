@echo off
echo ============================================================
echo NUCLEAR FIX - COMPLETE SYSTEM RESET TO PRODUCTION
echo ============================================================
echo.

echo Step 1: Killing ALL Python processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM pythonw.exe 2>nul
timeout /t 3 /nobreak >nul

echo.
echo Step 2: Fixing database...
python fix_clients_table.py

echo.
echo Step 3: Testing database...
python -c "import sqlite3; conn=sqlite3.connect('backend/app.db'); cur=conn.cursor(); cur.execute('SELECT owner_id FROM portal_clients WHERE email=\"julianagomesfl@yahoo.com\"'); print(f'Database shows: {cur.fetchone()[0]}'); conn.close()"

echo.
echo Step 4: Starting fresh backend...
cd backend
start cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo.
timeout /t 5 /nobreak >nul

echo Step 5: Testing API...
cd ..
python test_api_direct.py

echo.
echo ============================================================
echo DONE! Now in the Operator App:
echo   1. Close and restart the operator app
echo   2. Click Refresh
echo   3. Select "Juliana Shewmaker (JS2024001)"
echo   4. Retry failed inspections
echo ============================================================
echo.
pause