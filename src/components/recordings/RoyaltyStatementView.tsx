import { useEffect, useState } from "react";
import { Download, FileText, Link as LinkIcon, Lock, Send, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildRoyaltyPdf, PAYER, type Party, type RoyaltyStatementData } from "@/lib/royaltyPdf";
import { royaltyStatus, type SavedRoyalty } from "@/lib/royaltyLifecycle";
import RoyaltyDetails from "./RoyaltyDetails";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const kr = (n: number) => `${(Math.abs(n) < 0.005 ? 0 : n).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;

type Props = {
  statement: SavedRoyalty;
  payee: Party;
  fileName: string;
  onClose: () => void;
  onUpdated: (statement: SavedRoyalty) => void;
};

const Row = ({ k, v, bold, note }: { k: string; v: number; bold?: boolean; note?: string }) => (
  <tr className={`border-t first:border-t-0 ${bold ? "font-semibold" : ""}`}>
    <td className="py-1.5 pr-3 text-xs text-muted-foreground">{note}</td>
    <td className="py-1.5">{k}</td>
    <td className="py-1.5 text-right tabular-nums">{kr(v)}</td>
  </tr>
);

const PartyBlock = ({ title, p }: { title: string; p: Party }) => (
  <div>
    <div className="text-xs text-muted-foreground">{title}</div>
    <div className="font-semibold">{p.name}</div>
    {p.lines.filter(Boolean).map((l) => <div key={l}>{l}</div>)}
  </div>
);

const RoyaltyStatementView = ({ statement: s, payee, fileName, onClose, onUpdated }: Props) => {
  const [url, setUrl] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState(s.payment_reference ?? "");
  const update = async (patch: { finalized_at?: string; sent_at?: string; paid_at?: string; payment_reference?: string }) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.from("royalty_statements").update(patch).eq("id", s.id).select().single();
      if (error) throw error;
      onUpdated(data as unknown as SavedRoyalty);
      setPaying(false);
      toast.success("Avräkningen är uppdaterad");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Kunde inte spara"); }
    finally { setBusy(false); }
  };

  // PDF:en läggs i lagringen och hämtas via länk (förhandsvisningen kan blockera nedladdning direkt från sidan).
  useEffect(() => {
    (async () => {
      try {
        const path = `${s.period_label}/${s.id}.pdf`;
        const bucket = supabase.storage.from("royalty-statements");
        const { data: existing, error: readErr } = await bucket.download(path);
        if (!existing) {
          if (s.finalized_at) throw new Error("Den låsta PDF-filen kunde inte hämtas. Den ersätts inte.");
          const blob = buildRoyaltyPdf(s, payee).output("blob");
          const { error: upErr } = await bucket.upload(path, blob, { upsert: false, contentType: "application/pdf" });
          if (upErr) throw upErr;
        }
        const [dl, view] = await Promise.all([bucket.createSignedUrl(path, 3600, { download: fileName }), bucket.createSignedUrl(path, 3600)]);
        if (dl.error) throw dl.error;
        if (view.error) throw view.error;
        setUrl(dl.data.signedUrl);
        setViewUrl(view.data.signedUrl);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Kunde inte skapa PDF");
      }
    })();
  }, [s, payee, fileName]);

  const copyLink = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); toast.success("Länken är kopierad – klistra in den i webbläsaren (giltig 1 timme)"); }
    catch { window.prompt("Kopiera länken:", url); }
  };

  const income = s.income_downloads_sek + s.income_streams_sek;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">Avräkning {s.period_label} – {payee.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{royaltyStatus(s)}</Badge>
          {!s.finalized_at && <Button size="sm" variant="outline" disabled={busy || !url || !s.payee_snapshot || !s.detail_snapshot} onClick={() => { if (confirm("Lås avräkningen? Belopp och underlag kan därefter inte ändras eller tas bort.")) void update({ finalized_at: new Date().toISOString() }); }}><Lock className="mr-1 h-4 w-4" />Lås avräkning</Button>}
          {s.finalized_at && !s.sent_at && <Button size="sm" variant="outline" disabled={busy} onClick={() => update({ sent_at: new Date().toISOString() })}><Send className="mr-1 h-4 w-4" />Markera skickad</Button>}
          {s.finalized_at && !s.paid_at && s.payable_incl_vat > 0 && <Button size="sm" variant="outline" disabled={busy} onClick={() => setPaying(true)}><Check className="mr-1 h-4 w-4" />Markera betald</Button>}
          {url ? (
            <>
              <Button size="sm" asChild><a href={url} target="_blank" rel="noreferrer" download={fileName}><Download className="mr-1 h-4 w-4" />Ladda ner PDF</a></Button>
              <Button size="sm" variant="outline" onClick={() => setShowPdf((v) => !v)}><FileText className="mr-1 h-4 w-4" />{showPdf ? "Visa översikt" : "Visa som PDF"}</Button>
              <Button size="sm" variant="outline" onClick={copyLink}><LinkIcon className="mr-1 h-4 w-4" />Kopiera nedladdningslänk</Button>
            </>
          ) : (
            <Button size="sm" disabled>{err ? "PDF misslyckades" : "Förbereder PDF…"}</Button>
          )}
        </div>
        {!s.payee_snapshot && <p className="text-xs text-muted-foreground">Äldre avräkning utan sparat mottagar- och releaseunderlag. Skapa om den före låsning.</p>}
        {s.sent_at && <p className="text-xs text-muted-foreground">Markerad skickad: {new Date(s.sent_at).toLocaleDateString("sv-SE")}</p>}
        {s.paid_at && <p className="text-sm">Betald {s.paid_at}{s.payment_reference ? ` · ${s.payment_reference}` : ""}</p>}
        {paying && <div className="flex flex-wrap items-end gap-2"><label className="text-xs">Betalningsdatum<Input aria-label="Betalningsdatum" type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} /></label><label className="text-xs">Referens<Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Valfri referens" /></label><Button disabled={busy || !paidDate} onClick={() => update({ paid_at: paidDate, payment_reference: reference.trim() })}>Spara betalning</Button><Button variant="ghost" onClick={() => setPaying(false)}>Avbryt</Button></div>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        {showPdf && viewUrl && (
          <>
            <p className="text-xs text-muted-foreground">Använd nedladdningsknappen i PDF-visaren nedan för att spara filen.</p>
            <iframe src={viewUrl} title="Avräkning PDF" className="h-[70vh] w-full rounded border" />
          </>
        )}

        <div className={`space-y-6 rounded-lg border bg-card p-6 text-sm ${showPdf ? "hidden" : ""}`}>
          <h2 className="text-lg font-semibold">{PAYER.name}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <PartyBlock title="Payer" p={PAYER} />
            <PartyBlock title="Payee" p={payee} />
            <div className="space-y-2">
              <div><div className="text-xs text-muted-foreground">Date</div><div className="font-semibold">{s.statement_date}</div></div>
              <div><div className="text-xs text-muted-foreground">Period</div><div className="font-semibold">{s.period_start} – {s.period_end}</div></div>
            </div>
          </div>

          <table className="w-full">
            <tbody>
              <Row note="Statement Summary" k="Opening Balance" v={s.opening_balance} />
              <Row note="Utgående saldo förs till nästa avräkning." k="Expenses Amount" v={-s.expenses_sek} />
              <Row k="Incomes Amount" v={income} />
              <Row k="Payable Amount VAT Excluded" v={s.payable_excl_vat} />
              <Row k={`VAT (${(s.vat_rate * 100).toFixed(1)} %)`} v={s.vat_sek} />
              <Row k="Payable Amount VAT Included" v={s.payable_incl_vat} bold />
              <Row k="Outstanding Balance" v={s.outstanding_balance} />
            </tbody>
          </table>

          <div>
            <h3 className="mb-2 font-semibold">{payee.name} (Contract)</h3>
            <table className="w-full">
              <tbody>
                <tr className="bg-muted/50 font-semibold"><td className="p-2">Fees</td><td className="p-2 text-right tabular-nums">{kr(-s.expenses_sek)}</td></tr>
                {s.fees.map((f, i) => <tr key={i} className="border-t"><td className="p-2">{f.description}</td><td className="p-2 text-right tabular-nums">{kr(-f.amount)}</td></tr>)}
                <tr className="border-t bg-muted/50 font-semibold"><td className="p-2">Digital</td><td className="p-2 text-right tabular-nums">{kr(income)}</td></tr>
                <tr className="border-t"><td className="p-2">Downloads</td><td className="p-2 text-right tabular-nums">{kr(s.income_downloads_sek)}</td></tr>
                <tr className="border-t"><td className="p-2">Streams</td><td className="p-2 text-right tabular-nums">{kr(s.income_streams_sek)}</td></tr>
              </tbody>
            </table>
          </div>

          <table className="ml-auto w-full max-w-xs">
            <tbody>
              {([["Opening Balance", s.opening_balance], ["Operations Amount", income - s.expenses_sek], ["Minimum Payout", s.minimum_payout], ["Payable Amount", s.payable_excl_vat], ["Outstanding Balance", s.outstanding_balance]] as const).map(([k, v]) => (
                <tr key={k}><td className="py-1">{k}</td><td className="py-1 text-right tabular-nums">{kr(v)}</td></tr>
              ))}
            </tbody>
          </table>
          <div><h3 className="mb-2 font-semibold">Sparat releaseunderlag</h3><RoyaltyDetails details={s.detail_snapshot ?? []} /></div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoyaltyStatementView;
