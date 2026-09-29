import React, { useEffect, useRef } from 'react';
import { useSensorStore } from '../store/sensorStore';
import { Eye, WifiOff } from 'lucide-react';

export const EEGAnalyzer: React.FC = () => {
  const { eegWaveform, eeg, activeMode } = useSensorStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isHardwareNoData = activeMode === 'hardware' && (!eegWaveform || eegWaveform.length === 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;

    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const midY = height / 2;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    if (!eegWaveform || eegWaveform.length < 2) return;

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const step = width / (eegWaveform.length - 1);
    const maxAmplitude = 100;

    eegWaveform.forEach((val, i) => {
      const x = i * step;
      const clampedVal = Math.max(-100, Math.min(100, val));
      const y = midY - (clampedVal / maxAmplitude) * (height / 2 - 10);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }, [eegWaveform]);

  // Band powers (fallback to 0 in Real Hardware mode if no data)
  const deltaVal = eeg?.band_powers?.delta ?? (activeMode === 'demo' ? 70 : 0);
  const thetaVal = eeg?.band_powers?.theta ?? (activeMode === 'demo' ? 45 : 0);
  const alphaVal = eeg?.band_powers?.alpha ?? (activeMode === 'demo' ? 30 : 0);
  const betaVal = eeg?.band_powers?.beta ?? (activeMode === 'demo' ? 15 : 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">EEG live waveform</h3>
          <p className="text-xs text-gray-500">
            {activeMode === 'hardware' ? 'Real Frontal EEG Stream (Pin 34)' : 'Simulated EEG Oscilloscope'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {eeg?.eye_blink_detected && (
            <span className="flex items-center space-x-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-full animate-pulse">
              <Eye className="w-3.5 h-3.5" />
              <span>Blink</span>
            </span>
          )}

          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
            {activeMode === 'hardware' ? 'Hardware Input' : 'Experimental'}
          </span>
        </div>
      </div>

      {/* Live Waveform Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 bg-gray-50 p-2 shadow-inner">
        {isHardwareNoData ? (
          <div className="absolute inset-0 z-30 bg-white/90 rounded-2xl flex flex-col items-center justify-center text-center p-4">
            <WifiOff className="w-7 h-7 text-amber-500 mb-1 animate-bounce" />
            <strong className="text-xs font-bold text-gray-900">No Real EEG Hardware Data Stream</strong>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Connect physical ESP32 differential ADS1115 / EEG pin 34 to stream live brainwave signal.
            </p>
          </div>
        ) : null}

        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="w-full h-40 rounded-xl block"
        />
      </div>

      {/* Band Powers Row */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold pt-2">
        <span className="text-purple-600">Delta {deltaVal.toFixed(0)}%</span>
        <span className="text-emerald-600">Theta {thetaVal.toFixed(0)}%</span>
        <span className="text-amber-600">Alpha {alphaVal.toFixed(0)}%</span>
        <span className="text-blue-600">Beta {betaVal.toFixed(0)}%</span>
      </div>
    </div>
  );
};
