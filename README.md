# Smart Pillow — Sleep & Brainwave Monitor Capstone

> **Biomedical Engineering & IoT Capstone Project**  
> An AI-enabled smart textile pillow monitoring platform featuring 6-channel FSR pressure matrix heatmaps, single-channel frontal EEG signal processing, head posture ML classification, and microclimate telemetry.

---

## 🌟 Key Features

1. **Dual Real Hardware & Simulated Demo Modes**:
   - **Real Hardware Mode (Default)**: Connects directly to ESP32 microcontrollers over high-frequency WebSockets (`ws://<SERVER_IP>:8000/ws/device`).
   - **Demo Mode**: Built-in multi-state simulation engine for hardware-free presentation.

2. **2D FSR Pressure Heatmap & Center of Pressure (CoP)**:
   - Interactive heatmap with dynamic **Center of Pressure (CoP)** crosshair tracking.
   - Real-time head position classification (Left, Right, Back).

3. **Machine Learning Classifier (Random Forest)**:
   - 900-sample balanced dataset (`data/position_training_data.csv`).
   - 28 extracted spatial and statistical features.
   - 100% 5-fold cross-validation accuracy (`app/ml/position_model.pkl`).

4. **EEG Signal Processor & Oscilloscope**:
   - Real-time 250 Hz waveform oscilloscope canvas rendering.
   - Spectral band power decomposition ($\delta, \theta, \alpha, \beta$) and FFT spectrum.
   - Signal quality index (SQI) and contact health.

5. **Microclimate & Movement Tracking**:
   - Ambient & core pillow temperature, relative humidity.
   - MPU6050 6-DOF IMU motion detection and restless sleep event counter.

6. **Historical Analytics & Report Exporter**:
   - Sleep session recording and SQLite persistence.
   - PDF summary reports and raw CSV telemetry export.

---

## 🚀 Quick Start Guide

### Unified Single-Server Run (Port 8000)
Run the one-click launcher:
```powershell
.\smart-pillow\run_app.bat
```
Or manually:
```bash
cd smart-pillow/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
- **Web Dashboard:** [http://localhost:8000](http://localhost:8000)
- **API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ESP32 WebSocket Endpoint:** `ws://<YOUR_LOCAL_IP>:8000/ws/device`

---

## 📁 Repository Structure

```
smart-pillow/
├── backend/                  # FastAPI Python Backend + SQLite
│   ├── app/
│   │   ├── api/              # REST routes (/api/mode, /api/session, etc.)
│   │   ├── ml/               # Random Forest posture classifier & training script
│   │   ├── models/           # SQLAlchemy DB models
│   │   ├── services/         # State manager, session service, mock generator
│   │   ├── signal_processing/# DSP (FSR, sleep score, movement, EEG processor)
│   │   └── websocket/        # WebSocket handlers (/ws/live, /ws/device)
│   └── tests/                # Pytest unit tests
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── components/       # Heatmap, EEGAnalyzer, Header, Sidebar
│       ├── pages/            # Dashboard, EEGLab, DeviceConnection, etc.
│       ├── services/         # API & WebSocket client
│       └── store/            # Zustand global state
├── data/                     # Position training dataset (CSV & generator)
├── esp32/                    # ESP32 C++/Arduino firmware
└── Dockerfile                # Production multi-stage container
```

---

## ⚠️ Academic Safety & Medical Disclaimer
This software and hardware system is developed exclusively for **academic research, biomedical engineering demonstrations, and non-clinical proof-of-concept evaluation**. It is NOT a certified medical device and must NOT be used for medical diagnosis, treatment, or sleep apnea monitoring.
