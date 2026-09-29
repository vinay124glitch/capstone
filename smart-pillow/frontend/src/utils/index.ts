import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString();
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-rose-600';
}

export const getScoreColor = scoreColor;

export function getEegQualityColor(score?: number): string {
  if (!score || score < 0.4) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (score < 0.7) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

export function qualityColor(score: number): string {
  if (score >= 70) return '#16a34a';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

export function qualityLabel(score: number): string {
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

export function getPositionBadgeColor(pos?: string): string {
  switch (pos) {
    case 'Left':
    case 'Left side':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Right':
    case 'Right side':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Back':
    case 'Back supine':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Prone':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

/** Map FSR ADC value (0-1024) to soft blue light-mode heatmap colors matching the user wireframe */
export function getFsrColor(val: number): string {
  const norm = Math.min(1, Math.max(0, val / 1024));
  if (norm < 0.08) return '#eff6ff'; // blue-50
  if (norm < 0.3) return '#dbeafe';  // blue-100
  if (norm < 0.6) return '#93c5fd';  // blue-300
  if (norm < 0.85) return '#3b82f6'; // blue-500
  return '#1d4ed8';                  // blue-700
}

export function fsrToHeatColor(value: number, max = 4095): string {
  return getFsrColor(value);
}
