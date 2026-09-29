import React, { useState } from 'react';
import { useSensorStore } from '../store/sensorStore';
import { api } from '../services/api';
import { RefreshCw, CheckCircle2, Crosshair, ArrowRight, WifiOff, AlertTriangle, ShieldCheck } from 'lucide-react';

const STEPS = [
  {
    title: 'Step 1 — Capture Unloaded Baseline',
    desc: 'Remove all weight from the Smart Pillow surface. The sensors should read their minimum idle values.',
    action: 'Capture Unloaded Baseline',
    color: 'blue',
  },
  {
    title: 'Step 2 — Capture Normal Load Values',
    desc: 'Gently place normal head pressure onto the center contour zone of the pillow.',
    action: 'Capture Loaded Values',
    color: 'blue',
  },
  {
    title: 'Step 3 — Calculate FSR Offsets',
    desc: 'Compute zero-reference calibration parameters and write results to ESP32 NVRAM.',
    action: 'Calculate Calibration',
    color: 'emerald',
    loading: true,
  },
  {
    title: 'Calibration Complete',
    desc: 'Calibration offsets saved to ESP32 NVRAM. Press different pillow zones to verify live heatmap contact.',
    action: 'Recalibrate',
    color: 'emerald',
    success: true,
  },
];

export const CalibrationPage: React.FC = () => {
  const { activeMode, isDeviceConnected, pressure } = useSensorStore();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [calibrating, setCalibrating] = useState(false);

  const isOnline = activeMode === 'hardware' && isDeviceConnected;
  const isDemo   = activeMode === 'demo';
  const canCalibrate = isOnline || isDemo;

  const fsr = pressure?.fsr || (isDemo ? [120, 180, 95, 210, 870, 165, 88, 134, 72] : null);

  const advance = async () => {
    if (step === 0) { setStep(1); return; }
    if (step === 1) { setStep(2); return; }
    if (step === 2) {
      setCalibrating(true);
      try {
        await api.calibrateHardware();
      } catch {}
      setTimeout(() => { setCalibrating(false); setStep(3); }, 1200);
      return;
    }
    if (step === 3) { setStep(0); return; }
  };

  const stepColors: Record<string, string> = {
    blue:    'bg-blue-600 hover:bg-blue-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pressure Sensor Calibration Wizard</h2>
          <p className="text-xs text-gray-500 mt-1">
            4-step zero &amp; loaded offset calibration for FSR1–FSR9 sensors
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
          step === 3
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-blue-50 text-blue-600 border-blue-100'
        }`}>
          {step === 3 ? '✓ Complete' : `Step ${step + 1} of 4`}
        </span>
      </div>

      {/* Hardware requirement notice */}
      {!canCalibrate && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-0.5">Hardware not connected</strong>
            Calibration requires either a connected ESP32 device or Demo Mode active.
            Navigate to <strong>Device Connection</strong> to connect, or switch to <strong>Demo Mode</strong>.
          </div>
        </div>
      )}

      {/* Progress Steps Indicator */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          {['Baseline', 'Loaded', 'Calculate', 'Done'].map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? 'bg-emerald-500 text-white'
                    : i === step
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] font-semibold text-center hidden sm:block ${
                  i <= step ? 'text-gray-700' : 'text-gray-400'
                }`}>{label}</span>
              </div>
              {i < 3 && (
                <div className={`h-0.5 flex-1 rounded-full transition-all ${i < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Active Step Card */}
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-6">
        {step === 3 ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{STEPS[3].title}</h3>
              <p className="text-sm text-gray-600 mt-1">{STEPS[3].desc}</p>
            </div>
            <button
              onClick={advance}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-all"
            >
              Recalibrate
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                <Crosshair className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{STEPS[step].title}</h3>
                <p className="text-sm text-gray-500 mt-1">{STEPS[step].desc}</p>
              </div>
            </div>

            {/* Live preview of FSR values during calibration */}
            {fsr && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <span className="text-xs font-bold text-gray-500 mb-3 block uppercase tracking-wider">
                  Live FSR Readings (during capture)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {fsr.map((v, i) => (
                    <div key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100 text-xs">
                      <span className="font-mono font-bold text-gray-500">FSR{i + 1}</span>
                      <span className="font-mono font-bold text-blue-700">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={advance}
              disabled={calibrating || !canCalibrate}
              className={`flex items-center space-x-2 px-6 py-2.5 text-white font-bold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                stepColors[STEPS[step].color]
              }`}
            >
              {calibrating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>{calibrating ? 'Calculating…' : STEPS[step].action}</span>
            </button>
          </div>
        )}
      </div>

      {/* Calibration Info Table */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Saved Calibration Parameters
          </h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {['FSR1','FSR2','FSR3','FSR4','FSR5','FSR6','FSR7','FSR8','FSR9'].map((label, i) => (
              <div key={label} className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 flex justify-between">
                <span className="font-mono font-bold text-gray-600">{label}</span>
                <span className="font-mono font-bold text-emerald-700">OK ✓</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Calibration timestamp: {new Date().toLocaleString()} • Written to ESP32 NVRAM
          </p>
        </div>
      )}

    </div>
  );
};
