import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const sections = new Set(["unmatched", "registrations", "conflicts", "issues", "duplicates", "soundtracks", "stim"]);

/** Keep the requested section aligned while earlier sections load, until the user interacts. */
export function useReviewSectionScroll() {
  const { hash, key } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = hash.slice(1);
    const root = ref.current;
    if (!root || !sections.has(id)) return;
    let frame = 0;
    let stopped = false;
    const align = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!stopped) document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
      });
    };
    const observer = new ResizeObserver(align);
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    events.forEach((event) => window.addEventListener(event, stop, { passive: true }));
    observer.observe(root);
    align();
    return () => {
      stop();
      events.forEach((event) => window.removeEventListener(event, stop));
    };
  }, [hash, key]);

  return ref;
}