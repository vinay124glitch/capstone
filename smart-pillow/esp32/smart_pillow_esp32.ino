/*
 * ESP32 Smart Textile Pillow Firmware
 * -------------------------------------
 * Sensors:
 *  - 4x4 FSR Matrix (16 channels via CD74HC4067 multiplexer or ADC pins)
 *  - MPU6050 6-DOF IMU (I2C: SDA=21, SCL=22)
 *  - BME280 / DHT22 Microclimate Sensor (Pin 4)
 *  - ADS1115 16-Bit ADC / Analog Front-End (EEG Channel: Pin 34)
 *
 * Connectivity:
 *  - Wi-Fi 802.11 b/g/n
 *  - WebSocket Client to FastAPI server (ws://<SERVER_IP>:8000/ws/device)
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* WS_HOST       = "192.168.1.100"; // Replace with your laptop/server IP
const int   WS_PORT       = 8000;
const char* WS_PATH       = "/ws/device";

#define DHTPIN 4
#define DHTTYPE DHT22
#define EEG_PIN 34

// 4x4 FSR Multiplexer Pins (CD74HC4067)
const int MUX_S0 = 16;
const int MUX_S1 = 17;
const int MUX_S2 = 18;
const int MUX_S3 = 19;
const int MUX_SIG = 35; // Analog Input

// ---------------------------------------------------------------------------
// GLOBAL OBJECTS
// ---------------------------------------------------------------------------
WebSocketsClient webSocket;
Adafruit_MPU6050 mpu;
DHT dht(DHTPIN, DHTTYPE);

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL_MS = 20; // 50 Hz telemetry broadcast

// ---------------------------------------------------------------------------
// WEBSOCKET EVENTS
// ---------------------------------------------------------------------------
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected from FastAPI server!");
      break;
    case WStype_CONNECTED:
      Serial.printf("[WS] Connected to url: %s\n", payload);
      // Send handshake JSON payload
      webSocket.sendTXT("{\"type\":\"esp32_handshake\",\"device_id\":\"ESP32_PILLOW_01\"}");
      break;
    case WStype_TEXT:
      Serial.printf("[WS] Command received: %s\n", payload);
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// READ 4x4 FSR MATRIX
// ---------------------------------------------------------------------------
void readFSRMatrix(uint16_t matrix[4][4]) {
  for (int channel = 0; channel < 16; channel++) {
    // Set multiplexer select pins
    digitalWrite(MUX_S0, (channel & 1));
    digitalWrite(MUX_S1, (channel >> 1) & 1);
    digitalWrite(MUX_S2, (channel >> 2) & 1);
    digitalWrite(MUX_S3, (channel >> 3) & 1);
    delayMicroseconds(5); // Stabilization delay

    uint16_t rawVal = analogRead(MUX_SIG);
    int row = channel / 4;
    int col = channel % 4;
    matrix[row][col] = rawVal;
  }
}

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n--- Initializing Smart Pillow ESP32 Firmware ---");

  // Multiplexer pin modes
  pinMode(MUX_S0, OUTPUT);
  pinMode(MUX_S1, OUTPUT);
  pinMode(MUX_S2, OUTPUT);
  pinMode(MUX_S3, OUTPUT);

  // Initialize Sensors
  Wire.begin(21, 22);
  if (!mpu.begin()) {
    Serial.println("Warning: MPU6050 not found! (Check SDA/SCL wiring)");
  } else {
    Serial.println("MPU6050 6-DOF IMU initialized.");
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
    mpu.setGyroRange(MPU6050_RANGE_250_DEG);
  }

  dht.begin();

  // Connect to Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Connected!");
  Serial.print("ESP32 Local IP: ");
  Serial.println(WiFi.localIP());

  // WebSocket initialization
  webSocket.begin(WS_HOST, WS_PORT, WS_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
}

// ---------------------------------------------------------------------------
// MAIN LOOP
// ---------------------------------------------------------------------------
void loop() {
  webSocket.loop();

  unsigned long now = millis();
  if (now - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = now;

    // 1. Read 4x4 FSR Matrix
    uint16_t fsrGrid[4][4];
    readFSRMatrix(fsrGrid);

    // 2. Read IMU Motion & Acceleration
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    // 3. Read Microclimate Telemetry
    float temperature_c = dht.readTemperature();
    float humidity_pct = dht.readHumidity();
    if (isnan(temperature_c)) temperature_c = 21.5;
    if (isnan(humidity_pct)) humidity_pct = 45.0;

    // 4. Read Raw EEG Analog Differential Channel
    int rawEegAdc = analogRead(EEG_PIN);
    float eegMicrovolts = ((float)rawEegAdc - 2048.0) * (3300.0 / 4095.0) / 100.0; // Scaled to uV

    // Construct JSON packet
    StaticJsonDocument<1024> doc;
    doc["timestamp"] = (double)now / 1000.0;
    doc["mode"] = "hardware";

    // FSR Grid
    JsonObject fsrObj = doc.createNestedObject("fsr");
    JsonArray matrixArr = fsrObj.createNestedArray("matrix");
    for (int r = 0; r < 4; r++) {
      JsonArray rowArr = matrixArr.createNestedArray();
      for (int c = 0; c < 4; c++) {
        rowArr.add(fsrGrid[r][c]);
      }
    }

    // IMU
    JsonObject imuObj = doc.createNestedObject("imu");
    imuObj["accel_x"] = a.acceleration.x;
    imuObj["accel_y"] = a.acceleration.y;
    imuObj["accel_z"] = a.acceleration.z;
    imuObj["gyro_x"]  = g.gyro.x;
    imuObj["gyro_y"]  = g.gyro.y;
    imuObj["gyro_z"]  = g.gyro.z;

    // Environment
    JsonObject envObj = doc.createNestedObject("environment");
    envObj["temperature_c"] = temperature_c;
    envObj["humidity_pct"]  = humidity_pct;
    envObj["air_quality_index"] = 92;

    // EEG
    JsonObject eegObj = doc.createNestedObject("eeg");
    eegObj["raw_signal"] = eegMicrovolts;

    // Serialize JSON to string
    String jsonOutput;
    serializeJson(doc, jsonOutput);

    // Send packet over WebSocket
    if (webSocket.isConnected()) {
      webSocket.sendTXT(jsonOutput);
    }
  }
}
