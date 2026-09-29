import React, { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Sidebar, PageTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/Dashboard';
import { SleepSessionPage } from './pages/SleepSession';
import { EEGLabPage } from './pages/EEGLab';
import { DeviceConnectionPage } from './pages/DeviceConnectionPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { AITrainingPage } from './pages/AITrainingPage';
import { SettingsPage } from './pages/SettingsPage';
import { AnalyticsView } from './components/AnalyticsView';

export function App() {
  // Initialize WebSocket stream connection
  useWebSocket();

  const [activeTab, setActiveTab] = useState<PageTab>('live');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans flex">
      
      {/* Desktop Left Sidebar Drawer */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-6">
        
        {/* Top Header Action Bar */}
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Page Component Render */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
          {activeTab === 'live' && <DashboardPage />}
          {activeTab === 'session' && <SleepSessionPage />}
          {activeTab === 'eeg' && <EEGLabPage />}
          {activeTab === 'reports' && <AnalyticsView />}
          {activeTab === 'connection' && <DeviceConnectionPage />}
          {activeTab === 'diagnostics' && <DiagnosticsPage />}
          {activeTab === 'calibration' && <CalibrationPage />}
          {activeTab === 'aitraining' && <AITrainingPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-gray-200 bg-white py-4 px-6 text-center text-xs text-gray-500">
          <p>SmartPillow — Sleep & Brainwave Monitor • Biomedical Engineering Capstone Project • 2026</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
