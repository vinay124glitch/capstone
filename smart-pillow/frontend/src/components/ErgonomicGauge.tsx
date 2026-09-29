import React from 'react';
import { useSensorStore } from '../store/sensorStore';
import { UserCheck, ArrowUpRight } from 'lucide-react';

export const ErgonomicGauge: React.FC = () => {
  const { position, movement } = useSensorStore();

  const strainScore = position?.cervical_strain_score ?? 15;
  const isOptimal = strainScore < 30;
  const currentPos = position?.position || 'Left side';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Cervical Strain</h3>
          <p className="text-xs text-gray-500">IMU head-neck alignment</p>
        </div>

        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
          isOptimal 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {isOptimal ? 'Neutral Alignment' : 'Sub-optimal'}
        </span>
      </div>

      {/* Main Strain Score */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-gray-500">Strain Score</span>
          <div className="flex items-baseline space-x-1 mt-0.5">
            <span className={`text-3xl font-extrabold font-mono ${isOptimal ? 'text-emerald-600' : 'text-amber-600'}`}>
              {strainScore.toFixed(0)}
            </span>
            <span className="text-xs text-gray-400 font-mono">/ 100</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-gray-500 block font-semibold">Head Pitch Angle</span>
          <span className="font-mono font-bold text-gray-800 text-sm">
            {movement?.head_angle_deg ? `${movement.head_angle_deg.toFixed(1)}°` : '2.4°'}
          </span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs flex items-start space-x-2 text-purple-800">
        <ArrowUpRight className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <span>Neck height support is optimal for current posture ({currentPos}).</span>
      </div>
    </div>
  );
};
