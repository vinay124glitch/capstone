import React, { useState } from 'react';
import { Sliders, Save, RefreshCw, Database, Download } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [moveWeight, setMoveWeight] = useState(30);
  const [posWeight, setPosWeight] = useState(25);
  const [pressWeight, setPressWeight] = useState(25);
  const [tempWeight, setTempWeight] = useState(20);
  const [saved, setSaved] = useState(false);

  const totalWeight = moveWeight + posWeight + pressWeight + tempWeight;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">System & Experimental Settings</h2>
          <p className="text-xs text-gray-500 mt-1">Configure thresholds, sleep score weightings, and data management</p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm"
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </div>

      {/* Experimental Sleep Score Weights (Must total 100%) */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-gray-900">Experimental Sleep Score Component Weights</h3>
          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
            totalWeight === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            Total: {totalWeight}% (Must equal 100%)
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-gray-700">Movement Stability Weight</span>
              <span className="font-mono font-bold text-gray-900">{moveWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={moveWeight}
              onChange={(e) => setMoveWeight(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-gray-700">Position Stability Weight</span>
              <span className="font-mono font-bold text-gray-900">{posWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={posWeight}
              onChange={(e) => setPosWeight(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-gray-700">Pressure Stability Weight</span>
              <span className="font-mono font-bold text-gray-900">{pressWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={pressWeight}
              onChange={(e) => setPressWeight(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="font-medium text-gray-700">Temperature Stability Weight</span>
              <span className="font-mono font-bold text-gray-900">{tempWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={tempWeight}
              onChange={(e) => setTempWeight(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
          Settings saved successfully!
        </div>
      )}
    </div>
  );
};
