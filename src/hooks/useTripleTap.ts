import { useEffect, useRef } from "react";

/**
 * Global triple-tap detector — fires when the user taps anywhere on the
 * screen 3 times within `windowMs`. Always-on, non-disableable default
 * SOS gesture for emergencies.
 */
export function useTripleTap(onTrigger: () => void, windowMs = 600) {
  const handlerRef = useRef(onTrigger);
  handlerRef.current = onTrigger;

  useEffect(() => {
    let taps: number[] = [];

    const handle = (e: Event) => {
      // Ignore taps on form fields so users can still type normally
      const t = e.target as HTMLElement | null;
      if (t && t.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }
      const now = Date.now();
      taps = [...taps, now].filter((ts) => now - ts <= windowMs);
      if (taps.length >= 3) {
        taps = [];
        handlerRef.current();
      }
    };

    window.addEventListener("pointerdown", handle, { passive: true });
    return () => window.removeEventListener("pointerdown", handle);
  }, [windowMs]);
}
