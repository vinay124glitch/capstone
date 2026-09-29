# ESP32 Hardware Wiring & Sensor Calibration Guide

## Component Schematic & Wiring Table

| Component | ESP32 Pin | Protocol / Interface | Function |
| :--- | :--- | :--- | :--- |
| CD74HC4067 MUX S0 | GPIO 16 | Digital Output | Channel selector bit 0 |
| CD74HC4067 MUX S1 | GPIO 17 | Digital Output | Channel selector bit 1 |
| CD74HC4067 MUX S2 | GPIO 18 | Digital Output | Channel selector bit 2 |
| CD74HC4067 MUX S3 | GPIO 19 | Digital Output | Channel selector bit 3 |
| CD74HC4067 Signal (SIG) | GPIO 35 (ADC1_CH7) | Analog Input | 4x4 FSR matrix analog voltage |
| MPU6050 SDA | GPIO 21 | I2C Data | 6-DOF Accel & Gyroscope |
| MPU6050 SCL | GPIO 22 | I2C Clock | 6-DOF Accel & Gyroscope |
| DHT22 / BME280 | GPIO 4 | OneWire / I2C | Core temperature & humidity |
| ADS1115 / EEG AFE | GPIO 34 (ADC1_CH6) | Analog Input | Differential frontal EEG signal |

---

## Calibration Procedure
1. Place the Smart Pillow on a flat surface without any weight.
2. Power on the ESP32 and open the Web App UI.
3. Navigate to **Hardware Config** tab.
4. Click **Zero Calibrate Sensors**. The system records baseline voltage offsets and saves zero-reference parameters into Flash NVRAM.
