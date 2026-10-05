import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { parseRecordingStatement } from "@/lib/recordingStatementParser";

const usd = (v: number) => v.toLocaleString("sv-SE", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

type Statement = {
  id: string; source: string; period_label: string; period_start: string | null; period_end: string | null;
  currency: string; file_name: string | null; total_amount: number; row_count: number; created_at: string; usd_sek_rate: number | null;
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

  const { data: payouts } = useQuery({
    queryKey: ["recording-payouts", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_statement_payouts", { p_statement_id: selected!.id });
      if (error) throw error;
      return data as {
        total: number; distributed: number; recouped: number; missing_rate: boolean; has_expenses: boolean;
        recipients: { recipient: string; gross: number; recouped: number; total: number; albums: number }[];
      };
    },
  });

  const saveRate = async (v: string) => {
    if (!selected) return;
    const t = v.trim().replace(/\s/g, "").replace(",", ".");
    const n = t ? parseFloat(t) : null;
    if (n !== null && (isNaN(n) || n <= 0)) { toast.error("Ogiltig växelkurs"); return; }
    if (n === (selected.usd_sek_rate ?? null)) return;
    const { error } = await supabase.from("recording_statements").update({ usd_sek_rate: n }).eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    setSelected({ ...selected, usd_sek_rate: n });
    qc.invalidateQueries({ queryKey: ["recording-statements"] });
    qc.invalidateQueries({ queryKey: ["recording-payouts"] });
    qc.invalidateQueries({ queryKey: ["album-recoup"] });
    toast.success("Växelkursen är sparad");
  };

  const exportPayouts = () => {
    if (!payouts || !selected) return;
    const f = (n: number) => n.toFixed(2).replace(".", ",");
    const rows = [["Mottagare", "Brutto (USD)", "Recoup (USD)", "Att betala (USD)"], ...payouts.recipients.map((r) => [r.recipient, f(r.gross), f(r.recouped), f(r.total)])];
    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `Utbetalning ${selected.period_label}.csv`;
    a.click();
  };

  const [groupBy, setGroupBy] = useState<"track" | "album">("track");
  const { data: recAlbums } = useQuery({
    queryKey: ["recording-album-names"],
    enabled: !!selected && groupBy === "album",
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const m = new Map<string, string>();
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("recordings").select("id,album,spotify_album,project").range(from, from + 999);
        if (error) throw error;
        for (const r of data) m.set(r.id, (r.album || r.spotify_album || r.project || "Okänt album").trim());
        if (data.length < 1000) break;
      }
      return m;
    },
  });
  const albumSummary = useMemo(() => {
    const m = new Map<string, { key: string; name: string; linked: boolean; tracks: Set<string>; amount: number; quantity: number }>();
    for (const l of lines) {
      const name = l.recording_id ? recAlbums?.get(l.recording_id) ?? "…" : l.release_title || l.title || "Okänt";
      const key = l.recording_id ? name.toLowerCase() : `x:${name.toLowerCase()}`;
      const cur = m.get(key) ?? { key: l.recording_id ? name.toLowerCase() : name, name, linked: !!l.recording_id, tracks: new Set<string>(), amount: 0, quantity: 0 };
      cur.amount += Number(l.amount); cur.quantity += l.quantity;
      cur.tracks.add(l.recording_id || l.isrc || l.title || "?");
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => b.amount - a.amount);
  }, [lines, recAlbums]);

  const summary = useMemo(() => {
    const m = new Map<string, { title: string; isrc: string | null; linked: boolean; amount: number; quantity: number }>();
    for (const l of lines) {
      const k = l.isrc || l.catalog_number || l.title || l.release_title || "?";
      const cur = m.get(k) ?? { title: l.title || l.release_title || "–", isrc: l.isrc, linked: !!l.recording_id, amount: 0, quantity: 0 };
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
      type Rec = { id: string; isrc: string | null; catalog_number: string | null; album: string | null; spotify_album: string | null; project: string | null; track: string };
      const recs: Rec[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("recordings").select("id,isrc,catalog_number,album,spotify_album,project,track").range(from, from + 999);
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
      // Albumförsäljning (utan ISRC) fördelas lika på albumets spår via katalognummer.
      // Om flera album delar katalognummer används det album vars namn stämmer.
      const norm = (t: string | null) => (t ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’'"]/g, "").replace(/\s+/g, " ").trim();
      const albumOf = (r: Rec) => norm(r.album || r.spotify_album || r.project);
      const byCatalog = new Map<string, Rec[]>();
      for (const r of recs) if (r.catalog_number) byCatalog.set(r.catalog_number, [...(byCatalog.get(r.catalog_number) ?? []), r]);
      const rows = parsed.lines.flatMap((l) => {
        if (!l.isrc && l.catalog_number) {
          let tracks = byCatalog.get(l.catalog_number) ?? [];
          if (new Set(tracks.map(albumOf)).size > 1) tracks = tracks.filter((r) => albumOf(r) === norm(l.release_title));
          if (tracks.length) {
            return tracks.map((r) => ({
              ...l, statement_id: st.id, recording_id: r.id, isrc: r.isrc?.replace(/[\s-]/g, "").toUpperCase() ?? null,
              title: r.track, sale_type: "Album (fördelat per spår)", amount: l.amount / tracks.length,
            }));
          }
        }
        return [{ ...l, statement_id: st.id, recording_id: l.isrc ? byIsrc.get(l.isrc) ?? null : null }];
      });
      for (let i = 0; i < rows.length; i += 1000) {
        setBusy(`Sparar rader… ${Math.min(i + 1000, rows.length)} / ${rows.length}`);
        const { error } = await supabase.from("recording_statement_lines").insert(rows.slice(i, i + 1000));
        if (error) {
          await supabase.from("recording_statements").delete().eq("id", st.id);
          throw error;
        }
      }
      const linked = rows.filter((r) => r.recording_id).length;
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
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 text-sm">
          <span>Växelkurs USD → SEK:</span>
          <Input key={selected.id} className="w-28" defaultValue={selected.usd_sek_rate != null ? String(selected.usd_sek_rate).replace(".", ",") : ""} placeholder="t.ex. 9,45"
            onBlur={(e) => saveRate(e.target.value)} />
          <span className="text-xs text-muted-foreground">Används för att dra albumkostnader (i kronor) från intäkterna innan utbetalning.</span>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-3">
            <div>
              <h2 className="font-medium">Utbetalning per mottagare</h2>
              {payouts && payouts.total - payouts.distributed > 0.005 && (
                <p className="text-xs text-destructive">{usd(payouts.total - payouts.distributed)} kunde inte fördelas (låtar utan koppling eller utan fördelning)</p>
              )}
              {payouts?.missing_rate && payouts.has_expenses && (
                <p className="text-xs text-destructive">Ange växelkurs – det finns album med kostnader som ska recoupas.</p>
              )}
              {!!payouts?.recouped && <p className="text-xs text-muted-foreground">{usd(payouts.recouped)} dras för recoup av albumkostnader.</p>}
            </div>
            <Button variant="outline" size="sm" onClick={exportPayouts} disabled={!payouts?.recipients.length}>Exportera underlag</Button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr><th className="p-3">Mottagare</th><th className="p-3 text-right">Brutto</th><th className="p-3 text-right">Recoup</th><th className="p-3 text-right">Att betala</th></tr>
            </thead>
            <tbody>
              {!payouts && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Räknar…</td></tr>}
              {payouts?.recipients.map((r) => (
                <tr key={r.recipient} className="border-t">
                  <td className="p-3 font-medium">{r.recipient} <span className="text-xs font-normal text-muted-foreground">· {r.albums} album</span></td>
                  <td className="p-3 text-right tabular-nums">{usd(r.gross)}</td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">{r.recouped > 0.005 ? `−${usd(r.recouped)}` : "–"}</td>
                  <td className="p-3 text-right font-medium tabular-nums">{usd(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-3">
            <h2 className="font-medium">Intäkter {groupBy === "track" ? "per låt" : "per album"}</h2>
            <div className="flex rounded-md border">
              <Button variant={groupBy === "track" ? "secondary" : "ghost"} size="sm" className="rounded-r-none" onClick={() => setGroupBy("track")}>Per låt</Button>
              <Button variant={groupBy === "album" ? "secondary" : "ghost"} size="sm" className="rounded-l-none" onClick={() => setGroupBy("album")}>Per album</Button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              {groupBy === "track"
                ? <tr><th className="p-3">Låt / release</th><th className="p-3">ISRC</th><th className="p-3 text-right">Antal</th><th className="p-3 text-right">Intäkt</th></tr>
                : <tr><th className="p-3">Album</th><th className="p-3">Spår</th><th className="p-3 text-right">Antal</th><th className="p-3 text-right">Intäkt</th></tr>}
            </thead>
            <tbody>
              {linesLoading && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Laddar…</td></tr>}
              {groupBy === "track" && summary.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{s.title} {!s.linked && <Badge variant="outline" className="ml-2 border-destructive text-destructive">Ej kopplad</Badge>}</td>
                  <td className="p-3 font-mono text-xs">{s.isrc || "–"}</td>
                  <td className="p-3 text-right tabular-nums">{s.quantity.toLocaleString("sv-SE")}</td>
                  <td className="p-3 text-right tabular-nums">{usd(s.amount)}</td>
                </tr>
              ))}
              {groupBy === "album" && albumSummary.map((a) => (
                <tr key={a.key} className="border-t">
                  <td className="p-3">
                    {a.linked ? <Link to={`/recordings/album/${encodeURIComponent(a.key)}`} className="text-primary hover:underline">{a.name}</Link> : a.name}
                    {!a.linked && <Badge variant="outline" className="ml-2 border-destructive text-destructive">Ej kopplad</Badge>}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{a.tracks.size}</td>
                  <td className="p-3 text-right tabular-nums">{a.quantity.toLocaleString("sv-SE")}</td>
                  <td className="p-3 text-right tabular-nums">{usd(a.amount)}</td>
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
