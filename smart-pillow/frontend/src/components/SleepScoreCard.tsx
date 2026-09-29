import React from 'react';
import { useSensorStore } from '../store/sensorStore';
import { Moon, Award, Activity } from 'lucide-react';

export const SleepScoreCard: React.FC = () => {
  const { sleepScore, eeg, movement } = useSensorStore();

  const score = sleepScore?.overall_score ?? sleepScore?.score ?? 82;
  const stage = eeg?.sleep_stage || 'Deep Sleep (N3)';
  const efficiency = sleepScore?.sleep_efficiency_pct ?? 92;

  // Circular gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Sleep score</h3>
          <p className="text-xs text-gray-500">Live quality index</p>
        </div>

        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
          {stage}
        </span>
      </div>

      {/* Circle Gauge */}
      <div className="flex items-center justify-around bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-gray-200"
              strokeWidth="9"
              fill="transparent"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-blue-600 transition-all duration-1000 ease-out"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold font-mono text-gray-900">
              {score}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <span className="text-gray-500 block text-[10px] font-semibold uppercase">Efficiency</span>
            <span className="font-mono font-bold text-gray-900 text-sm">{efficiency.toFixed(0)}%</span>
          </div>

          <div>
            <span className="text-gray-500 block text-[10px] font-semibold uppercase">Restlessness</span>
            <span className="font-mono font-bold text-emerald-600 text-sm">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
};
