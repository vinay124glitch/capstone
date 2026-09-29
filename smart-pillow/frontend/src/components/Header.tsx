import React, { useState } from 'react';
import { useSensorStore } from '../store/sensorStore';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { api } from '../services/api';
import { PageTab } from './Sidebar';
import { 
  Activity, 
  Cpu, 
  Play, 
  Square, 
  Wifi, 
  Radio, 
  FileText, 
  Zap, 
  Sliders, 
  Database, 
  Crosshair, 
  Sparkles,
  Menu,
  X,
  ChevronRight,
  WifiOff
} from 'lucide-react';

interface HeaderProps {
  activeTab: PageTab;
  setActiveTab: (tab: PageTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { 
    activeMode, 
    connectionStatus, 
    isDeviceConnected,
    isRecording, 
    sessionId, 
    setActiveMode, 
    setRecording,
    setSessionId
  } = useSensorStore();

  const elapsedTime = useSessionTimer();
  const [loadingMode, setLoadingMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isConnected = isDeviceConnected;

  const toggleMode = async () => {
    const targetMode = activeMode === 'demo' ? 'hardware' : 'demo';
    setLoadingMode(true);
    try {
      await api.setMode(targetMode);
      setActiveMode(targetMode);
    } catch (err) {
      console.error('Failed to toggle mode:', err);
    } finally {
      setLoadingMode(false);
    }
  };

  const handleStartSession = async () => {
    try {
      const resp = await api.startSession();
      setSessionId(resp.session_id);
      setRecording(true);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  };

  const handleStopSession = async () => {
    if (!sessionId) return;
    try {
      await api.stopSession(sessionId);
      setRecording(false);
      setSessionId(null);
    } catch (err) {
      console.error('Failed to stop session:', err);
    }
  };

  const getPageTitle = (tab: PageTab) => {
    switch (tab) {
      case 'live': return 'Dashboard';
      case 'session': return 'Sleep Session';
      case 'eeg': return 'EEG Lab — Experimental';
      case 'reports': return 'Reports & History';
      case 'connection': return 'Device Connection';
      case 'diagnostics': return 'Sensor Diagnostics';
      case 'calibration': return 'Sensor Calibration Wizard';
      case 'aitraining': return 'AI Training Data Collector';
      case 'settings': return 'System Settings';
      default: return 'Smart Pillow';
    }
  };

  const navItems: { id: PageTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'live', label: 'Dashboard', icon: Radio },
    { id: 'session', label: 'Sleep Session', icon: Activity },
    { id: 'eeg', label: 'EEG Lab', icon: Zap },
    { id: 'reports', label: 'Reports & History', icon: FileText },
    { id: 'connection', label: 'Device Connection', icon: Wifi },
    { id: 'diagnostics', label: 'Diagnostics', icon: Cpu },
    { id: 'calibration', label: 'Calibration', icon: Crosshair },
    { id: 'aitraining', label: 'AI Training', icon: Database },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200/80 text-gray-900 px-4 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Page Title & Status Indicator */}
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg sm:text-xl tracking-tight text-gray-900">
                {getPageTitle(activeTab)}
              </h1>
              
              {/* Device Status Badge - Online if connected, Offline if disconnected */}
              {activeMode === 'hardware' ? (
                isConnected ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Online
                  </span>
                ) : (
                  <span className="bg-rose-100 text-rose-800 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                    <WifiOff className="w-3 h-3 text-rose-600" />
                    Offline
                  </span>
                )
              ) : (
                <span className="bg-purple-100 text-purple-800 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                  Demo Mode
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls: Mode Switcher & Session Button */}
        <div className="flex items-center space-x-2.5">
          {/* Mode Switcher */}
          <button
            onClick={toggleMode}
            disabled={loadingMode}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              activeMode === 'demo'
                ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {activeMode === 'demo' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Demo Mode</span>
                <span className="sm:hidden">Demo</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">ESP32 Hardware</span>
                <span className="sm:hidden">ESP32</span>
              </>
            )}
          </button>

          {/* Start / Stop Session Button */}
          {!isRecording ? (
            <button
              onClick={handleStartSession}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Start Session</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1">
              <div className="flex items-center space-x-1.5 text-xs text-rose-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-mono">{elapsedTime}</span>
              </div>
              <button
                onClick={handleStopSession}
                className="p-1 hover:bg-rose-100 rounded text-rose-600 transition-all"
                title="Stop Session"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 transition-all"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200 bg-white grid grid-cols-2 gap-2 text-xs font-medium pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4 text-blue-600" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
