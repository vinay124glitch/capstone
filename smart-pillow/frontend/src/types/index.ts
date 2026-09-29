// TypeScript type definitions for Smart Pillow system

export interface SensorRaw {
  fsr: number[];
  temp1: number;
  temp2: number;
  hum1: number;
  hum2: number;
  accel: number[];
  gyro: number[];
}

export interface PressureMetrics {
  fsr?: number[];
  matrix?: number[][];
  total?: number;
  total_pressure?: number;
  left_sum?: number;
  center_sum?: number;
  right_sum?: number;
  top_sum?: number;
  middle_sum?: number;
  bottom_sum?: number;
  left_right_balance?: string;
  top_bottom_balance?: string;
  max_pressure?: number;
  peak_hotspot_detected?: boolean;
  center_x?: number;
  center_y?: number;
  balance?: number;
  stability?: number;
}

export interface PositionInfo {
  position: 'Left' | 'Right' | 'Back' | 'Prone' | 'Unknown' | string;
  confidence: number;
  classifier_type?: 'rule_based' | 'ml' | string;
  cervical_strain_score?: number;
}

export interface MovementInfo {
  accel_magnitude?: number;
  accel_variance?: number;
  gyro_magnitude?: number;
  gyro_variance?: number;
  fsr_change_rate?: number;
  level?: 'Still' | 'Low' | 'Moderate' | 'High' | string;
  movement_intensity?: string;
  movement_events_count?: number;
  head_angle_deg?: number;
  is_event?: boolean;
  event_count?: number;
}

export interface EnvironmentInfo {
  temp1?: number;
  temp2?: number;
  avg_temp?: number;
  hum1?: number;
  hum2?: number;
  avg_hum?: number;
  temperature_c?: number;
  humidity_pct?: number;
  air_quality_index?: number;
  comfort_score?: number;
  thermal_comfort?: string;
}

export interface EEGBands {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma?: number;
  total: number;
}

export interface EEGQuality {
  overall: number;
  electrode_contact: number;
  noise_50hz: number;
  clipping: boolean;
  flat_line: boolean;
  excessive_amplitude: boolean;
}

export interface EEGSpectrum {
  freqs: number[];
  amplitudes: number[];
}

export interface EEGInfo {
  quality?: EEGQuality | null;
  signal_quality?: number;
  bands?: EEGBands | null;
  band_powers?: Record<string, number>;
  dominant_frequency_band?: string;
  eye_blink_detected?: boolean;
  noise_level?: number;
  sleep_stage?: string;
  spectrum?: EEGSpectrum | null;
  new_fft?: boolean;
  buffer_size?: number;
  samples?: number[];
  raw_waveform?: number[];
}

export interface SleepScore {
  score?: number;
  overall_score?: number;
  sleep_efficiency_pct?: number;
  posture_score?: number;
  climate_score?: number;
  eeg_score?: number;
  breakdown?: Record<string, number>;
}

export interface SensorUpdate {
  type?: 'sensor_update' | string;
  ts?: number;
  timestamp?: string | number;
  source?: 'simulation' | 'hardware' | string;
  mode?: 'demo' | 'hardware' | string;
  raw?: SensorRaw;
  pressure?: PressureMetrics;
  position?: PositionInfo;
  movement?: MovementInfo;
  environment?: EnvironmentInfo;
  sleep_score?: SleepScore;
  eeg?: EEGInfo;
}

// Session types
export interface Session {
  id: string | number;
  session_uuid?: string;
  start_time: string;
  end_time?: string | null;
  duration_seconds?: number | null;
  duration_minutes?: number | null;
  sleep_score?: number | null;
  efficiency_pct?: number | null;
  dominant_position?: string | null;
  metrics?: Record<string, unknown> | null;
  position_events?: PositionEvent[];
  movement_events?: MovementEvent[];
  eeg_metrics?: EEGMetricRecord[];
}

export interface PositionEvent {
  timestamp: string;
  position: string;
  confidence: number;
  classifier_type: string;
}

export interface MovementEvent {
  timestamp: string;
  level: string;
  accel_magnitude: number;
}

export interface EEGMetricRecord {
  timestamp: string;
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  signal_quality: number;
}

// Settings
export interface DeviceSettings {
  esp32_ip: string;
  websocket_url: string;
  auto_reconnect: boolean;
  demo_mode: boolean;
  reconnect_max_attempts: number;
}

export interface ThresholdSettings {
  movement_still_threshold: number;
  movement_low_threshold: number;
  movement_moderate_threshold: number;
  fsr_position_threshold: number;
  signal_quality_poor: number;
  signal_quality_fair: number;
  temp_min_comfort: number;
  temp_max_comfort: number;
  eeg_noise_threshold: number;
}

export interface SleepScoreWeights {
  movement_stability: number;
  position_stability: number;
  pressure_stability: number;
  temperature_stability: number;
  eeg_stability: number;
}

export interface CalibrationData {
  baseline: number[];
  loaded: number[];
  offsets: number[];
}

export interface AppSettings {
  device?: DeviceSettings;
  thresholds?: ThresholdSettings;
  sleep_score_weights?: SleepScoreWeights;
  calibration?: CalibrationData;
  sampling_rate_hz?: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
