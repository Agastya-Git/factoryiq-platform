#!/bin/bash
echo "========================================================"
echo "      FactoryIQ - Intelligent Factory Monitoring"
echo "========================================================"
echo ""

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] python3 is not installed!"
    exit 1
fi

# 2. Check Python Packages
python3 -c "import fastapi, uvicorn, sqlalchemy" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[SETUP] Installing Python requirements..."
    pip3 install -r requirements.txt || pip3 install fastapi uvicorn pydantic sqlalchemy python-dotenv
fi

# 3. Check Node Modules
if [ ! -d "project/node_modules" ]; then
    echo "[SETUP] Installing frontend node_modules..."
    cd project && npm install && cd ..
fi

echo "Database: Portable Standalone (factoryiq.db)"
echo "Starting FastAPI Backend on port 8001..."
python3 -m uvicorn backend.main:app --port 8001 &
BACKEND_PID=$!

echo "Starting Vite Frontend on port 5173..."
cd project && npm run dev &
FRONTEND_PID=$!
cd ..

sleep 4
echo ""
echo "Opening browser at http://localhost:5173 ..."
if which xdg-open > /dev/null; then
  xdg-open http://localhost:5173
elif which open > /dev/null; then
  open http://localhost:5173
fi

echo ""
echo "========================================================"
echo "           DEFAULT LOGIN CREDENTIALS"
echo "========================================================"
echo " Admin:        admin         / Admin#Factory99"
echo " Supervisor A: supervisor.a  / Machining@StnA1"
echo " Supervisor B: supervisor.b  / Pressing@StnB2"
echo " Supervisor C: supervisor.c  / Assembly@StnC3"
echo " Supervisor D: supervisor.d  / Finishing@StnD4"
echo " Workers:      ravi.a / Ravi@401 , manoj.b / Manoj@501"
echo "========================================================"
echo ""
echo "FactoryIQ is running! Press Ctrl+C to stop."
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
