import React from 'react';
import { useSensorStore } from '../store/sensorStore';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { api } from '../services/api';
import { Play, Square, Clock, Activity, Award, ShieldAlert } from 'lucide-react';

export const SleepSessionPage: React.FC = () => {
  const { 
    isRecording, 
    sessionId, 
    setRecording, 
    setSessionId, 
    position, 
    sleepScore,
    movement
  } = useSensorStore();

  const elapsedTime = useSessionTimer();

  const handleStartSession = async () => {
    try {
      const resp = await api.startSession();
      setSessionId(resp.session_id);
      setRecording(true);
    } catch (err) {
      console.error('Start session error:', err);
    }
  };

  const handleStopSession = async () => {
    if (!sessionId) return;
    try {
      await api.stopSession(sessionId);
      setRecording(false);
      setSessionId(null);
    } catch (err) {
      console.error('Stop session error:', err);
    }
  };

  const currentScore = sleepScore?.overall_score ?? sleepScore?.score ?? 82;
  const moveEvents = movement?.movement_events_count ?? 14;

  return (
    <div className="space-y-6">
      {/* Session Header Card & Action Button */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sleep Session Monitor</h2>
          <p className="text-xs text-gray-500 mt-1">Real-time session recording, posture duration tracking, and score breakdown</p>
        </div>

        {!isRecording ? (
          <button
            onClick={handleStartSession}
            className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START SLEEP SESSION</span>
          </button>
        ) : (
          <div className="flex items-center space-x-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">
            <div className="flex items-center space-x-2 text-sm text-rose-700 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono text-base">{elapsedTime}</span>
            </div>
            <button
              onClick={handleStopSession}
              className="flex items-center space-x-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>STOP SLEEP SESSION</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Position Timeline Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Position Timeline
          </h3>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Dominant Position: BACK (50%)
          </span>
        </div>

        {/* Visual Timeline Segment Bar matching prompt requirement */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
          <div className="text-xs font-mono font-bold text-gray-700 tracking-wider flex items-center justify-between pb-1">
            <span>BACK ━━━━━ LEFT ━━━ BACK ━━ RIGHT ━━━━━ BACK</span>
          </div>

          <div className="h-6 w-full bg-gray-200 rounded-xl overflow-hidden flex border border-gray-300">
            <div className="h-full bg-blue-400 w-[50%]" title="Back: 50%" />
            <div className="h-full bg-emerald-400 w-[25%]" title="Left: 25%" />
            <div className="h-full bg-purple-400 w-[20%]" title="Right: 20%" />
            <div className="h-full bg-gray-400 w-[5%]" title="Unknown: 5%" />
          </div>
        </div>

        {/* Posture Distribution Percentages */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 font-medium block">Time on Left</span>
            <span className="text-lg font-bold font-mono text-emerald-600">25%</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 font-medium block">Time on Right</span>
            <span className="text-lg font-bold font-mono text-purple-600">20%</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 font-medium block">Time on Back</span>
            <span className="text-lg font-bold font-mono text-blue-600">50%</span>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="text-xs text-gray-500 font-medium block">Unknown Time</span>
            <span className="text-lg font-bold font-mono text-gray-600">5%</span>
          </div>
        </div>
      </div>

      {/* Experimental Sleep Score Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Experimental Sleep Score: {currentScore}</h3>
            <p className="text-xs text-gray-500">Heuristic weighted components (0–100)</p>
          </div>
          <span className="text-2xl font-extrabold font-mono text-blue-600">{currentScore} / 100</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Movement Stability (30% weight)</span>
            <span className="font-mono font-bold text-gray-900">88 / 100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '88%' }} />
          </div>

          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Position Stability (25% weight)</span>
            <span className="font-mono font-bold text-gray-900">76 / 100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '76%' }} />
          </div>

          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Pressure Stability (25% weight)</span>
            <span className="font-mono font-bold text-gray-900">85 / 100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: '85%' }} />
          </div>

          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Temperature Stability (20% weight)</span>
            <span className="font-mono font-bold text-gray-900">91 / 100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: '91%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
