# Smart Pillow — Sleep & Brainwave Monitor

> **Biomedical Engineering & IoT Capstone Project**  
> An AI-enabled smart textile pillow monitoring platform featuring 4x4 FSR pressure matrix heatmaps, single-channel frontal EEG signal processing, ergonomic cervical strain index, and microclimate telemetry.

---

## 🌟 Key Features

1. **Dual Real Hardware & Simulated Demo Modes**:
   - **Hardware Mode**: Connects directly to ESP32 microcontrollers over high-frequency WebSockets.
   - **Demo Mode**: Built-in realistic multi-state simulation engine for hardware-free demonstration.

2. **2D 4x4 FSR Pressure Matrix Heatmap**:
   - Interactive SVG/Canvas heatmap with dynamic **Center of Pressure (CoP)** tracking crosshair.
   - Real-time posture classification (Left Side, Right Side, Back Supine, Prone).

3. **EEG Signal Processor & Oscilloscope**:
   - Real-time 250 Hz waveform oscilloscope canvas rendering.
   - Spectral band power decomposition ($\delta, \theta, \alpha, \beta, \gamma$) using Welch's periodogram PSD.
   - EOG blink artifact detection & signal quality index (SQI).

4. **Ergonomic Cervical Strain & Microclimate Panel**:
   - Head-neck alignment scoring using 6-DOF IMU telemetry.
   - Thermal comfort index, core pillow temperature, relative humidity, and air quality index.

5. **Historical Analytics & Report Exporter**:
   - Hypnogram sleep architecture timeline charts.
   - PDF clinical summary and raw CSV dataset export buttons.

6. **Safety & Academic Compliance**:
   - Prominent academic research disclaimer banner.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 1. Start FastAPI Backend
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- WebSocket Endpoint: `ws://localhost:8000/ws/live`

### 2. Start React + Vite Frontend
```bash
cd frontend
npm install
npm run dev
```
- Open your browser at: `http://localhost:5173`

---

## 🧪 Running Unit Tests
```bash
cd backend
python -m pytest tests/ -v
```

---

## 📁 Project Architecture

```
smart-pillow/
├── backend/                  # FastAPI Python Backend
│   ├── app/
│   │   ├── api/              # REST routes & endpoints
│   │   ├── ml/               # Machine Learning posture model
│   │   ├── models/           # SQLAlchemy DB models & SQLite
│   │   ├── services/         # Mock generator & analytics services
│   │   ├── signal_processing/# DSP (Welch PSD, FSR, Sleep score, IMU)
│   │   └── websocket/        # Real-time WebSocket handlers
│   └── tests/                # Pytest unit tests (20/20 passing)
├── frontend/                 # React 18 + Tailwind CSS + TypeScript
│   ├── src/
│   │   ├── components/       # Heatmap, EEG, Microclimate, Ergonomic, Analytics
│   │   ├── store/            # Zustand global telemetry store
│   │   ├── services/         # API & WebSocket handlers
│   │   └── hooks/            # Session & timer hooks
├── esp32/                    # ESP32 C++/Arduino firmware sketch
└── docs/                     # Architecture & Hardware wiring guides
```

---

## ⚠️ Academic Safety & Medical Disclaimer
This software and hardware system is developed exclusively for **academic research, biomedical engineering demonstrations, and non-clinical proof-of-concept evaluation**. It is NOT a certified medical device and must NOT be used for medical diagnosis, treatment, or sleep apnea monitoring.
