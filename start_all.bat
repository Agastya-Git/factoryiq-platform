@echo off
cd /d "%~dp0"
echo ======================================================================
echo    FactoryIQ: Industry 4.0 Predictive Analytics Platform
echo ======================================================================
echo Launching:
echo   1. FastAPI + ML Engine + Database (http://localhost:8001)
echo   2. React + Vite Frontend Dashboard (http://localhost:5173)
echo ======================================================================
start "FactoryIQ Backend API" cmd /k "call start_backend.bat"
start "FactoryIQ React Dashboard" cmd /k "call start_frontend.bat"
echo Both servers launched in separate windows!
