import { useEffect, useRef } from "react";

export function useHudShortcut(event: string, handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const fn = () => ref.current();
    window.addEventListener(event, fn);
    return () => window.removeEventListener(event, fn);
  }, [event]);
}

export function hudOpen(event: string) {
  window.dispatchEvent(new CustomEvent(event));
}
