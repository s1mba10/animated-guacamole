import { useState, useEffect, useRef } from 'react';

export interface CountdownResult {
  minutes: string;
  seconds: string;
  progress: number; // 1 to 0
}

/**
 * Hook to track a 15 minute countdown once a target time is reached.
 * When remaining time hits 0, onExpire is called.
 */
export function useCountdown(target: Date | null, active: boolean, onExpire?: () => void): CountdownResult {
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timer>();

  useEffect(() => {
    if (!active || !target) {
      clearInterval(intervalRef.current);
      setRemaining(0);
      return;
    }

    const update = () => {
      const diff = target.getTime() + 15 * 60 * 1000 - Date.now();
      if (diff <= 0) {
        clearInterval(intervalRef.current);
        setRemaining(0);
        onExpire?.();
      } else {
        setRemaining(Math.floor(diff / 1000));
      }
    };

    update();
    intervalRef.current = setInterval(update, 1000);

    return () => clearInterval(intervalRef.current);
  }, [target, active, onExpire]);

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(remaining % 60)
    .toString()
    .padStart(2, '0');
  const progress = remaining / (15 * 60);

  return { minutes, seconds, progress };
}
