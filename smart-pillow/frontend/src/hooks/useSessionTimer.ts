/**
 * Session timer hook: returns formatted elapsed time for active sessions.
 */
import { useState, useEffect } from 'react';
import { useSensorStore } from '../store/sensorStore';

export function useSessionTimer(): string {
  const sessionActive = useSensorStore(s => s.sessionActive);
  const sessionStart = useSensorStore(s => s.sessionStart);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sessionActive || !sessionStart) {
      setElapsed(0);
      return;
    }
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [sessionActive, sessionStart]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
