import { useEffect, useRef } from 'react';

type LoopCallback = (dt: number, time: number) => void;

export const useAnimationLoop = (callback: LoopCallback, active: boolean = true) => {
  const callbackRef = useRef<LoopCallback>(callback);
  const lastTimeRef = useRef<number | null>(null);

  callbackRef.current = callback;

  useEffect(() => {
    if (!active) {
      return;
    }

    let frameId: number;
    let running = true;

    const loop = (timestamp: number) => {
      if (!running) {
        return;
      }

      if (lastTimeRef.current == null) {
        lastTimeRef.current = timestamp;
      }

      const dtMs = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const cappedDt = Math.min(Math.max(dtMs / 1000, 0), 0.05);
      callbackRef.current(cappedDt, timestamp / 1000);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      lastTimeRef.current = null;
    };
  }, [active]);
};
