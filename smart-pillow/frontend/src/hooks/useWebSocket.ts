/**
 * Custom hook: connects WebSocket service to the Zustand store.
 * Call once in App.tsx.
 */
import { useEffect } from 'react';
import { wsService } from '../services/websocket';
import { useSensorStore } from '../store/sensorStore';
import { api } from '../services/api';
import type { SensorUpdate } from '../types';

export function useWebSocket() {
  const processUpdate = useSensorStore(s => s.processUpdate);
  const setConnectionStatus = useSensorStore(s => s.setConnectionStatus);

  useEffect(() => {
    // Initial fetch of device status
    api.getDeviceStatus().then(status => {
      const state = useSensorStore.getState();
      if (state.activeMode === 'hardware') {
        state.setIsDeviceConnected(!!status.connected);
        if (!status.connected) {
          state.clearHardwareData();
        }
      }
    }).catch(() => {});

    const unsubMsg = wsService.onMessage((data: any) => {
      if (data.type === 'sensor_update' || data.type === 'device_status') {
        processUpdate(data);
      }
    });
    const unsubStatus = wsService.onStatus(setConnectionStatus);

    wsService.connect();

    // Periodic liveness check for Real Hardware packets (every 2s)
    const livenessTimer = setInterval(() => {
      const state = useSensorStore.getState();
      if (state.activeMode === 'hardware' && state.isDeviceConnected) {
        const now = Date.now();
        if (!state.lastPacketTime || (now - state.lastPacketTime > 4000)) {
          state.setIsDeviceConnected(false);
          state.clearHardwareData();
        }
      }
    }, 2000);

    return () => {
      unsubMsg();
      unsubStatus();
      clearInterval(livenessTimer);
      // Don't disconnect on unmount – keep alive across page navigations
    };
  }, [processUpdate, setConnectionStatus]);
}
