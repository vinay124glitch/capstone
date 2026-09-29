@echo off
title Smart Pillow - Sleep ^& Brainwave Monitor
echo ==========================================================
echo       Smart Pillow - Sleep ^& Brainwave Monitor
echo           Biomedical Engineering Capstone 2026
echo ==========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Frontend Build...
if not exist "frontend\dist\index.html" (
    echo Building frontend static bundle...
    cd frontend
    call npm install
    call npm run build
    cd ..
)

echo.
echo [2/3] Checking Machine Learning Model...
if not exist "backend\app\ml\position_model.pkl" (
    echo Training Random Forest position model...
    python backend\app\ml\train_position_model.py
)

echo.
echo [3/3] Starting Unified Server on port 8000...
echo ----------------------------------------------------------
echo - Web Dashboard:  http://localhost:8000
echo - API Docs:       http://localhost:8000/docs
echo - ESP32 WS Stream: ws://^<YOUR_LOCAL_IP^>:8000/ws/device
echo ----------------------------------------------------------
echo.

cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000

pause
