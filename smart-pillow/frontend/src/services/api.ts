/**
 * API service: all HTTP calls to the FastAPI backend.
 */
import type { Session, AppSettings } from '../types';

const BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Health & Device status
export const getHealth = () => request<{ status: string }>('/api/health');
export const getDeviceStatus = () =>
  request<{ connected: boolean; mode: string; packet_rate: number; uptime_seconds: number }>(
    '/api/device/status'
  );

// Mode & Mock control
export const setMode = (mode: 'demo' | 'hardware') =>
  request<{ status: string; mode: string }>('/api/mode', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });

export const startMock = () => request('/api/mock/start', { method: 'POST' });
export const stopMock = () => request('/api/mock/stop', { method: 'POST' });
export const setMockPosition = (position: string) =>
  request(`/api/mock/position/${position}`, { method: 'POST' });

// Sessions
export const startSession = (notes = '') =>
  request<{ session_id: string; status: string }>('/api/session/start', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });

export const stopSession = (sessionId: string | number) =>
  request<{ status: string; session_id: string }>(`/api/session/stop`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });

export const getCurrentSession = () => request<Session>('/api/session/current');
export const getSessions = (limit = 50) =>
  request<Session[]>(`/api/sessions?limit=${limit}`);
export const getSession = (id: string | number) => request<Session>(`/api/sessions/${id}`);
export const deleteSession = (id: string | number) =>
  request(`/api/sessions/${id}`, { method: 'DELETE' });

// File Export Handlers
export const exportSessionCSV = async (sessionId: string | number): Promise<Blob> => {
  const res = await fetch(`${BASE}/api/export/session/${sessionId}/csv`);
  if (!res.ok) throw new Error('Failed to export CSV');
  return res.blob();
};

export const exportSessionPDF = async (sessionId: string | number): Promise<Blob> => {
  const res = await fetch(`${BASE}/api/export/session/${sessionId}/pdf`);
  if (!res.ok) throw new Error('Failed to export PDF');
  return res.blob();
};

// Calibration & Settings
export const calibrateHardware = () =>
  request<{ status: string; offsets: number[] }>('/api/hardware/calibrate', { method: 'POST' });

export const getSettings = () => request<AppSettings>('/api/settings');
export const updateSettings = (data: Partial<AppSettings>) =>
  request<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) });
export const resetSettings = () =>
  request<AppSettings>('/api/settings/reset', { method: 'POST' });

// Analytics snapshot
export const getCurrentAnalytics = () => request('/api/analytics/current');

// Predict position
export const predictPosition = (fsr: number[]) =>
  request('/api/predict-position', { method: 'POST', body: JSON.stringify({ fsr }) });

// Default API Export Object
export const api = {
  getHealth,
  getDeviceStatus,
  setMode,
  startMock,
  stopMock,
  setMockPosition,
  startSession,
  stopSession,
  getCurrentSession,
  getSessions,
  getSession,
  deleteSession,
  exportSessionCSV,
  exportSessionPDF,
  calibrateHardware,
  getSettings,
  updateSettings,
  resetSettings,
  getCurrentAnalytics,
  predictPosition,
};

export default api;
