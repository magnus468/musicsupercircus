import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type SplitRow = { recipient: string; share: number };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  trackTitle: string;
  recordingId: string;
  albumRecordingIds: string[];
  initial: SplitRow[];
  onSaved: () => void;
};

// Andelar anges i procent med svensk decimal (komma eller punkt)
const parsePct = (v: string) => {
  const x = parseFloat(v.replace(",", "."));
  return isNaN(x) ? 0 : x;
};

const SplitEditorDialog = ({ open, onOpenChange, trackTitle, recordingId, albumRecordingIds, initial, onSaved }: Props) => {
  const [rows, setRows] = useState<{ recipient: string; share: string }[]>([]);
  const [allTracks, setAllTracks] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRows(initial.length ? initial.map((r) => ({ recipient: r.recipient, share: String(r.share).replace(".", ",") })) : [{ recipient: "", share: "" }]);
      setAllTracks(false);
    }
  }, [open, initial]);

  const sum = rows.reduce((a, r) => a + parsePct(r.share), 0);
  const sumOk = Math.abs(sum - 100) < 0.011;

  const save = async () => {
    const clean = rows.filter((r) => r.recipient.trim()).map((r, i) => ({ recipient: r.recipient.trim(), share: parsePct(r.share), sort: i }));
    if (!clean.length) return toast.error("Lägg till minst en mottagare");
    if (!sumOk && !confirm(`Andelarna blir ${sum.toFixed(2).replace(".", ",")} %, inte 100 %. Spara ändå?`)) return;
    setSaving(true);
    try {
      const ids = allTracks ? albumRecordingIds : [recordingId];
      const { error: delErr } = await supabase.from("recording_splits").delete().in("recording_id", ids);
      if (delErr) throw delErr;
      const { error } = await supabase.from("recording_splits").insert(ids.flatMap((id) => clean.map((c) => ({ ...c, recording_id: id }))));
      if (error) throw error;
      toast.success(allTracks ? `Fördelningen sparad på ${ids.length} spår` : "Fördelningen sparad");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Fördelning – {trackTitle}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="Mottagare, t.ex. Patrik Andrén Produktion AB" value={r.recipient}
                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, recipient: e.target.value } : x)))} />
              <div className="relative w-28 shrink-0">
                <Input inputMode="decimal" value={r.share} className="pr-6 text-right"
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, share: e.target.value } : x)))} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setRows([...rows, { recipient: "", share: "" }])}><Plus className="mr-1 h-4 w-4" />Lägg till mottagare</Button>
            <span className={`text-sm tabular-nums ${sumOk ? "text-muted-foreground" : "text-destructive"}`}>Summa {sum.toFixed(2).replace(".", ",")} %</span>
          </div>
          {albumRecordingIds.length > 1 && (
            <label className="flex items-center gap-2 pt-2 text-sm">
              <Checkbox checked={allTracks} onCheckedChange={(v) => setAllTracks(!!v)} />
              Använd samma fördelning på alla {albumRecordingIds.length} spår på albumet
            </label>
          )}
          <Button className="w-full" onClick={save} disabled={saving}>Spara</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SplitEditorDialog;
