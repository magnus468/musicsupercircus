import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

/**
 * Saves scroll position when leaving a page and restores it when returning.
 * Pass `ready` (default true) — scroll restores only once the content is loaded.
 */
export const useScrollRestore = (ready: boolean = true, key?: string) => {
  const { pathname } = useLocation();
  const storageKey = `scroll-${key || pathname}`;
  const restoredRef = useRef(false);

  // Save scroll position on unmount
  useEffect(() => {
    return () => {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };
  }, [storageKey]);

  // Restore once ready
  useEffect(() => {
    if (!ready || restoredRef.current) return;

    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const pos = parseInt(saved, 10);
      // Multiple rAFs to let the browser paint the new content first
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: pos, left: 0 });
          restoredRef.current = true;
        });
      });
    } else {
      restoredRef.current = true;
    }
  }, [ready, storageKey]);
};
