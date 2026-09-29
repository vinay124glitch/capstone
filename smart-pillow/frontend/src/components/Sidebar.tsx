import React from 'react';
import { useSensorStore } from '../store/sensorStore';
import { 
  Radio, 
  Activity, 
  Zap, 
  FileText, 
  Wifi, 
  WifiOff,
  Cpu, 
  Crosshair, 
  Database, 
  Sliders, 
  Sparkles,
  ChevronRight,
  Moon
} from 'lucide-react';

export type PageTab = 
  | 'live' 
  | 'session' 
  | 'eeg' 
  | 'reports' 
  | 'connection' 
  | 'diagnostics' 
  | 'calibration' 
  | 'aitraining' 
  | 'settings';

interface SidebarProps {
  activeTab: PageTab;
  setActiveTab: (tab: PageTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  setCollapsed 
}) => {
  const { activeMode, isDeviceConnected, isRecording } = useSensorStore();

  /** Device is truly online only in hardware mode with an active physical hardware connection */
  const isOnline = activeMode === 'hardware' && isDeviceConnected;
  const isDemo = activeMode === 'demo';

  const navItems: {
    id: PageTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
    badgeVariant?: 'rec' | 'live' | 'online' | 'offline' | 'demo';
  }[] = [
    { id: 'live', label: 'Dashboard', icon: Radio, badge: 'Live', badgeVariant: 'live' },
    { id: 'session', label: 'Sleep Session', icon: Activity, ...(isRecording ? { badge: 'REC', badgeVariant: 'rec' as const } : {}) },
    { id: 'eeg', label: 'EEG Lab', icon: Zap },
    { id: 'reports', label: 'Reports & History', icon: FileText },
    {
      id: 'connection',
      label: 'Device Connection',
      icon: isOnline ? Wifi : WifiOff,
      badge: isDemo ? 'DEMO' : isOnline ? 'ONLINE' : 'OFFLINE',
      badgeVariant: isDemo ? 'demo' : isOnline ? 'online' : 'offline',
    },
    { id: 'diagnostics', label: 'Diagnostics', icon: Cpu },
    { id: 'calibration', label: 'Calibration', icon: Crosshair },
    { id: 'aitraining', label: 'AI Training', icon: Database },
    { id: 'settings', label: 'Settings', icon: Sliders },
  ];

  const badgeClass = (variant?: string) => {
    switch (variant) {
      case 'rec':    return 'bg-rose-100 text-rose-700 animate-pulse';
      case 'live':   return 'bg-emerald-100 text-emerald-800';
      case 'online': return 'bg-emerald-100 text-emerald-700 border border-emerald-300';
      case 'offline':return 'bg-rose-100 text-rose-700 border border-rose-200';
      case 'demo':   return 'bg-purple-100 text-purple-700 border border-purple-200';
      default:       return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <aside 
      className={`hidden md:flex flex-col bg-white border-r border-gray-200/80 transition-all duration-300 z-40 sticky top-0 h-screen ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-sm">
              <Moon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-gray-900 leading-tight">
                SmartPillow
              </h1>
              <span className="text-[10px] text-gray-500 font-medium block">
                Sleep & Brainwave AI
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2 bg-blue-600 rounded-xl text-white mx-auto shadow-sm">
            <Moon className="w-5 h-5 fill-current" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all hidden lg:block"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronRight className={`w-4 h-4 transform transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 flex-shrink-0 ${
                  isActive ? 'text-blue-600' : 
                  item.id === 'connection' && !isOnline && !isDemo 
                    ? 'text-rose-400 group-hover:text-rose-600' 
                    : 'text-gray-400 group-hover:text-gray-600'
                }`} />
                {!collapsed && <span>{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass(item.badgeVariant)}`}>
                  {item.badge}
                </span>
              )}

              {/* Collapsed mode: show dot indicator for connection status */}
              {collapsed && item.id === 'connection' && (
                <span className={`absolute right-2 top-2 w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-500' : isDemo ? 'bg-purple-400' : 'bg-rose-500'
                }`} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Status */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-500 font-medium">Mode:</span>
            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] border uppercase ${
              activeMode === 'hardware'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-purple-50 text-purple-700 border-purple-200'
            }`}>
              {activeMode}
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-500 font-medium">Device:</span>
            <span className={`font-bold flex items-center gap-1 ${
              isOnline ? 'text-emerald-700' : isDemo ? 'text-purple-600' : 'text-rose-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : isDemo ? 'bg-purple-400' : 'bg-rose-500'
              }`} />
              {isOnline ? 'Online' : isDemo ? 'Simulated' : 'Offline'}
            </span>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-gray-400 leading-tight pt-1 border-t border-gray-100 mt-1">
            Academic prototype only. Not a medical device.
          </p>
        </div>
      )}
    </aside>
  );
};
