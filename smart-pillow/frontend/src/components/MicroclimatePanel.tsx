import React from 'react';
import { useSensorStore } from '../store/sensorStore';
import { Thermometer, Droplets, Wind, Sparkles } from 'lucide-react';

export const MicroclimatePanel: React.FC = () => {
  const { env } = useSensorStore();

  const temp = env?.temperature_c ?? env?.avg_temp ?? 29.4;
  const humidity = env?.humidity_pct ?? env?.avg_hum ?? 52;
  const voc = env?.air_quality_index ?? 95;
  const comfort = env?.comfort_score ?? 88;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Microclimate</h3>
          <p className="text-xs text-gray-500">Core thermal telemetry</p>
        </div>

        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Comfort: {comfort}/100
        </span>
      </div>

      {/* Grid of Telemetry */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Temp</span>
          <div className="flex items-baseline space-x-0.5 mt-1">
            <span className="text-xl font-bold font-mono text-gray-900">{temp.toFixed(1)}</span>
            <span className="text-xs text-gray-500">°C</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-100 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Humidity</span>
          <div className="flex items-baseline space-x-0.5 mt-1">
            <span className="text-xl font-bold font-mono text-gray-900">{humidity.toFixed(0)}</span>
            <span className="text-xs text-gray-500">%</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-100 p-3.5 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Air Quality</span>
          <div className="flex items-baseline space-x-0.5 mt-1">
            <span className="text-xl font-bold font-mono text-gray-900">{voc}</span>
            <span className="text-xs text-gray-500">AQI</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center space-x-2 text-xs text-gray-600">
        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Optimal pillow thermal zone.</span>
      </div>
    </div>
  );
};
