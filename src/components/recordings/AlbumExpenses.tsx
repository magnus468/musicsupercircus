import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const sek = (v: number) => v.toLocaleString("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 });
// Svensk decimal: komma = decimal, mellanslag = tusental
const parseSek = (v: string) => parseFloat(v.replace(/[\s\u00a0]/g, "").replace(/kr/i, "").replace(",", "."));

type Props = { albumKey: string; recipients: string[]; sheetNote: string | null };

const AlbumExpenses = ({ albumKey, recipients, sheetNote }: Props) => {
  const qc = useQueryClient();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [all, setAll] = useState(true);
  const [bearers, setBearers] = useState<string[]>([]);

  const { data: expenses = [] } = useQuery({
    queryKey: ["recording-expenses", albumKey],
    queryFn: async () => {
      const { data, error } = await supabase.from("recording_expenses").select("*").eq("album_key", albumKey).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const { data: recoup } = useQuery({
    queryKey: ["album-recoup", albumKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_album_recoup", { p_album_key: albumKey });
      if (error) throw error;
      return data as { expenses_sek: number; recouped_sek: number; statements_missing_rate: number };
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["recording-expenses", albumKey] });
    qc.invalidateQueries({ queryKey: ["album-recoup", albumKey] });
    qc.invalidateQueries({ queryKey: ["recording-payouts"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const n = parseSek(amount);
      if (!desc.trim() || isNaN(n) || n <= 0) throw new Error("Ange beskrivning och belopp i kronor");
      if (!all && !bearers.length) throw new Error("Välj minst en mottagare som bär kostnaden");
      const { error } = await supabase.from("recording_expenses").insert({ album_key: albumKey, description: desc.trim(), amount_sek: n, bearers: all ? null : bearers });
      if (error) throw error;
    },
    onSuccess: () => { setDesc(""); setAmount(""); setAll(true); setBearers([]); refresh(); toast.success("Kostnaden är tillagd"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recording_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const total = Number(recoup?.expenses_sek ?? 0);
  const done = Math.min(Number(recoup?.recouped_sek ?? 0), total);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div>
          <h2 className="font-medium">Kostnader att recoupa</h2>
          <p className="text-xs text-muted-foreground">Dras från intäkterna innan royalties betalas ut.</p>
        </div>
        {total > 0 && (
          <div className="text-right text-sm">
            <div className="tabular-nums">{sek(done)} av {sek(total)} recoupat</div>
            <div className={`text-xs ${total - done > 0.5 ? "text-destructive" : "text-muted-foreground"}`}>
              {total - done > 0.5 ? `${sek(total - done)} kvar` : "Helt recoupat"}
            </div>
          </div>
        )}
      </div>
      {sheetNote && <p className="border-b bg-muted/30 p-3 text-xs text-muted-foreground whitespace-pre-line">Från ISRC-arket: {sheetNote}</p>}
      {!!recoup?.statements_missing_rate && (
        <p className="border-b p-3 text-xs text-destructive">{recoup.statements_missing_rate} avräkning(ar) saknar USD/SEK-kurs och räknas inte in förrän kursen är angiven.</p>
      )}
      <table className="w-full text-sm">
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} className="border-t first:border-t-0">
              <td className="p-3">{e.description}</td>
              <td className="p-3 text-xs">{e.bearers?.length ? e.bearers.map((b) => <Badge key={b} variant="outline" className="mr-1">{b}</Badge>) : <span className="text-muted-foreground">Alla mottagare</span>}</td>
              <td className="p-3 text-right tabular-nums">{sek(Number(e.amount_sek))}</td>
              <td className="w-10 p-3"><Button variant="ghost" size="icon" title="Ta bort" onClick={() => confirm(`Ta bort "${e.description}"?`) && remove.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-3 border-t p-3">
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="T.ex. Mastering" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Input className="w-36" placeholder="Belopp kr" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button onClick={() => add.mutate()} disabled={add.isPending}><Plus className="mr-1 h-4 w-4" />Lägg till</Button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-xs text-muted-foreground">Bärs av:</span>
          <label className="flex items-center gap-2"><Checkbox checked={all} onCheckedChange={(v) => setAll(!!v)} />Alla mottagare</label>
          {!all && recipients.map((r) => (
            <label key={r} className="flex items-center gap-2">
              <Checkbox checked={bearers.includes(r)} onCheckedChange={(v) => setBearers((b) => (v ? [...b, r] : b.filter((x) => x !== r)))} />{r}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlbumExpenses;
