@echo off
cd /d "%~dp0"
echo Starting FactoryIQ FastAPI + ML Backend...
echo Access Swagger API docs at: http://localhost:8001/docs
set "API_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":8001 .*LISTENING"') do set "API_PID=%%P"
if defined API_PID (
    echo [ERROR] Port 8001 is already in use by process %API_PID%.
    echo Close the older FactoryIQ backend before starting this copy.
    echo This prevents the website from silently using a different database.
    pause
    exit /b 1
)
uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload
pause
