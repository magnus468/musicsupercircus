import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMatchSettlementWork, useUnmatchedSettlementWorks } from "./useSettlements";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

const key = ["unmatched-settlement-works"];
const rows = [
  { work_title: "Original title", total_amount: 120, row_count: 2, composers: "Composer" },
  { work_title: "Other title", total_amount: 80, row_count: 1, composers: "Other" },
];

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(key, rows);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe("settlement match list refresh", () => {
  beforeEach(() => rpc.mockReset());

  it("removes the saved title immediately while the background refresh is still pending", async () => {
    const { client, wrapper } = setup();
    rpc.mockImplementation((name) => name === "match_settlement_work"
      ? Promise.resolve({ error: null })
      : { abortSignal: () => new Promise(() => {}) });
    const { result } = renderHook(() => ({ list: useUnmatchedSettlementWorks(), match: useMatchSettlementWork() }), { wrapper });
    await act(async () => {
      await result.current.match.mutateAsync({ oldTitle: " original TITLE ", newTitle: "Catalog title" });
    });
    expect(result.current.list.data).toEqual([rows[1]]);
    expect(result.current.list.isFetching).toBe(true);
    expect(client.getQueryData(key)).toEqual([rows[1]]);
    client.clear();
  });

  it("keeps the original list when saving fails", async () => {
    const { client, wrapper } = setup();
    rpc.mockResolvedValue({ error: new Error("Save failed") });
    const { result } = renderHook(() => useMatchSettlementWork(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ oldTitle: "Original title", newTitle: "Catalog title" })).rejects.toThrow("Save failed");
    });
    expect(client.getQueryData(key)).toEqual(rows);
    client.clear();
  });

  it("cancels an older list request so it cannot restore a saved title", async () => {
    const { client, wrapper } = setup();
    let finishOldRead: ((value: unknown) => void) | undefined;
    let oldSignal: AbortSignal | undefined;
    const oldRead = new Promise((resolve) => { finishOldRead = resolve; });
    let reads = 0;
    rpc.mockImplementation((name) => name === "match_settlement_work"
      ? Promise.resolve({ error: null })
      : { abortSignal: (signal: AbortSignal) => {
        reads += 1;
        if (reads === 1) { oldSignal = signal; return oldRead; }
        return new Promise(() => {});
      } });
    const { result } = renderHook(() => ({ list: useUnmatchedSettlementWorks(), match: useMatchSettlementWork() }), { wrapper });
    act(() => { void result.current.list.refetch(); });
    await waitFor(() => expect(reads).toBe(1));
    await act(async () => {
      await result.current.match.mutateAsync({ oldTitle: "Original title", newTitle: "Catalog title" });
      finishOldRead?.({ data: rows, error: null });
    });
    expect(oldSignal?.aborted).toBe(true);
    expect(result.current.list.data).toEqual([rows[1]]);
    client.clear();
  });
});