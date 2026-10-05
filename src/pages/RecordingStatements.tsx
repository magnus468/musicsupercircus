import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseRecordingStatement } from "@/lib/recordingStatementParser";

const usd = (v: number) => v.toLocaleString("sv-SE", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

type Statement = {
  id: string; source: string; period_label: string; period_start: string | null; period_end: string | null;
  currency: string; file_name: string | null; total_amount: number; row_count: number; created_at: string;
};
type Line = { title: string | null; release_title: string | null; isrc: string | null; catalog_number: string | null; recording_id: string | null; amount: number; quantity: number };

const RecordingStatements = () => {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Statement | null>(null);

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ["recording-statements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recording_statements").select("*").order("period_start", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Statement[];
    },
  });

  const { data: lines = [], isLoading: linesLoading } = useQuery({
    queryKey: ["recording-statement-lines", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const all: Line[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("recording_statement_lines")
          .select("title,release_title,isrc,catalog_number,recording_id,amount,quantity")
          .eq("statement_id", selected!.id).order("id").range(from, from + 999);
        if (error) throw error;
        all.push(...(data as Line[]));
        if (data.length < 1000) break;
      }
      return all;
    },
  });

  const summary = useMemo(() => {
    const m = new Map<string, { title: string; isrc: string | null; linked: boolean; amount: number; quantity: number }>();
    for (const l of lines) {
      const k = l.isrc || l.catalog_number || l.title || l.release_title || "?";
      const cur = m.get(k) ?? { title: l.title || l.release_title || "–", isrc: l.isrc, linked: !!l.recording_id || (!l.isrc && !!l.catalog_number), amount: 0, quantity: 0 };
      cur.amount += Number(l.amount); cur.quantity += l.quantity;
      m.set(k, cur);
    }
    return [...m.values()].sort((a, b) => b.amount - a.amount);
  }, [lines]);
  const unlinked = summary.filter((s) => !s.linked);

  const upload = async (file: File) => {
    try {
      setBusy("Läser filen…");
      const parsed = await parseRecordingStatement(file);
      if (!parsed.lines.length) throw new Error("Filen innehåller inga försäljningsrader.");
      const label = `${parsed.source} ${parsed.periodStart ?? ""}${parsed.periodEnd && parsed.periodEnd !== parsed.periodStart ? ` – ${parsed.periodEnd}` : ""}`.trim();
      if (statements.some((s) => s.period_label === label)) {
        if (!confirm(`"${label}" finns redan uppladdad. Vill du lägga in den igen?`)) { setBusy(null); return; }
      }
      setBusy("Kopplar till inspelningar…");
      const recs: { id: string; isrc: string | null }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("recordings").select("id,isrc").range(from, from + 999);
        if (error) throw error;
        recs.push(...data);
        if (data.length < 1000) break;
      }
      const byIsrc = new Map(recs.filter((r) => r.isrc).map((r) => [r.isrc!.replace(/[\s-]/g, "").toUpperCase(), r.id]));
      const total = parsed.lines.reduce((a, l) => a + l.amount, 0);
      const { data: st, error: stErr } = await supabase.from("recording_statements").insert({
        source: parsed.source, period_label: label, currency: parsed.currency, file_name: file.name,
        period_start: parsed.periodStart ? `${parsed.periodStart}-01` : null,
        period_end: parsed.periodEnd ? `${parsed.periodEnd}-01` : null,
        total_amount: Math.round(total * 1e6) / 1e6, row_count: parsed.rawRows,
      }).select().single();
      if (stErr) throw stErr;
      const rows = parsed.lines.map((l) => ({ ...l, statement_id: st.id, recording_id: l.isrc ? byIsrc.get(l.isrc) ?? null : null }));
      for (let i = 0; i < rows.length; i += 1000) {
        setBusy(`Sparar rader… ${Math.min(i + 1000, rows.length)} / ${rows.length}`);
        const { error } = await supabase.from("recording_statement_lines").insert(rows.slice(i, i + 1000));
        if (error) {
          await supabase.from("recording_statements").delete().eq("id", st.id);
          throw error;
        }
      }
      const linked = rows.filter((r) => r.recording_id || (!r.isrc && r.catalog_number)).length;
      toast.success(`${label}: ${usd(total)} importerat. ${linked} av ${rows.length} rader kopplade.`);
      qc.invalidateQueries({ queryKey: ["recording-statements"] });
      qc.invalidateQueries({ queryKey: ["recording-income"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uppladdningen misslyckades");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recording_statements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["recording-statements"] });
      qc.invalidateQueries({ queryKey: ["recording-income"] });
      toast.success("Avräkningen är borttagen");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grand = statements.reduce((a, s) => a + Number(s.total_amount), 0);

  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><ArrowLeft className="mr-2 h-4 w-4" />Alla avräkningar</Button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge variant="outline">{selected.source}</Badge>
            <h1 className="mt-1 text-xl font-semibold">{selected.period_label}</h1>
            <p className="text-xs text-muted-foreground">{selected.file_name} · {selected.row_count.toLocaleString("sv-SE")} rader i filen</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums">{usd(Number(selected.total_amount))}</div>
            {unlinked.length > 0 && <div className="text-xs text-destructive">{unlinked.length} låtar saknar koppling (ISRC finns inte i Inspelningsrättigheter)</div>}
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr><th className="p-3">Låt / release</th><th className="p-3">ISRC</th><th className="p-3 text-right">Antal</th><th className="p-3 text-right">Intäkt</th></tr>
            </thead>
            <tbody>
              {linesLoading && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Laddar…</td></tr>}
              {summary.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{s.title} {!s.linked && <Badge variant="outline" className="ml-2 border-destructive text-destructive">Ej kopplad</Badge>}</td>
                  <td className="p-3 font-mono text-xs">{s.isrc || "–"}</td>
                  <td className="p-3 text-right tabular-nums">{s.quantity.toLocaleString("sv-SE")}</td>
                  <td className="p-3 text-right tabular-nums">{usd(s.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild><Link to="/recordings"><ArrowLeft className="mr-2 h-4 w-4" />Inspelningsrättigheter</Link></Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Avräkningar – inspelningsrättigheter</h1>
          <p className="text-sm text-muted-foreground">Intäkter från distributörer som DistroKid, TuneCore och Bandcamp. Hålls helt separat från STIM och WCM.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Totalt {usd(grand)}</span>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={!!busy}><Upload className="mr-2 h-4 w-4" />{busy ?? "Ladda upp avräkning"}</Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Avräkning</th><th className="p-3">Aktör</th><th className="p-3">Fil</th><th className="p-3 text-right">Rader</th><th className="p-3 text-right">Belopp</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Laddar…</td></tr>}
            {!isLoading && statements.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Inga avräkningar uppladdade än.</td></tr>}
            {statements.map((s) => (
              <tr key={s.id} className="cursor-pointer border-t hover:bg-muted/30" onClick={() => setSelected(s)}>
                <td className="p-3 font-medium">{s.period_label}</td>
                <td className="p-3"><Badge variant="outline">{s.source}</Badge></td>
                <td className="p-3 text-xs text-muted-foreground">{s.file_name}</td>
                <td className="p-3 text-right tabular-nums">{s.row_count.toLocaleString("sv-SE")}</td>
                <td className="p-3 text-right tabular-nums">{usd(Number(s.total_amount))}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" title="Ta bort" onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Ta bort ${s.period_label}? Alla rader i avräkningen raderas och det går inte att ångra.`)) remove.mutate(s.id);
                  }}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecordingStatements;
