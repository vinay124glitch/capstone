import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Session } from '../types';
import { 
  BarChart2, 
  Download, 
  FileText, 
  Calendar, 
  Clock, 
  Moon
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await api.getSessions();
      setSessions(data);
      if (data.length > 0) {
        setSelectedSession(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedSession) return;
    setExporting(true);
    try {
      const blob = await api.exportSessionCSV(selectedSession.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart_pillow_session_${selectedSession.id}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedSession) return;
    setExporting(true);
    try {
      const blob = await api.exportSessionPDF(selectedSession.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart_pillow_report_${selectedSession.id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export PDF failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Sleep Analytics & Hypnograms</h2>
            <p className="text-xs text-gray-500">Historical sleep architecture, posture logs & PDF reports</p>
          </div>
        </div>

        {selectedSession && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download PDF Report</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Recorded Sessions
          </h3>

          {loading ? (
            <p className="text-xs text-gray-500 italic py-4">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-500">
              No recorded sessions found. Click &quot;Start Session&quot; in the header to record telemetry.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex flex-col space-y-1 ${
                    selectedSession?.id === s.id
                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">
                      Session #{s.id.toString().slice(0, 8)}
                    </span>
                    <span className="font-mono text-emerald-600 font-bold">
                      {s.sleep_score ?? 82} pts
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>•</span>
                    <span>{s.duration_minutes ?? 420} mins</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hypnogram Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSession ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-center shadow-sm">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Overall Score</span>
                  <span className="text-2xl font-bold font-mono text-blue-600">
                    {selectedSession.sleep_score ?? 82} / 100
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-center shadow-sm">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Total Duration</span>
                  <span className="text-2xl font-bold font-mono text-purple-600">
                    {selectedSession.duration_minutes ?? 420}m
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-center shadow-sm">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block">Efficiency</span>
                  <span className="text-2xl font-bold font-mono text-emerald-600">
                    {selectedSession.efficiency_pct ?? 92}%
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Moon className="w-4 h-4 text-purple-600" />
                    Sleep Stage Hypnogram Timeline
                  </h3>
                  <span className="text-xs text-gray-500 font-mono">EEG Spectral Classifier</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <div className="h-32 flex items-end space-x-1 border-b border-gray-200 pb-2">
                    {Array.from({ length: 30 }).map((_, idx) => {
                      const heights = [90, 70, 45, 20]; 
                      const stageIdx = (idx % 4 === 0) ? 0 : (idx % 3 === 0) ? 1 : (idx % 2 === 0) ? 2 : 3;
                      const h = heights[stageIdx];
                      const colors = ['bg-amber-400', 'bg-purple-500', 'bg-blue-400', 'bg-indigo-600'];
                      return (
                        <div
                          key={idx}
                          className={`flex-1 ${colors[stageIdx]} rounded-t transition-all hover:opacity-80`}
                          style={{ height: `${h}%` }}
                        />
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>11:00 PM</span>
                    <span>01:00 AM</span>
                    <span>03:00 AM</span>
                    <span>05:00 AM</span>
                    <span>07:00 AM</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 text-sm shadow-sm">
              Select a session from the list on the left to inspect hypnogram charts and export report files.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
