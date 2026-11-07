import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MatchWorkDialog from "./MatchWorkDialog";

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [{ id: "work-1", title: "Sthlm reqviem", creators: "Nathan Larson", project: "Sthlm rekviem" }], isLoading: false, isError: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
afterEach(cleanup);

describe("manual settlement matching", () => {
  async function selectWork(onMatch: (title: string) => Promise<void>, onOpenChange = vi.fn()) {
    render(<MatchWorkDialog open onOpenChange={onOpenChange} settlementTitle="STHLM REKVIEM" totalAmount={100} onMatch={onMatch} isMatching={false} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "reqviem" } });
    fireEvent.click(await screen.findByRole("button", { name: /Sthlm reqviem/ }));
    return onOpenChange;
  }

  it("does not save the chosen work until confirmation", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    await selectWork(save);
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /OK – spara koppling/ }));
    await waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith("Sthlm reqviem"));
  });

  it("keeps a failed selection available for retry without closing", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue(undefined);
    const close = await selectWork(save);
    fireEvent.click(screen.getByRole("button", { name: /OK – spara koppling/ }));
    await screen.findByRole("alert");
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /OK – spara koppling/ }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenLastCalledWith("Sthlm reqviem");
  });

  it("prevents duplicate saves or cancellation while persistence is pending", async () => {
    let finish: (() => void) | undefined;
    const save = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const close = await selectWork(save);
    fireEvent.click(screen.getByRole("button", { name: /OK – spara koppling/ }));
    fireEvent.click(screen.getByRole("button", { name: /Sparar koppling/ }));
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    finish?.();
    await waitFor(() => expect(screen.getByRole("button", { name: /OK – spara koppling/ })).toBeEnabled());
  });
});