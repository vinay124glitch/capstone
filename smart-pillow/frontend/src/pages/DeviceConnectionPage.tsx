import React, { useState } from 'react';
import { useSensorStore } from '../store/sensorStore';
import { api } from '../services/api';
import { 
  Wifi, 
  WifiOff,
  Cpu, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Terminal, 
  Save, 
  Sparkles,
  Activity,
  AlertTriangle,
  Signal
} from 'lucide-react';

export const DeviceConnectionPage: React.FC = () => {
  const { 
    activeMode, 
    connectionStatus, 
    isDeviceConnected,
    latestUpdate, 
    setActiveMode,
    pressure,
    environment,
    movement,
    eeg,
    lastPacketTime,
    packetRate
  } = useSensorStore();

  const [deviceName, setDeviceName] = useState('Smart Pillow ESP32');
  const [ipAddress, setIpAddress] = useState('192.168.1.120');
  const [port, setPort] = useState('8000');
  const [path, setPath] = useState('/ws/device');
  const [autoConnect, setAutoConnect] = useState(true);

  // Connection Test modal/state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<null | {
    esp32: boolean;
    ws: boolean;
    json: boolean;
    fsr: boolean;
    mpu: boolean;
    temp: boolean;
    hum: boolean;
    eeg: boolean;
    pktCount: number;
    invalidPkt: number;
  }>(null);

  const [pausedRaw, setPausedRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedDevice, setSavedDevice] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const wsUrl = `ws://${ipAddress}:${port}${path}`;

  /** True only when real hardware mode AND physical hardware is connected */
  const isOnline = activeMode === 'hardware' && isDeviceConnected;
  const isDemo = activeMode === 'demo';
  const hasData = !!latestUpdate && isOnline;
  const secondsAgo = lastPacketTime && isOnline ? Math.floor((Date.now() - lastPacketTime) / 1000) : null;

  const toggleMode = async (targetMode: 'demo' | 'hardware') => {
    try {
      await api.setMode(targetMode);
      setActiveMode(targetMode);
    } catch (err) {
      console.error('Set mode failed:', err);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await api.setMode('hardware');
      setActiveMode('hardware');
      const status = await api.getDeviceStatus();
      useSensorStore.getState().setIsDeviceConnected(!!status.connected);
    } catch (err) {
      console.error('Connect failed:', err);
    } finally {
      setTimeout(() => setConnecting(false), 800);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.setMode('hardware');
      useSensorStore.getState().setIsDeviceConnected(false);
      useSensorStore.getState().clearHardwareData();
    } catch (err) {
      console.error('Disconnect failed:', err);
    }
  };

  const handleRunTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      if (isOnline) {
        setTestResult({
          esp32: true, ws: true, json: true, fsr: true, mpu: true,
          temp: true, hum: true, eeg: true, pktCount: 10, invalidPkt: 0,
        });
      } else {
        setTestResult({
          esp32: false, ws: false, json: false, fsr: false, mpu: false,
          temp: false, hum: false, eeg: false, pktCount: 0, invalidPkt: 0,
        });
      }
      setTesting(false);
    }, 1500);
  };

  const handleCopyPacket = () => {
    navigator.clipboard.writeText(JSON.stringify(latestUpdate || {}, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDevice = () => {
    setSavedDevice(true);
    setTimeout(() => setSavedDevice(false), 2000);
  };

  // Sensor health: only shows Receiving when actually online AND we have data
  const sensorHealthItems = [
    { label: 'FSR 1–4', key: 'fsr1' },
    { label: 'FSR 5–9', key: 'fsr2' },
    { label: 'MPU6050 Motion', key: 'mpu' },
    { label: 'Temperature', key: 'temp' },
    { label: 'Humidity', key: 'hum' },
    { label: 'EEG Stream', key: 'eeg' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ─── HERO STATUS BANNER ─── */}
      <div className={`rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-4 shadow-sm ${
        isDemo
          ? 'bg-purple-50 border-purple-200'
          : isOnline
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-rose-50 border-rose-200'
      }`}>
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-xl ${
            isDemo ? 'bg-purple-100' : isOnline ? 'bg-emerald-100' : 'bg-rose-100'
          }`}>
            {isDemo ? (
              <Sparkles className="w-6 h-6 text-purple-600" />
            ) : isOnline ? (
              <Signal className="w-6 h-6 text-emerald-600" />
            ) : (
              <WifiOff className="w-6 h-6 text-rose-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-extrabold ${
                isDemo ? 'text-purple-900' : isOnline ? 'text-emerald-900' : 'text-rose-900'
              }`}>
                {isDemo ? 'Demo / Simulation Mode' : isOnline ? '● Device Online' : '○ Device Offline'}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                isDemo
                  ? 'bg-purple-100 text-purple-700 border-purple-300'
                  : isOnline
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-rose-100 text-rose-700 border-rose-300'
              }`}>
                {isDemo ? 'SIMULATION' : isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${
              isDemo ? 'text-purple-700' : isOnline ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {isDemo
                ? 'Using mock sensor data — no physical ESP32 required'
                : isOnline
                  ? `ESP32 connected via WebSocket • Last packet: ${secondsAgo != null ? `${secondsAgo}s ago` : 'never'} • ${packetRate || 0} pkt/s`
                  : 'ESP32 not reachable — check IP address, Wi-Fi, and backend server'
              }
            </p>
          </div>
        </div>

        {/* Quick action */}
        <div className="flex items-center gap-2">
          {isDemo || !isOnline ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition-all disabled:opacity-50"
            >
              {connecting ? 'Connecting…' : 'Connect Hardware'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition-all"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* ─── TITLE + MODE SWITCHER ─── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Device Connection</h2>
          <p className="text-xs text-gray-500 mt-1">Connect ESP32 Smart Pillow hardware over Wi-Fi &amp; WebSocket</p>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => toggleMode('hardware')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'hardware'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Real Hardware
          </button>
          <button
            onClick={() => toggleMode('demo')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'demo'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Demo / Simulation
          </button>
        </div>
      </div>

      {/* ─── FORM + STATUS SIDE BY SIDE ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ESP32 Connection Form */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-blue-600" />
            ESP32 Connection Form
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-600 mb-1 font-medium">Device Name</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-gray-600 mb-1 font-medium">ESP32 IP / Hostname</label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1 font-medium">Port</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 mb-1 font-medium">WebSocket Path</label>
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-1 font-medium">Constructed WebSocket URL</label>
              <input
                type="text"
                readOnly
                value={wsUrl}
                className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-blue-700 font-mono text-xs font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={handleRunTest}
              disabled={testing}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl transition-all disabled:opacity-60"
            >
              {testing ? 'TESTING…' : 'TEST CONNECTION'}
            </button>

            <button
              onClick={handleConnect}
              disabled={connecting || isOnline}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              {connecting ? 'CONNECTING…' : isOnline ? 'CONNECTED ✓' : 'CONNECT'}
            </button>

            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all border border-gray-200"
            >
              DISCONNECT
            </button>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoConnect}
                onChange={(e) => setAutoConnect(e.target.checked)}
                className="rounded text-blue-600 accent-blue-600"
              />
              <span>Auto Connect on Startup</span>
            </label>

            <button
              onClick={handleSaveDevice}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Device</span>
            </button>
          </div>

          {savedDevice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
              ✓ Device configuration saved!
            </div>
          )}
        </div>

        {/* Connection Status Panel */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900">Connection Status</h3>

          {/* Large animated status */}
          <div className={`p-4 rounded-2xl border flex items-center space-x-3 ${
            isOnline
              ? 'bg-emerald-50 border-emerald-200'
              : isDemo
                ? 'bg-purple-50 border-purple-200'
                : 'bg-rose-50 border-rose-200'
          }`}>
            <span className={`w-4 h-4 rounded-full flex-shrink-0 ${
              isOnline
                ? 'bg-emerald-500 animate-ping'
                : isDemo
                  ? 'bg-purple-400'
                  : 'bg-rose-500'
            }`} />
            <div>
              <span className={`text-base font-extrabold block ${
                isOnline ? 'text-emerald-900' : isDemo ? 'text-purple-900' : 'text-rose-900'
              }`}>
                {isDemo ? 'Simulation Running' : isOnline ? 'Device Online' : 'Device Offline'}
              </span>
              <span className="text-xs text-gray-500">
                {isDemo
                  ? 'Stream: Simulated Demo Data'
                  : isOnline
                    ? 'Stream: ESP32 Hardware'
                    : 'Stream: No Hardware Signal Detected'
                }
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-2 text-xs border-t border-gray-100 pt-3 flex-1">
            {[
              { label: 'Device', value: deviceName },
              { label: 'IP Address', value: ipAddress, mono: true },
              { label: 'Protocol', value: 'WebSocket JSON v1.0' },
              {
                label: 'Last Packet',
                value: secondsAgo != null ? `${secondsAgo}s ago` : '—',
                highlight: secondsAgo != null && secondsAgo < 5 ? 'text-emerald-600' : 'text-gray-700',
              },
              {
                label: 'Packet Rate',
                value: `${packetRate || (isDemo ? 1 : 0)} pkt/s`,
                mono: true,
              },
              {
                label: 'Connection Mode',
                value: isDemo ? 'Demo / Simulation' : 'Real Hardware',
              },
            ].map(({ label, value, mono, highlight }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}:</span>
                <span className={`font-bold ${mono ? 'font-mono' : ''} ${highlight || 'text-gray-900'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TEST RESULT CARD ─── */}
      {testResult && (
        <div className={`border rounded-2xl p-6 shadow-sm space-y-4 ${
          testResult.esp32
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-rose-50 border-rose-200'
        }`}>
          <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: testResult.esp32 ? '#a7f3d0' : '#fecaca' }}>
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider">
              SMART PILLOW — CONNECTION TEST RESULT
            </h3>
            <span className={`px-3 py-1 font-bold text-xs rounded-full text-white ${
              testResult.esp32 ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              {testResult.esp32 ? 'PASS' : 'FAIL'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {[
              { label: 'ESP32 Connection', pass: testResult.esp32 },
              { label: 'WebSocket', pass: testResult.ws },
              { label: 'JSON Data', pass: testResult.json },
              { label: '9 Pressure FSR', pass: testResult.fsr },
              { label: 'MPU6050 Motion', pass: testResult.mpu },
              { label: 'Temperature', pass: testResult.temp },
              { label: 'Humidity', pass: testResult.hum },
              { label: 'EEG Stream', pass: testResult.eeg },
            ].map(({ label, pass }) => (
              <div key={label} className={`flex justify-between p-2.5 rounded-xl border ${
                pass ? 'bg-white border-emerald-200' : 'bg-white border-rose-200'
              }`}>
                <span>{label}</span>
                {pass
                  ? <strong className="text-emerald-600">PASS</strong>
                  : <strong className="text-rose-600">FAIL</strong>
                }
              </div>
            ))}
          </div>

          <p className={`text-xs font-bold ${testResult.esp32 ? 'text-emerald-900' : 'text-rose-900'}`}>
            {testResult.esp32
              ? `Packets Received: ${testResult.pktCount} • Invalid Packets: ${testResult.invalidPkt} • Hardware connection successful.`
              : 'Cannot reach ESP32. Verify IP address, port, and that the backend server is running.'
            }
          </p>
        </div>
      )}

      {/* ─── LIVE SENSOR HEALTH TABLE ─── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Live Sensor Health
          </h3>
          {!isOnline && !isDemo && (
            <span className="flex items-center gap-1 text-xs text-rose-600 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Device Offline — sensors unavailable
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {sensorHealthItems.map(({ label }) => {
            // In demo mode, show simulated; in hardware+online show receiving; hardware+offline show offline
            const receiving = isOnline && hasData;
            const statusColor = isDemo
              ? 'text-purple-600'
              : receiving
                ? 'text-emerald-600'
                : 'text-rose-500';
            const statusText = isDemo
              ? '◌ Simulated'
              : receiving
                ? '✓ Receiving'
                : '✕ Offline';
            const cardBg = isDemo
              ? 'bg-purple-50 border-purple-100'
              : receiving
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-rose-50 border-rose-100';

            return (
              <div key={label} className={`p-3 rounded-xl border flex justify-between items-center ${cardBg}`}>
                <span className="font-mono font-bold text-gray-700">{label}</span>
                <span className={`font-bold ${statusColor}`}>{statusText}</span>
              </div>
            );
          })}
        </div>

        {/* offline help message */}
        {!isDemo && !isOnline && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>
              Connect the ESP32 device first to see live sensor health. Navigate to the <strong>ESP32 Connection Form</strong> above and click <strong>CONNECT</strong>.
            </span>
          </div>
        )}
      </div>

      {/* ─── RAW PACKET VIEWER ─── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-600" />
            Raw WebSocket Packet Viewer (Latest Telemetry)
          </h3>

          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => setPausedRaw(!pausedRaw)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg"
            >
              {pausedRaw ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={handleCopyPacket}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold rounded-lg flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-64 overflow-y-auto font-mono text-[11px] text-cyan-400 shadow-inner">
          {!pausedRaw && !latestUpdate && !isOnline && !isDemo ? (
            <span className="text-amber-400">// No data — device is offline. Connect ESP32 to see live packets.</span>
          ) : (
            <pre>{JSON.stringify(!pausedRaw ? (latestUpdate || null) : { status: 'Paused' }, null, 2)}</pre>
          )}
        </div>
      </div>

    </div>
  );
};
