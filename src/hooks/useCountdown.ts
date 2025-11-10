import { useState, useEffect, useRef } from 'react';
import { REMINDER_TIMEOUT_MINUTES } from '../constants/reminder';

export interface CountdownResult {
  minutes: string;
  seconds: string;
  progress: number; // 1 to 0
}

/**
 * Hook to track a countdown once a target time is reached.
 * When remaining time hits 0, onExpire is called.
 */
export function useCountdown(target: Date | null, active: boolean, onExpire?: () => void): CountdownResult {
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!active || !target) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setRemaining(0);
      return;
    }

    const update = () => {
      const diff = target.getTime() + REMINDER_TIMEOUT_MINUTES * 60 * 1000 - Date.now();
      if (diff <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setRemaining(0);
        onExpire?.();
      } else {
        setRemaining(Math.floor(diff / 1000));
      }
    };

    update();
    intervalRef.current = setInterval(update, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [target, active, onExpire]);

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(remaining % 60)
    .toString()
    .padStart(2, '0');
  const progress = remaining / (REMINDER_TIMEOUT_MINUTES * 60);

  return { minutes, seconds, progress };
}
