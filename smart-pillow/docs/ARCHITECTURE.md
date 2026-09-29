# Smart Pillow — System Architecture & Technical Specification

## 1. Overview
The **Smart Pillow — Sleep & Brainwave Monitor** is an integrated IoT, signal-processing, and full-stack biomedical web platform. It captures real-time biometric and environmental telemetry from an AI-enabled smart textile pillow to evaluate sleep architecture, head/neck alignment, microclimate thermal comfort, and single-channel frontal EEG signals.

---

## 2. Hardware Topology & Data Pipeline

```
+-----------------------------------------------------------------------+
|                         ESP32 Smart Pillow Hardware                  |
|                                                                       |
|  [4x4 FSR Matrix]      [MPU6050 6-DOF IMU]   [BME280/DHT22]   [ADS1115 / EEG] |
|   16 Pressure Sensors   Accel (x,y,z) + Gyro   Temp + Humidity  Frontal Channel |
+-----------------------------------------------------------------------+
                                  |
                        Wi-Fi / WebSockets (50 Hz)
                                  v
+-----------------------------------------------------------------------+
|                        FastAPI Backend Server                         |
|                                                                       |
|  - WebSocket Handler (/ws/device & /ws/live)                          |
|  - SciPy DSP Pipeline (Welch PSD, Notch Filter, Bandpass 0.5-40 Hz)   |
|  - Machine Learning & Rule-based Posture Classifier                    |
|  - Real-Time Sleep Score & Cervical Strain Calculator                 |
|  - SQLite Database Storage (AIOSQLite + SQLAlchemy 2.0)               |
+-----------------------------------------------------------------------+
                                  |
                         WebSocket Telemetry Broadcast
                                  v
+-----------------------------------------------------------------------+
|                    React + Tailwind CSS Frontend                      |
|                                                                       |
|  - 4x4 FSR Heatmap Canvas with Center of Pressure (CoP) Crosshairs    |
|  - Live EEG Oscilloscope Waveform & Spectral Band Power Bars          |
|  - Ergonomic Head-Neck Alignment Strain Index                         |
|  - Microclimate Telemetry Panel                                       |
|  - Hypnogram Timeline & Clinical PDF/CSV Report Exporter              |
+-----------------------------------------------------------------------+
```

---

## 3. Signal Processing & Algorithms

### 3.1 4x4 FSR Pressure Matrix Heatmap & CoP
Center of Pressure $(CoP_x, CoP_y)$ is calculated dynamically over the 16 textile sensor nodes:

$$CoP_x = \frac{\sum_{i=0}^{3} \sum_{j=0}^{3} j \cdot P_{i,j}}{\sum_{i=0}^{3} \sum_{j=0}^{3} P_{i,j}}$$

$$CoP_y = \frac{\sum_{i=0}^{3} \sum_{j=0}^{3} i \cdot P_{i,j}}{\sum_{i=0}^{3} \sum_{j=0}^{3} P_{i,j}}$$

### 3.2 Single-Channel EEG Spectral Analysis
- **Filter Chain**: 4th-order Butterworth bandpass (0.5 – 40.0 Hz) + 50/60 Hz notch filter.
- **Spectral Estimator**: Welch's periodogram method yielding power spectral density $S_{xx}(f)$.
- **Band Integration**:
  $$\text{Power}_{\text{band}} = \int_{f_{low}}^{f_{high}} S_{xx}(f) \, df$$
  - Delta ($\delta$): 0.5 – 4.0 Hz
  - Theta ($\theta$): 4.0 – 8.0 Hz
  - Alpha ($\alpha$): 8.0 – 13.0 Hz
  - Beta ($\beta$): 13.0 – 30.0 Hz

---

## 4. Operational Modes
1. **Real Hardware Mode**: Receives live JSON telemetry packets over WebSocket from ESP32.
2. **Demo/Simulation Mode**: Generates multi-state synthetic sensor streams including posture changes, micro-movements, EOG eye blinks, and microclimate fluctuations for hardware-free demonstration.
