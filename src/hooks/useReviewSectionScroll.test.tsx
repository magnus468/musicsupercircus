import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { useReviewSectionScroll } from "./useReviewSectionScroll";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("aligns the selected section again after delayed content growth, but stops after user scrolling", () => {
  const scroll = vi.fn();
  const disconnect = vi.fn();
  let resized = () => {};
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resized = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const original = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: scroll });
  function Review() {
    const ref = useReviewSectionScroll();
    return <div ref={ref}><div id="unmatched" /></div>;
  }
  try {
    render(<MemoryRouter initialEntries={["/review#unmatched"]}><Review /></MemoryRouter>);
    expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
    const initial = scroll.mock.calls.length;
    act(() => resized());
    expect(scroll).toHaveBeenCalledTimes(initial + 1);
    act(() => window.dispatchEvent(new Event("click")));
    act(() => resized());
    expect(scroll).toHaveBeenCalledTimes(initial + 1);
    expect(disconnect).toHaveBeenCalled();
  } finally {
    if (original) Object.defineProperty(Element.prototype, "scrollIntoView", original);
    else Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  }
});