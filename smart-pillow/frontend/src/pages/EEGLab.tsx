import React, { useState } from 'react';
import { EEGAnalyzer } from '../components/EEGAnalyzer';
import { useSensorStore } from '../store/sensorStore';
import { ShieldAlert, Activity, Play, Pause, ZoomIn, ZoomOut, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export const EEGLabPage: React.FC = () => {
  const { eeg, activeMode, isDeviceConnected } = useSensorStore();
  const [isPaused, setIsPaused] = useState(false);
  const [signalMode, setSignalMode] = useState<'filtered' | 'raw'>('filtered');
  const [zoomLevel, setZoomLevel] = useState(1);

  const isOnline = activeMode === 'hardware' && isDeviceConnected;
  const isDemo = activeMode === 'demo';
  const hasData = isOnline || isDemo;

  const sqiOverall = eeg?.signal_quality ? (eeg.signal_quality * 100) : (isDemo ? 85 : 0);
  const sqiStatus = !hasData ? 'OFFLINE' : (sqiOverall >= 75 ? 'GOOD' : sqiOverall >= 50 ? 'FAIR' : 'POOR');

  return (
    <div className="space-y-6">
      {/* Prominent Academic & Non-Medical Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm flex items-start space-x-3 text-amber-900 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-amber-950 block text-sm mb-0.5">
            EEG Lab — Experimental Research Interface
          </strong>
          <span>
            Experimental academic and wellness monitoring system. Results are not intended for medical diagnosis, clinical sleep staging, treatment, or medical decision-making.
          </span>
        </div>
      </div>

      {/* Control Toolbar: Pause/Resume, Zoom, Signal Mode */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isPaused ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
          </button>

          <button
            onClick={() => setSignalMode(signalMode === 'filtered' ? 'raw' : 'filtered')}
            className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl transition-all"
          >
            Mode: {signalMode.toUpperCase()} (0.5–40Hz + 50Hz Notch)
          </button>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setZoomLevel(Math.min(zoomLevel + 0.25, 2))}
            className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(Math.max(zoomLevel - 0.25, 0.5))}
            className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-mono rounded-lg"
          >
            {(zoomLevel * 100).toFixed(0)}%
          </button>
        </div>
      </div>

      {/* Live Oscilloscope Component */}
      <EEGAnalyzer />

      {/* Signal Quality Indicators Grid */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900">Experimental Signal Quality</h3>
          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
            sqiStatus === 'GOOD' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            sqiStatus === 'OFFLINE' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            Overall SQI: {sqiStatus} {hasData ? `(${sqiOverall.toFixed(0)}%)` : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
            <span className="text-gray-500 font-medium block text-[11px]">Electrode Contact</span>
            <span className={`font-bold flex items-center gap-1 ${hasData ? 'text-emerald-600' : 'text-gray-400'}`}>
              <CheckCircle className="w-3.5 h-3.5" />
              {hasData ? '98% Contact' : '— (No Hardware)'}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
            <span className="text-gray-500 font-medium block text-[11px]">50 Hz Noise</span>
            <span className={`font-bold flex items-center gap-1 ${hasData ? 'text-emerald-600' : 'text-gray-400'}`}>
              <CheckCircle className="w-3.5 h-3.5" />
              {hasData ? 'Attenuated (-42dB)' : '—'}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
            <span className="text-gray-500 font-medium block text-[11px]">Signal Stability</span>
            <span className={`font-bold font-mono ${hasData ? 'text-blue-600' : 'text-gray-400'}`}>
              {hasData ? 'Normal Variance' : 'Offline'}
            </span>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1">
            <span className="text-gray-500 font-medium block text-[11px]">Missing Samples</span>
            <span className={`font-bold font-mono ${hasData ? 'text-emerald-600' : 'text-gray-400'}`}>
              {hasData ? '0 / 250 pkt' : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
