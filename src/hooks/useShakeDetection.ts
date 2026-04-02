import { useEffect, useRef } from 'react';

export const useShakeDetection = (onShake: () => void, threshold = 25) => {
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const lastShake = useRef(0);

  useEffect(() => {
    const handler = (e: DeviceMotionEvent) => {
      const accel = e.accelerationIncludingGravity;
      if (!accel || accel.x == null || accel.y == null || accel.z == null) return;

      const dx = Math.abs(accel.x - lastAccel.current.x);
      const dy = Math.abs(accel.y - lastAccel.current.y);
      const dz = Math.abs(accel.z - lastAccel.current.z);

      lastAccel.current = { x: accel.x, y: accel.y, z: accel.z };

      if (dx + dy + dz > threshold) {
        const now = Date.now();
        if (now - lastShake.current > 2000) {
          lastShake.current = now;
          onShake();
        }
      }
    };

    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [onShake, threshold]);
};
