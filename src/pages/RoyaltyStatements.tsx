import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Fee, type Party } from "@/lib/royaltyPdf";
import RoyaltyStatementView from "@/components/recordings/RoyaltyStatementView";
import RoyaltyStatementView from "@/components/recordings/RoyaltyStatementView";

const sek = (v: number) => v.toLocaleString("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 2 });
// Svensk decimal: komma = decimal, mellanslag = tusental
const parseNum = (v: string) => parseFloat(v.replace(/[\s\u00a0]/g, "").replace(/kr|sek/gi, "").replace(",", "."));
const r2 = (n: number) => Math.round(n * 100) / 100;

type PeriodData = {
  statements: number; statements_missing_rate: number;
  recipients: { recipient: string; downloads: number; streams: number; missing_rate: boolean; recoup: Fee[] }[];
};
type Client = { id: string; first_name: string; last_name: string; organization: string | null; client_type: string; street_address: string | null; postal_code: string | null; city: string | null; country: string | null; vat_number: string | null };
type Saved = { id: string; recipient: string; client_id: string | null; period_label: string; period_start: string; period_end: string; statement_date: string; opening_balance: number; expenses_sek: number; income_downloads_sek: number; income_streams_sek: number; vat_rate: number; vat_sek: number; payable_excl_vat: number; payable_incl_vat: number; minimum_payout: number; outstanding_balance: number; fees: Fee[] };

const clientName = (c: Client) => (c.client_type === "company" ? c.organization || c.first_name : `${c.first_name} ${c.last_name}`.trim());
const party = (c: Client | undefined, fallback: string): Party =>
  c ? { name: clientName(c), lines: [c.street_address ?? "", [c.postal_code, c.city].filter(Boolean).join(" "), c.country ?? "", c.vat_number ?? ""] } : { name: fallback, lines: [] };

const compute = (opening: number, downloads: number, streams: number, fees: Fee[], vatRate: number, minimum: number) => {
  const expenses = r2(fees.reduce((a, f) => a + f.amount, 0));
  const total = r2(opening + downloads + streams - expenses);
  const payable = total >= minimum && total > 0 ? total : 0;
  const vat = r2(payable * vatRate);
  return { expenses, payable, vat, incl: r2(payable + vat), outstanding: r2(total - payable) };
};

const RoyaltyStatements = () => {
  const qc = useQueryClient();
  const [year, setYear] = useState(2026);
  const [half, setHalf] = useState<1 | 2>(1);
  const label = `${String(year).slice(2)}.${half}`;
  const start = `${year}-${half === 1 ? "01-01" : "07-01"}`;
  const end = `${year}-${half === 1 ? "06-30" : "12-31"}`;
  const [editing, setEditing] = useState<string | null>(null);

  const { data: period, isLoading } = useQuery({
    queryKey: ["royalty-period", start],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_royalty_period", { p_start: start, p_end: end });
      if (error) throw error;
      return data as PeriodData;
    },
  });
  const { data: saved = [] } = useQuery({
    queryKey: ["royalty-statements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("royalty_statements").select("*").order("period_end", { ascending: false });
      if (error) throw error;
      return data as unknown as Saved[];
    },
  });
  const { data: payees = [] } = useQuery({
    queryKey: ["royalty-payees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("royalty_payees").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-royalty"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id,first_name,last_name,organization,client_type,street_address,postal_code,city,country,vat_number");
      if (error) throw error;
      return (data as Client[]).sort((a, b) => clientName(a).localeCompare(clientName(b), "sv"));
    },
  });

  const opening = (recipient: string) => {
    const prev = saved.filter((s) => s.recipient === recipient && s.period_end < start).sort((a, b) => b.period_end.localeCompare(a.period_end))[0];
    return Number(prev?.outstanding_balance ?? 0);
  };

  const rows = useMemo(() => {
    const names = new Set([...(period?.recipients ?? []).map((r) => r.recipient), ...saved.filter((s) => s.period_label === label).map((s) => s.recipient)]);
    return [...names].map((name) => {
      const inc = period?.recipients.find((r) => r.recipient === name);
      const st = saved.find((s) => s.period_label === label && s.recipient === name);
      const payee = payees.find((p) => p.recipient === name);
      return { name, inc, st, payee, income: (inc?.downloads ?? 0) + (inc?.streams ?? 0) };
    }).sort((a, b) => b.income - a.income);
  }, [period, saved, payees, label]);

  const [viewing, setViewing] = useState<Saved | null>(null);
  const viewData = useMemo(() => {
    if (!viewing) return null;
    const c = clients.find((x) => x.id === viewing.client_id);
    return {
      statement: { ...viewing, fees: viewing.fees ?? [] },
      payee: party(c, viewing.recipient),
      fileName: `${viewing.period_label.replace(".", "H")}_${(c ? clientName(c) : viewing.recipient).replace(/[^\wåäöÅÄÖ]+/g, "_")}.pdf`,
    };
  }, [viewing, clients]);

  const remove = async (s: Saved) => {
    if (!confirm(`Ta bort avräkningen ${s.period_label} för ${s.recipient}?`)) return;
    const { error } = await supabase.from("royalty_statements").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["royalty-statements"] });
  };

  const current = rows.find((r) => r.name === editing);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild><Link to="/recordings"><ArrowLeft className="mr-2 h-4 w-4" />Inspelningsrättigheter</Link></Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Royaltyavräkningar</h1>
          <p className="text-sm text-muted-foreground">Avräkningar till mottagare, två gånger per år (.1 = jan–jun, .2 = jul–dec). Belopp i SEK.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026, 2027].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(half)} onValueChange={(v) => setHalf(Number(v) as 1 | 2)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="1">{String(year).slice(2)}.1 (jan–jun)</SelectItem><SelectItem value="2">{String(year).slice(2)}.2 (jul–dec)</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      {period && period.statements_missing_rate > 0 && (
        <p className="rounded-lg border border-destructive/40 bg-card p-3 text-sm text-destructive">
          {period.statements_missing_rate} av {period.statements} distributörsavräkningar i perioden saknar växelkurs och räknas inte med. Ange kursen under <Link to="/recordings/statements" className="underline">Avräkningar</Link>.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Mottagare</th><th className="p-3">Klient</th><th className="p-3 text-right">Intäkter</th><th className="p-3 text-right">Att betala</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Räknar…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Inga intäkter i perioden.</td></tr>}
            {rows.map((r) => {
              const c = clients.find((x) => x.id === (r.st?.client_id ?? r.payee?.client_id));
              return (
                <tr key={r.name} className="border-t">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-xs">{c ? clientName(c) : <span className="text-muted-foreground">Ej kopplad</span>}</td>
                  <td className="p-3 text-right tabular-nums">{sek(r.income)}</td>
                  <td className="p-3 text-right tabular-nums">{r.st ? sek(Number(r.st.payable_incl_vat)) : "–"}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {r.st ? (
                      <>
                        <Badge variant="outline" className="mr-2">Skapad</Badge>
                        <Button variant="ghost" size="sm" onClick={() => setViewing(r.st!)}><Eye className="mr-1 h-4 w-4" />Visa</Button>
                        <Button variant="ghost" size="icon" title="Ta bort" onClick={() => remove(r.st!)}><Trash2 className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setEditing(r.name)}><FileText className="mr-1 h-4 w-4" />Skapa</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {current && (
        <CreateDialog
          key={current.name}
          recipient={current.name}
          downloads={current.inc?.downloads ?? 0}
          streams={current.inc?.streams ?? 0}
          recoup={current.inc?.recoup ?? []}
          opening={opening(current.name)}
          payee={current.payee}
          clients={clients}
          label={label} start={start} end={end}
          onClose={() => setEditing(null)}
          onSaved={(s) => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["royalty-statements"] });
            qc.invalidateQueries({ queryKey: ["royalty-payees"] });
            setViewing(s);
          }}
        />
      )}
      {viewData && <RoyaltyStatementView {...viewData} onClose={() => setViewing(null)} />}
    </div>
  );
};

type DialogProps = {
  recipient: string; downloads: number; streams: number; recoup: Fee[]; opening: number;
  payee?: { client_id: string | null; vat_rate: number; minimum_payout: number };
  clients: Client[]; label: string; start: string; end: string;
  onClose: () => void; onSaved: (s: Saved) => void;
};

const CreateDialog = ({ recipient, downloads, streams, recoup, opening, payee, clients, label, start, end, onClose, onSaved }: DialogProps) => {
  const [clientId, setClientId] = useState(payee?.client_id ?? "");
  const [vat, setVat] = useState(String(Number(payee?.vat_rate ?? 0) * 100));
  const [minimum, setMinimum] = useState(String(payee?.minimum_payout ?? 500));
  const [fees, setFees] = useState<{ description: string; amount: string }[]>(recoup.map((f) => ({ description: f.description, amount: r2(f.amount).toFixed(2).replace(".", ",") })));
  const [saving, setSaving] = useState(false);

  const parsedFees = fees.filter((f) => f.description.trim() && !isNaN(parseNum(f.amount))).map((f) => ({ description: f.description.trim(), amount: r2(parseNum(f.amount)) }));
  const vatRate = (parseNum(vat) || 0) / 100;
  const min = parseNum(minimum) || 0;
  const dl = r2(downloads), str = r2(streams);
  const res = compute(opening, dl, str, parsedFees, vatRate, min);

  const save = async () => {
    if (!clientId) return toast.error("Koppla mottagaren till en klient");
    setSaving(true);
    try {
      const { error: pErr } = await supabase.from("royalty_payees").upsert({ recipient, client_id: clientId, vat_rate: vatRate, minimum_payout: min, updated_at: new Date().toISOString() });
      if (pErr) throw pErr;
      const { data, error } = await supabase.from("royalty_statements").insert({
        period_label: label, period_start: start, period_end: end, recipient, client_id: clientId,
        opening_balance: opening, expenses_sek: res.expenses, income_downloads_sek: dl, income_streams_sek: str,
        vat_rate: vatRate, vat_sek: res.vat, payable_excl_vat: res.payable, payable_incl_vat: res.incl,
        minimum_payout: min, outstanding_balance: res.outstanding, fees: parsedFees,
      }).select().single();
      if (error) throw error;
      toast.success(`Avräkning ${label} skapad för ${recipient}`);
      onSaved(data as unknown as Saved);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Avräkning {label} – {recipient}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 sm:col-span-3"><span className="text-xs text-muted-foreground">Klient (adress och org.nr hämtas härifrån)</span>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Välj klient" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{clientName(c)}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Moms %</span>
              <Select value={vat} onValueChange={setVat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["0", "6", "25"].map((v) => <SelectItem key={v} value={v}>{v} %</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Minsta utbetalning (kr)</span><Input value={minimum} onChange={(e) => setMinimum(e.target.value)} /></label>
            <div className="space-y-1"><span className="text-xs text-muted-foreground">Ingående saldo</span><div className="pt-2 tabular-nums">{sek(opening)}</div></div>
          </div>

          <div>
            <div className="mb-1 font-medium">Avgifter / kostnader (kr)</div>
            {fees.map((f, i) => (
              <div key={i} className="mb-1 flex gap-2">
                <Input value={f.description} placeholder="Beskrivning" onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                <Input className="w-36" value={f.amount} placeholder="Belopp" onChange={(e) => setFees(fees.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                <Button variant="ghost" size="icon" onClick={() => setFees(fees.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setFees([...fees, { description: "", amount: "" }])}><Plus className="mr-1 h-3 w-3" />Lägg till avgift</Button>
          </div>

          <table className="w-full rounded border text-sm">
            <tbody>
              {[
                ["Ingående saldo", opening], ["Downloads", dl], ["Streams", str], ["Avgifter", -res.expenses],
                ["Att betala exkl. moms", res.payable], [`Moms (${(vatRate * 100).toFixed(1)} %)`, res.vat],
              ].map(([k, v]) => <tr key={k as string} className="border-t first:border-t-0"><td className="p-2">{k}</td><td className="p-2 text-right tabular-nums">{sek(v as number)}</td></tr>)}
              <tr className="border-t font-semibold"><td className="p-2">Att betala inkl. moms</td><td className="p-2 text-right tabular-nums">{sek(res.incl)}</td></tr>
              <tr className="border-t text-muted-foreground"><td className="p-2">Utgående saldo (förs till nästa avräkning)</td><td className="p-2 text-right tabular-nums">{sek(res.outstanding)}</td></tr>
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Sparar…" : "Skapa avräkning + PDF"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoyaltyStatements;
