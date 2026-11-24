@echo off
cd /d "%~dp0"
echo Starting FactoryIQ React Frontend...
cd project
npm run dev -- --port 5173 --strictPort
pause
