/** Anchor a surviving neighbour before a review row disappears. */
export function captureReviewRemovalPosition() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !active.closest("[data-review-list]")) return null;
  const row = active.closest("tr");
  const neighbour = row?.nextElementSibling ?? row?.previousElementSibling;
  const anchor = neighbour instanceof HTMLElement ? neighbour : active.closest<HTMLElement>("[id]");
  if (!anchor) return null;
  const top = anchor.getBoundingClientRect().top;
  const scrollY = window.scrollY;
  return () => {
    if (!active.isConnected) {
      anchor.querySelector<HTMLElement>("button, a, input, [tabindex]")?.focus({ preventScroll: true });
    }
    const offset = anchor.isConnected ? anchor.getBoundingClientRect().top - top : 0;
    window.scrollTo({ top: anchor.isConnected ? window.scrollY + offset : scrollY, left: window.scrollX, behavior: "instant" });
  };
}