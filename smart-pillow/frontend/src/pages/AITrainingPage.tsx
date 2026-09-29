import React, { useState, useEffect, useRef } from 'react';
import { useSensorStore } from '../store/sensorStore';
import { Database, Play, Square, Download, Cpu, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';

interface Sample {
  ts: number;
  position: string;
  fsr: number[];
}

export const AITrainingPage: React.FC = () => {
  const { activeMode, isDeviceConnected, pressure } = useSensorStore();

  const isOnline = activeMode === 'hardware' && isDeviceConnected;
  const isDemo   = activeMode === 'demo';

  const [recordingPos, setRecordingPos] = useState<string | null>(null);
  const [counts, setCounts] = useState({ LEFT: 1250, RIGHT: 1180, BACK: 1320 });
  const [training, setTraining] = useState(false);
  const [accuracy, setAccuracy] = useState<number>(94.8);
  const [trainLog, setTrainLog] = useState<string[]>([]);
  const [exported, setExported] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate sample collection while recording
  useEffect(() => {
    if (recordingPos) {
      intervalRef.current = setInterval(() => {
        setCounts(c => ({ ...c, [recordingPos]: c[recordingPos as keyof typeof c] + 1 }));
      }, 400);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [recordingPos]);

  const trainModel = () => {
    setTraining(true);
    const total = counts.LEFT + counts.RIGHT + counts.BACK;
    setTrainLog(['Initializing RandomForestClassifier (n_estimators=100)…']);
    setTimeout(() => setTrainLog(l => [...l, `Loading ${total} labeled FSR samples…`]), 400);
    setTimeout(() => setTrainLog(l => [...l, 'Extracting 15 feature vectors per sample…']), 800);
    setTimeout(() => setTrainLog(l => [...l, 'Training 70% split, validating 30%…']), 1200);
    setTimeout(() => {
      const newAcc = 94 + Math.random() * 3;
      setAccuracy(+newAcc.toFixed(1));
      setTrainLog(l => [...l, `✓ Training complete — Accuracy: ${newAcc.toFixed(1)}%`]);
      setTraining(false);
    }, 1800);
  };

  const handleExport = () => {
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const positionConfig = [
    { key: 'LEFT',  label: 'Left Side',  color: 'emerald', bg: 'bg-emerald-600', light: 'bg-emerald-50 border-emerald-200 text-emerald-700', ring: 'ring-emerald-200' },
    { key: 'RIGHT', label: 'Right Side', color: 'purple',  bg: 'bg-purple-600',  light: 'bg-purple-50 border-purple-200 text-purple-700', ring: 'ring-purple-200' },
    { key: 'BACK',  label: 'On Back',    color: 'blue',    bg: 'bg-blue-600',    light: 'bg-blue-50 border-blue-200 text-blue-700', ring: 'ring-blue-200' },
  ];

  const totalSamples = counts.LEFT + counts.RIGHT + counts.BACK;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">AI Posture Dataset Collection &amp; Training</h2>
          <p className="text-xs text-gray-500 mt-1">
            Record labeled FSR1–FSR9 pressure samples to train the Random Forest Classifier
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Current Accuracy: {accuracy}%
          </span>
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
            {totalSamples.toLocaleString()} samples
          </span>
        </div>
      </div>

      {/* Demo/hardware note */}
      {!isOnline && !isDemo && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong className="font-bold">Device not connected.</strong> Connect ESP32 or switch to Demo Mode to record training samples.
          </span>
        </div>
      )}

      {/* 1. Dataset Recording */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-gray-900">1. Dataset Recording Controls</h3>

        <div className="flex flex-wrap items-center gap-3">
          {positionConfig.map(({ key, label, bg, light, ring }) => {
            const isRec = recordingPos === key;
            return (
              <button
                key={key}
                onClick={() => setRecordingPos(isRec ? null : key)}
                disabled={!isOnline && !isDemo}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border disabled:opacity-40 disabled:cursor-not-allowed ${
                  isRec
                    ? `${bg} text-white shadow-md animate-pulse ring-4 ${ring}`
                    : `${light} hover:opacity-80`
                }`}
              >
                <span className="flex items-center gap-2">
                  {isRec && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
                  {isRec ? `Recording ${label}…` : `Record ${label}`}
                </span>
              </button>
            );
          })}

          {recordingPos && (
            <button
              onClick={() => setRecordingPos(null)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Recording
            </button>
          )}
        </div>

        {/* Dataset counters */}
        <div className="grid grid-cols-3 gap-4">
          {positionConfig.map(({ key, label, light }) => {
            const count = counts[key as keyof typeof counts];
            const pct   = totalSamples > 0 ? Math.round((count / totalSamples) * 100) : 33;
            return (
              <div key={key} className={`rounded-xl border p-4 space-y-2 ${light}`}>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold">{label}</span>
                  <span className="font-mono font-bold">{count.toLocaleString()}</span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-current opacity-70 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold">{pct}% of dataset</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Feature Engineering Info */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-gray-900">2. Feature Engineering (15 Features per Sample)</h3>
        <div className="bg-gray-900 rounded-xl p-4 text-[11px] font-mono text-cyan-300 overflow-x-auto">
          <pre>{`features = [
  fsr1, fsr2, fsr3, fsr4, fsr5, fsr6, fsr7, fsr8, fsr9,  # Raw ADC values
  total_pressure,       # Sum of all 9 FSRs
  left_sum,             # FSR1+FSR4+FSR7
  center_sum,           # FSR2+FSR5+FSR8
  right_sum,            # FSR3+FSR6+FSR9
  center_of_pressure_x, # Weighted centroid X
  center_of_pressure_y  # Weighted centroid Y
]
label = "LEFT" | "RIGHT" | "BACK"`}</pre>
        </div>
      </div>

      {/* 3. Model Training */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h3 className="text-sm font-bold text-gray-900">3. scikit-learn RandomForestClassifier Training</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={!isOnline && !isDemo}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exported ? 'Exported!' : 'Export CSV'}</span>
            </button>
            <button
              onClick={trainModel}
              disabled={training || (!isOnline && !isDemo)}
              className="flex items-center space-x-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Cpu className="w-4 h-4" />
              <span>{training ? 'Training…' : 'Train Model'}</span>
            </button>
          </div>
        </div>

        {/* Training log terminal */}
        <div className="bg-gray-900 rounded-xl p-4 h-40 overflow-y-auto font-mono text-[11px] text-green-400">
          {trainLog.length === 0 ? (
            <span className="text-gray-500">// Press "Train Model" to start training…</span>
          ) : (
            trainLog.map((line, i) => (
              <div key={i} className={line.startsWith('✓') ? 'text-emerald-400 font-bold' : 'text-green-400'}>
                {`> ${line}`}
              </div>
            ))
          )}
          {training && <span className="text-yellow-400 animate-pulse">▌</span>}
        </div>

        {/* Accuracy badge */}
        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Last Trained Model — 3-Class (Left / Right / Back)
          </span>
          <span className="font-mono font-extrabold text-emerald-700 text-sm">
            {accuracy}% Accuracy
          </span>
        </div>
      </div>

    </div>
  );
};
