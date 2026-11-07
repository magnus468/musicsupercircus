import { afterEach, expect, it, vi } from "vitest";
import { captureReviewRemovalPosition } from "./reviewRemovalPosition";

afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("keeps the surviving next row at the same viewport position after removal", () => {
  document.body.innerHTML = '<div data-review-list><table><tbody><tr><td><button>Remove</button></td></tr><tr><td><button>Next</button></td></tr></tbody></table></div>';
  const buttons = document.querySelectorAll("button");
  buttons[0].focus();
  const row = buttons[1].closest("tr");
  if (!row) throw new Error("Missing neighbour");
  let top = 300;
  vi.spyOn(row, "getBoundingClientRect").mockImplementation(() => ({ top }) as DOMRect);
  vi.stubGlobal("scrollY", 1200);
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const focus = vi.spyOn(buttons[1], "focus");
  const restore = captureReviewRemovalPosition();
  buttons[0].closest("tr")?.remove();
  top = 250;
  restore?.();
  expect(scroll).toHaveBeenCalledWith({ top: 1150, left: 0, behavior: "instant" });
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});

it("anchors the previous row when the last row is removed", () => {
  document.body.innerHTML = '<div data-review-list><table><tbody><tr><td><button>Previous</button></td></tr><tr><td><button>Remove</button></td></tr></tbody></table></div>';
  const buttons = document.querySelectorAll("button");
  buttons[1].focus();
  const row = buttons[0].closest("tr");
  if (!row) throw new Error("Missing neighbour");
  vi.spyOn(row, "getBoundingClientRect").mockReturnValue({ top: 200 } as DOMRect);
  vi.stubGlobal("scrollY", 1200);
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const restore = captureReviewRemovalPosition();
  buttons[1].closest("tr")?.remove();
  restore?.();
  expect(scroll).toHaveBeenCalledWith({ top: 1200, left: 0, behavior: "instant" });
  expect(document.activeElement).toBe(buttons[0]);
});