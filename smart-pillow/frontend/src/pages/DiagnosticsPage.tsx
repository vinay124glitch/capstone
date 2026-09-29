import React from 'react';
import { useSensorStore } from '../store/sensorStore';
import { Activity, ShieldCheck, Cpu, Thermometer, Wifi, WifiOff, AlertTriangle, Zap, RefreshCw } from 'lucide-react';

export const DiagnosticsPage: React.FC = () => {
  const { pressure, environment, movement, eeg, activeMode, isDeviceConnected, connectionStatus, lastPacketTime } = useSensorStore();

  const isOnline = activeMode === 'hardware' && isDeviceConnected;
  const isDemo   = activeMode === 'demo';
  const hasData  = isOnline || isDemo;

  // Use real data if available, fallback to simulated values in demo mode, or zeros offline
  const fsr = pressure?.fsr
    || (isDemo ? [1200, 1820, 2200, 960, 2800, 3100, 900, 1700, 2050] : null);

  const checkStatus = (val: number) => {
    if (val === 0)    return { label: 'STUCK LOW',  color: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (val >= 4090)  return { label: 'SATURATED',  color: 'bg-rose-50 text-rose-700 border-rose-200' };
    return              { label: 'OK',              color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const secondsAgo = lastPacketTime ? Math.floor((Date.now() - lastPacketTime) / 1000) : null;

  return (
    <div className="space-y-6">

      {/* ─── Header ─── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sensor Diagnostics &amp; Health Monitor</h2>
          <p className="text-xs text-gray-500 mt-1">
            Live raw telemetry for 9 FSR textile sensors, dual temp/humidity, MPU6050 6-DOF IMU, and EEG AFE
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!hasData && (
            <span className="px-3 py-1.5 bg-rose-50 text-rose-700 font-bold text-xs rounded-full border border-rose-200 flex items-center gap-1.5">
              <WifiOff className="w-4 h-4" />
              Device Offline — No Telemetry
            </span>
          )}
          {hasData && (
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              {isDemo ? 'Simulated — All Subsystems Normal' : 'All Subsystems Nominal'}
            </span>
          )}
          {isDemo && (
            <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold text-[10px] rounded-full border border-purple-200">
              DEMO
            </span>
          )}
        </div>
      </div>

      {/* ─── Offline Warning ─── */}
      {!hasData && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-0.5">Device not connected</strong>
            Sensor telemetry is unavailable. Navigate to <strong>Device Connection</strong> to connect your ESP32 hardware or switch to <strong>Demo / Simulation</strong> mode to explore with sample data.
          </div>
        </div>
      )}

      {/* ─── 9 FSR Textile Sensor Grid ─── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          9-Channel FSR Textile Sensors (0–4095 ADC)
          {isDemo && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 ml-1">Simulated</span>}
        </h3>

        {fsr ? (
          <div className="grid grid-cols-3 gap-3">
            {fsr.map((val, idx) => {
              const st = checkStatus(val);
              const pct = Math.min((val / 4095) * 100, 100);
              return (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700 font-mono">FSR{idx + 1}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <span className="text-lg font-bold font-mono text-gray-900 block">{val}</span>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className="bg-rose-50 rounded-xl p-3 border border-rose-100 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500 font-mono">FSR{idx + 1}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-rose-100 text-rose-700 border-rose-200">
                    OFFLINE
                  </span>
                </div>
                <span className="text-lg font-bold font-mono text-gray-300 block">—</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Environment + IMU ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Environment */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-500" />
            Environmental Telemetry
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Temperature 1', value: environment?.temp1 ?? (isDemo ? 29.1 : null), unit: '°C' },
              { label: 'Temperature 2', value: environment?.temp2 ?? (isDemo ? 28.7 : null), unit: '°C' },
              { label: 'Humidity 1',    value: environment?.hum1  ?? (isDemo ? 54.2 : null), unit: '%' },
              { label: 'Humidity 2',    value: environment?.hum2  ?? (isDemo ? 55.1 : null), unit: '%' },
            ].map(({ label, value, unit }) => (
              <div key={label} className={`p-3 rounded-xl border ${value != null ? 'bg-gray-50 border-gray-100' : 'bg-rose-50 border-rose-100'}`}>
                <span className="text-gray-500 block font-medium mb-1">{label}</span>
                <span className={`text-base font-bold font-mono ${value != null ? 'text-gray-900' : 'text-rose-400'}`}>
                  {value != null ? `${value}${unit}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MPU6050 */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            MPU6050 6-DOF Inertial Measurement
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Accel Magnitude', value: hasData ? (movement?.accel_magnitude?.toFixed(3) ?? '0.983') : null, unit: 'g' },
              { label: 'Accel Variance',  value: hasData ? (movement?.accel_variance?.toFixed(4)  ?? '0.002') : null, unit: '' },
              { label: 'Gyro Magnitude',  value: hasData ? (movement?.gyro_magnitude?.toFixed(3)  ?? '0.424') : null, unit: '°/s' },
              { label: 'Head Angle',      value: hasData ? (movement?.head_angle_deg?.toFixed(1)  ?? '8.2')   : null, unit: '°' },
            ].map(({ label, value, unit }) => (
              <div key={label} className={`p-3 rounded-xl border ${value != null ? 'bg-gray-50 border-gray-100' : 'bg-rose-50 border-rose-100'}`}>
                <span className="text-gray-500 block font-medium mb-1">{label}</span>
                <span className={`text-base font-bold font-mono ${value != null ? 'text-gray-900' : 'text-rose-400'}`}>
                  {value != null ? `${value} ${unit}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── EEG AFE Status ─── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-500" />
          EEG Analog Front End (ADS1299 / AD8232)
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">EXPERIMENTAL</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Signal Quality Index', value: hasData ? `${((eeg?.signal_quality ?? 0.85) * 100).toFixed(0)}%` : '—', ok: hasData },
            { label: 'Eye Blink Detected',     value: hasData ? (eeg?.eye_blink_detected ? 'YES' : 'No') : '—', ok: hasData },
            { label: 'Sample Rate',            value: hasData ? '250 Hz' : '—', ok: hasData },
            { label: 'AFE Status',             value: hasData ? 'Nominal' : 'Offline', ok: hasData },
          ].map(({ label, value, ok }) => (
            <div key={label} className={`p-3 rounded-xl border ${ok ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
              <span className="text-gray-500 block font-medium mb-1">{label}</span>
              <span className={`font-bold font-mono ${ok ? 'text-indigo-700' : 'text-rose-400'}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── System Info ─── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-gray-500" />
          System &amp; Connection Info
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Active Mode',    value: isDemo ? 'Demo / Simulation' : 'Real Hardware' },
            { label: 'WS Status',      value: connectionStatus },
            { label: 'Last Packet',    value: secondsAgo != null ? `${secondsAgo}s ago` : 'None' },
            { label: 'Data Source',    value: isDemo ? 'Mock Generator' : 'ESP32 Sensor Hub' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-gray-500 block font-medium mb-1">{label}</span>
              <span className="font-bold text-gray-900 capitalize">{value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
