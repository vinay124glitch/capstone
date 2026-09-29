/**
 * Global Zustand store for all real-time sensor data and UI state.
 * Strictly enforces real hardware vs demo mode data separation.
 */
import { create } from 'zustand';
import type {
  SensorUpdate, ConnectionStatus, PressureMetrics, PositionInfo,
  MovementInfo, EnvironmentInfo, EEGInfo, SleepScore, AppSettings
} from '../types';

interface EEGHistoryPoint {
  ts: number;
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
}

interface TempHistoryPoint {
  ts: number;
  avg_temp: number;
  avg_hum: number;
}

interface ScoreHistoryPoint {
  ts: number;
  score: number;
}

interface SensorStore {
  // Connection & Mode
  connectionStatus: ConnectionStatus;
  isDeviceConnected: boolean;
  mode: 'demo' | 'hardware';
  activeMode: 'demo' | 'hardware';
  lastPacketTime: number | null;
  packetRate: number;
  
  // Session
  sessionActive: boolean;
  isRecording: boolean;
  sessionId: string | number | null;
  sessionUuid: string | null;
  sessionStart: number | null;
  
  // Latest Data
  latestUpdate: SensorUpdate | null;
  pressure: PressureMetrics | null;
  position: PositionInfo | null;
  movement: MovementInfo | null;
  environment: EnvironmentInfo | null;
  env: EnvironmentInfo | null;
  sleepScore: SleepScore | null;
  eeg: EEGInfo | null;

  // Settings
  settings: AppSettings | null;

  // Rolling EEG Waveform Buffer
  eegWaveform: number[];
  
  // History
  eegBandHistory: EEGHistoryPoint[];
  envHistory: TempHistoryPoint[];
  scoreHistory: ScoreHistoryPoint[];
  movementHistory: { ts: number; level: string; }[];

  // Actions
  setConnectionStatus: (s: ConnectionStatus) => void;
  setIsDeviceConnected: (connected: boolean) => void;
  setActiveMode: (mode: 'demo' | 'hardware') => void;
  setRecording: (recording: boolean) => void;
  setSessionId: (id: string | number | null) => void;
  setSettings: (settings: AppSettings | null) => void;
  processUpdate: (update: SensorUpdate) => void;
  setSessionActive: (active: boolean, uuid?: string) => void;
  clearHardwareData: () => void;
  clearHistory: () => void;
}

export const useSensorStore = create<SensorStore>((set, get) => ({
  connectionStatus: 'disconnected',
  isDeviceConnected: false,
  mode: 'hardware',
  activeMode: 'hardware',
  lastPacketTime: null,
  packetRate: 0,
  sessionActive: false,
  isRecording: false,
  sessionId: null,
  sessionUuid: null,
  sessionStart: null,
  latestUpdate: null,
  pressure: null,
  position: null,
  movement: null,
  environment: null,
  env: null,
  sleepScore: null,
  eeg: null,
  settings: null,
  eegWaveform: [],
  eegBandHistory: [],
  envHistory: [],
  scoreHistory: [],
  movementHistory: [],

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setIsDeviceConnected: (isDeviceConnected) => set({ isDeviceConnected }),
  
  setActiveMode: (activeMode) => {
    // When switching to Real Hardware Mode, purge all demo/mock values immediately
    if (activeMode === 'hardware') {
      set({
        activeMode: 'hardware',
        mode: 'hardware',
        isDeviceConnected: false,
        latestUpdate: null,
        pressure: null,
        position: null,
        movement: null,
        environment: null,
        env: null,
        sleepScore: null,
        eeg: null,
        eegWaveform: [],
        eegBandHistory: [],
        envHistory: [],
        scoreHistory: [],
        movementHistory: [],
      });
    } else {
      set({ activeMode: 'demo', mode: 'demo', isDeviceConnected: true });
    }
  },

  setRecording: (isRecording) => set({ isRecording, sessionActive: isRecording }),
  setSessionId: (sessionId) => set({ sessionId }),
  setSettings: (settings) => set({ settings }),

  processUpdate: (update: SensorUpdate) => {
    const now = Date.now();
    const state = get();

    // Check for device status control packet
    if ((update as any).type === 'device_status') {
      const isConn = !!(update as any).connected;
      if (!isConn && state.activeMode === 'hardware') {
        set({
          isDeviceConnected: false,
          latestUpdate: null,
          pressure: null,
          position: null,
          movement: null,
          environment: null,
          env: null,
          sleepScore: null,
          eeg: null,
          eegWaveform: [],
        });
      } else {
        set({ isDeviceConnected: isConn });
      }
      return;
    }

    const updateSource = (update.source === 'hardware' || update.mode === 'hardware') ? 'hardware' : 'demo';

    // If application is in Real Hardware mode, IGNORE any incoming simulation packets
    if (state.activeMode === 'hardware' && updateSource !== 'hardware') {
      return;
    }

    // EEG waveform processing
    let newWaveform = state.eegWaveform;
    const samples = update.eeg?.samples || update.eeg?.raw_waveform;
    if (samples && samples.length) {
      const combined = [...state.eegWaveform, ...samples];
      newWaveform = combined.slice(-1250);
    }

    // EEG band history
    let newEegHistory = state.eegBandHistory;
    if (update.eeg?.bands) {
      const b = update.eeg.bands;
      newEegHistory = [
        ...state.eegBandHistory,
        { ts: now, delta: b.delta, theta: b.theta, alpha: b.alpha, beta: b.beta }
      ].slice(-60);
    }

    // Env history
    const envData = update.environment;
    const newEnvHistory = envData ? [
      ...state.envHistory,
      { ts: now, avg_temp: envData.temperature_c ?? envData.avg_temp ?? 0, avg_hum: envData.humidity_pct ?? envData.avg_hum ?? 0 }
    ].slice(-3600) : state.envHistory;

    // Score history
    const scoreVal = update.sleep_score?.overall_score ?? update.sleep_score?.score ?? 0;
    const newScoreHistory = [
      ...state.scoreHistory,
      { ts: now, score: scoreVal }
    ].slice(-300);

    // Movement history
    const moveLevel = update.movement?.level ?? 'Still';
    const newMovementHistory = [
      ...state.movementHistory,
      { ts: now, level: moveLevel }
    ].slice(-300);

    set({
      isDeviceConnected: true,
      latestUpdate: update,
      pressure: update.pressure || state.pressure,
      position: update.position || state.position,
      movement: update.movement || state.movement,
      environment: update.environment || state.environment,
      env: update.environment || state.env,
      sleepScore: update.sleep_score || state.sleepScore,
      eeg: update.eeg || state.eeg,
      lastPacketTime: now,
      eegWaveform: newWaveform,
      eegBandHistory: newEegHistory,
      envHistory: newEnvHistory,
      scoreHistory: newScoreHistory,
      movementHistory: newMovementHistory,
    });
  },

  setSessionActive: (active, uuid) => set({
    sessionActive: active,
    isRecording: active,
    sessionUuid: uuid || null,
    sessionStart: active ? Date.now() : null,
  }),

  clearHardwareData: () => set({
    pressure: null,
    position: null,
    movement: null,
    environment: null,
    env: null,
    sleepScore: null,
    eeg: null,
    eegWaveform: [],
  }),

  clearHistory: () => set({
    eegWaveform: [],
    eegBandHistory: [],
    envHistory: [],
    scoreHistory: [],
    movementHistory: [],
  }),
}));
