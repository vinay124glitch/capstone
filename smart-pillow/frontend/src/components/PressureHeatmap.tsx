import React, { useMemo } from 'react';
import { useSensorStore } from '../store/sensorStore';
import { getFsrColor } from '../utils';
import { Focus, WifiOff } from 'lucide-react';

export const PressureHeatmap: React.FC = () => {
  const { pressure, activeMode } = useSensorStore();

  const isHardwareNoData = activeMode === 'hardware' && (!pressure || !pressure.matrix);

  const grid = pressure?.matrix || (activeMode === 'demo' ? [
    [100, 150, 120],
    [200, 850, 300],
    [90, 210, 110]
  ] : [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]);

  const cop = useMemo(() => {
    let totalMass = 0;
    let sumX = 0;
    let sumY = 0;

    const rows = grid.length;
    const cols = grid[0]?.length || 3;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        totalMass += val;
        sumX += c * val;
        sumY += r * val;
      }
    }

    if (totalMass === 0) return { x: 50, y: 50 };
    const avgX = sumX / totalMass;
    const avgY = sumY / totalMass;
    return {
      x: (avgX / (cols - 1)) * 100,
      y: (avgY / (rows - 1)) * 100
    };
  }, [grid]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Pressure heatmap</h3>
          <p className="text-xs text-gray-500">
            {activeMode === 'hardware' ? 'ESP32 Real Hardware FSR Telemetry' : 'Simulated Pressure Matrix'}
          </p>
        </div>

        <span className="text-xs font-mono text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          Max: {pressure?.max_pressure ?? 0} / 1024
        </span>
      </div>

      {/* Main Heatmap Grid Container */}
      <div className="relative aspect-video max-w-sm mx-auto w-full bg-gray-50/60 rounded-2xl border border-gray-200/60 p-4 shadow-inner flex flex-col justify-between">
        
        {/* Waiting for Hardware Data Overlay */}
        {isHardwareNoData ? (
          <div className="absolute inset-0 z-30 bg-white/90 rounded-2xl flex flex-col items-center justify-center text-center p-4">
            <WifiOff className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
            <strong className="text-xs font-bold text-gray-900">Waiting for ESP32 Hardware Stream...</strong>
            <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
              Real hardware mode active. Connect physical ESP32 to <code className="text-blue-600 font-mono">ws://localhost:8000/ws/device</code> to stream live data.
            </p>
          </div>
        ) : null}

        {/* CoP Crosshair Indicator */}
        {pressure?.total_pressure && pressure.total_pressure > 50 ? (
          <div 
            className="absolute z-20 transition-all duration-300 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${cop.x}%`, top: `${cop.y}%` }}
          >
            <Focus className="w-7 h-7 text-blue-600 animate-pulse drop-shadow-md" />
          </div>
        ) : null}

        {/* Dynamic Grid Cells */}
        <div className="grid grid-cols-3 gap-3 h-full relative z-10">
          {grid.map((row, rIdx) =>
            row.map((val, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                className="relative rounded-xl flex flex-col items-center justify-center transition-all duration-300 border border-gray-200/50 shadow-sm"
                style={{
                  backgroundColor: getFsrColor(val),
                  boxShadow: val > 500 ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                <span className={`text-[11px] font-mono font-bold ${val > 500 ? 'text-white' : 'text-gray-700'}`}>
                  {val}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-center pt-3 border-t border-gray-100">
        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Balance</span>
          <span className="text-xs font-mono font-bold text-gray-800">
            {pressure?.left_right_balance || '—'}
          </span>
        </div>

        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Hotspot Detection</span>
          <span className="text-xs font-mono font-bold text-emerald-600">
            {pressure?.peak_hotspot_detected ? 'Alert' : 'Normal'}
          </span>
        </div>
      </div>
    </div>
  );
};
