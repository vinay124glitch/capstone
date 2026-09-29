import React from 'react';
import { useSensorStore } from '../store/sensorStore';
import { PressureHeatmap } from '../components/PressureHeatmap';
import { Wifi, Cpu, Activity, Clock, ShieldCheck, WifiOff } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { 
    connectionStatus, 
    isDeviceConnected,
    activeMode, 
    position, 
    sleepScore, 
    movement, 
    environment,
    lastPacketTime,
    packetRate
  } = useSensorStore();

  const isOnline = activeMode === 'hardware' && isDeviceConnected;
  const isHardwareNoData = activeMode === 'hardware' && !isOnline;

  const currentPos = isOnline && position?.position ? `${position.position} side` : (activeMode === 'demo' ? 'Left side' : 'NO DEVICE CONNECTED');
  const confidence = isOnline && position?.confidence ? (position.confidence * 100).toFixed(0) : (activeMode === 'demo' ? '94' : '0');
  const classifier = isOnline && position?.classifier_type === 'ml' ? 'Random Forest AI' : (activeMode === 'demo' ? 'Random Forest AI' : 'Rule-Based Classifier');
  const score = isOnline ? (sleepScore?.overall_score ?? sleepScore?.score ?? '—') : (activeMode === 'demo' ? 82 : '—');
  const moveCount = isOnline ? (movement?.movement_events_count ?? 0) : (activeMode === 'demo' ? 14 : 0);
  const temp = isOnline ? (environment?.temperature_c ?? environment?.avg_temp ?? null) : (activeMode === 'demo' ? 29.4 : null);
  const humidity = isOnline ? (environment?.humidity_pct ?? environment?.avg_hum ?? null) : (activeMode === 'demo' ? 52 : null);

  return (
    <div className="space-y-5">
      {/* Top Banner: Device Status */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${
            activeMode === 'hardware'
              ? (isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')
              : 'bg-purple-50 text-purple-600'
          }`}>
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-900 text-sm capitalize">
                {activeMode === 'hardware' ? (isOnline ? 'Hardware: Online (ESP32 Connected)' : 'Hardware: Offline') : 'Demo / Simulation Active'}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                activeMode === 'hardware' 
                  ? (isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200') 
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}>
                {activeMode === 'hardware' ? (isOnline ? 'REAL HARDWARE ONLINE' : 'REAL HARDWARE OFFLINE') : 'DEMO SIMULATION'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Packet Rate: <strong className="text-gray-700 font-mono">{isOnline ? (packetRate || 0) : 0} pkt/s</strong> • Last: {isOnline && lastPacketTime ? new Date(lastPacketTime).toLocaleTimeString() : 'None'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className={`px-3 py-1 font-semibold rounded-full border flex items-center gap-1.5 ${
            isHardwareNoData
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {isHardwareNoData ? <WifiOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {isHardwareNoData ? 'Device Offline — Waiting for ESP32' : 'Sensors Streaming'}
          </span>
        </div>
      </div>

      {/* TOP CARD SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Pressure Heatmap */}
        <PressureHeatmap />

        {/* Position & Sleep Score Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <span className="text-sm font-medium text-gray-500 block">Position</span>
            <span className={`text-2xl font-bold mt-1 block ${isHardwareNoData ? 'text-amber-600 text-lg' : 'text-gray-900'}`}>
              {currentPos}
            </span>
            <span className="text-xs text-gray-400 mt-1 block">
              Confidence: {confidence}% • {classifier}
            </span>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-500 block">Sleep score</span>
            <span className="text-3xl font-extrabold text-gray-900 font-mono mt-1 block">
              {score}
            </span>
          </div>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <span className="text-xs font-medium text-gray-500 block">Moves</span>
          <span className="text-xl font-bold font-mono text-gray-900 mt-1 block">{moveCount}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <span className="text-xs font-medium text-gray-500 block">Temp</span>
          <span className="text-xl font-bold font-mono text-gray-900 mt-1 block">
            {temp != null ? `${temp.toFixed(1)}°C` : '—'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <span className="text-xs font-medium text-gray-500 block">Humidity</span>
          <span className="text-xl font-bold font-mono text-gray-900 mt-1 block">
            {humidity != null ? `${humidity.toFixed(0)}%` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
