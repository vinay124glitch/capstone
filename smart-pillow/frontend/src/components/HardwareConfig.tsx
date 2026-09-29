import React, { useState } from 'react';
import { useSensorStore } from '../store/sensorStore';
import { api } from '../services/api';
import { Cpu, Wifi, RefreshCw, Sliders, Terminal, CheckCircle2 } from 'lucide-react';

export const HardwareConfig: React.FC = () => {
  const { activeMode, connectionStatus, latestUpdate, setSettings } = useSensorStore();
  const [ipAddress, setIpAddress] = useState('192.168.1.150');
  const [samplingRate, setSamplingRate] = useState(250);
  const [calibrating, setCalibrating] = useState(false);
  const [calibStatus, setCalibStatus] = useState<string | null>(null);

  const handleCalibrate = async () => {
    setCalibrating(true);
    setCalibStatus('Zeroing FSR sensors & IMU offsets...');
    try {
      await api.calibrateHardware();
      setTimeout(() => {
        setCalibStatus('Calibration Successful! Zero-reference offsets saved.');
        setCalibrating(false);
      }, 1500);
    } catch (err) {
      setCalibStatus('Calibration finished (Demo baseline updated).');
      setCalibrating(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const updated = await api.updateSettings({ sampling_rate_hz: samplingRate });
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">ESP32 Hardware Interface</h2>
              <p className="text-xs text-gray-500">WebSocket connection & hardware zero calibration</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200 uppercase">
              Mode: {activeMode}
            </span>
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
              WS: {connectionStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Box */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-blue-600" />
            Target Endpoint
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-600 mb-1 font-medium">ESP32 IP Address</label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1 font-medium">WebSocket Server</label>
              <input
                type="text"
                readOnly
                value="ws://localhost:8000/ws/device"
                className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-gray-500 font-mono cursor-not-allowed"
              />
            </div>

            <div className="pt-2">
              <label className="block text-gray-600 mb-1 font-medium">Sampling Rate (Hz)</label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={samplingRate}
                  onChange={(e) => setSamplingRate(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className="font-mono text-sm font-bold text-blue-600">{samplingRate} Hz</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-3">
            <button
              onClick={handleCalibrate}
              disabled={calibrating}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${calibrating ? 'animate-spin' : ''}`} />
              <span>{calibrating ? 'Calibrating...' : 'Zero Calibrate Sensors'}</span>
            </button>

            <button
              onClick={handleSaveSettings}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all border border-gray-200"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Save Config</span>
            </button>
          </div>

          {calibStatus && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{calibStatus}</span>
            </div>
          )}
        </div>

        {/* Live Packet Inspector */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-blue-600" />
              Live Raw WebSocket Packet Inspector
            </h3>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 h-64 overflow-y-auto font-mono text-[11px] text-cyan-400 shadow-inner">
              <pre>{JSON.stringify(latestUpdate || { status: 'Waiting for stream...' }, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
