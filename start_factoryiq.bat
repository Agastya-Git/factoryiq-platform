@echo off
cd /d "%~dp0"
title FactoryIQ - Industry 4.0 Platform
cls

echo ========================================================
echo       FactoryIQ - Intelligent Factory Monitoring
echo ========================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your system PATH!
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b
)

:: 2. Check Python Packages
python -c "import fastapi, uvicorn, sqlalchemy" >nul 2>&1
if %errorlevel% neq 0 (
    echo [SETUP] Installing required Python packages (one-time setup)...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [WARNING] Some heavy ML packages failed. Installing core dependencies...
        pip install fastapi uvicorn pydantic sqlalchemy python-dotenv
    )
)

:: 3. Check Node Modules
if not exist "project\node_modules\" (
    echo [SETUP] Installing frontend node_modules (one-time setup)...
    cd project
    call npm install
    cd ..
)

echo.
echo  Database: Portable Standalone (factoryiq.db)
echo  All 50 machines, 21 workers, tasks and inventory loaded!
echo.
echo  Starting FastAPI Backend on port 8001...
start "FactoryIQ Backend" cmd /k "call start_backend.bat"

echo  Starting Vite Frontend on port 5173...
cd project
start "FactoryIQ Frontend" cmd /k "npm run dev -- --port 5173 --strictPort"
cd ..

echo.
echo  Waiting 4 seconds for servers to initialize...
timeout /t 4 /nobreak >nul

echo  Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ========================================================
echo            DEFAULT LOGIN CREDENTIALS
echo ========================================================
echo  Use the authorized account directory for current credentials.
echo ========================================================
echo.
echo FactoryIQ is running! Keep this window open.
pause
