import type { Fee, Party, RoyaltyStatementData } from "./royaltyPdf";

export type RoyaltyDetail = { statement_id: string; recipient: string; album_key: string; album: string; source: string; period_label: string; currency: string; rate: number | null; original_amount: number; income_sek: number; recoup_sek: number };
export type SavedRoyalty = RoyaltyStatementData & { id: string; recipient: string; client_id: string | null; period_label: string; finalized_at: string | null; sent_at: string | null; paid_at: string | null; payment_reference: string | null; payee_snapshot: Party | null; detail_snapshot: RoyaltyDetail[] | null };
const r2 = (n: number) => Math.round(n * 100) / 100;
export function computeRoyalty(opening: number, downloads: number, streams: number, fees: Fee[], vatRate: number, minimum: number) {
  const expenses = r2(fees.reduce((a, f) => a + f.amount, 0));
  const total = r2(opening + downloads + streams - expenses);
  const payable = total >= minimum && total > 0 ? total : 0;
  const vat = r2(payable * vatRate);
  return { expenses, payable, vat, incl: r2(payable + vat), outstanding: r2(total - payable) };
}
export function royaltyStatus(s: Pick<SavedRoyalty, "finalized_at" | "sent_at" | "paid_at">) {
  return s.paid_at ? "Betald" : s.sent_at ? "Skickad" : s.finalized_at ? "Låst" : "Skapad";
}
export function unpaidRoyalty(statements: Pick<SavedRoyalty, "paid_at" | "payable_incl_vat">[]) {
  return r2(statements.filter(s => !s.paid_at).reduce((sum, s) => sum + Number(s.payable_incl_vat), 0));
}