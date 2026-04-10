import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Saves scroll position when leaving a page and restores it when returning.
 * Uses sessionStorage keyed by pathname.
 */
export const useScrollRestore = (key?: string) => {
  const { pathname } = useLocation();
  const storageKey = `scroll-${key || pathname}`;
  const savedRef = useRef(false);

  // Restore scroll position on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const pos = parseInt(saved, 10);
      // Use requestAnimationFrame to wait for DOM render
      requestAnimationFrame(() => {
        window.scrollTo({ top: pos, left: 0 });
      });
    }
    savedRef.current = false;

    // Save scroll position on unmount (navigating away)
    return () => {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };
  }, [storageKey]);
};
