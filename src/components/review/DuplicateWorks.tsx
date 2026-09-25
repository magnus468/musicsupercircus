import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useWorks } from "@/hooks/useWorks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

const key = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

const DuplicateWorks = () => {
  const { data: works = [], isLoading } = useWorks();
  const qc = useQueryClient();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const m = new Map<string, typeof works>();
    works.filter((w) => !hidden.has(w.id)).forEach((w) => {
      const k = `${key(w.title)}||${key(w.project)}`;
      m.set(k, [...(m.get(k) ?? []), w]);
    });
    return [...m.values()].filter((g) => g.length > 1).sort((a, b) => a[0].title.localeCompare(b[0].title, "sv"));
  }, [works, hidden]);

  const remove = async (id: string) => {
    setHidden((h) => new Set(h).add(id));
    const r = await Promise.all([
      supabase.from("agreement_works").delete().eq("work_id", id),
      supabase.from("recordings").update({ work_id: null }).eq("work_id", id),
      supabase.from("stim_works").update({ work_id: null, match_status: "unmatched" }).eq("work_id", id),
    ]);
    const { error } = r.find((x) => x.error) ?? (await supabase.from("works").delete().eq("id", id));
    if (error) {
      setHidden((h) => { const n = new Set(h); n.delete(id); return n; });
      return toast.error("Kunde inte ta bort verket");
    }
    qc.setQueriesData({ queryKey: ["works"] }, (old: unknown) =>
      Array.isArray(old) ? old.filter((w: { id: string }) => w.id !== id) : old);
    toast.success("Verket togs bort");
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Copy className="h-4 w-4" /> Möjliga dubbletter ({groups.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Verk med samma titel och projekt men olika upphovspersoner. Ta bort den version som är fel.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Laddar…</p> : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga möjliga dubbletter.</p>
        ) : (
          <div className="max-h-[60vh] divide-y overflow-y-auto rounded border">
            {groups.map((g) => (
              <div key={g[0].id} className="py-2">
                <div className="px-3 pb-1 text-sm font-medium">
                  {g[0].title} <span className="font-normal text-muted-foreground">· {g[0].project || "—"}</span>
                </div>
                {g.map((w) => (
                  <div key={w.id} className="flex flex-wrap items-center gap-3 bg-muted/40 px-6 py-1.5 text-xs">
                    <Link to={`/works/${w.id}`} className="text-primary underline underline-offset-2">Öppna</Link>
                    <span className="flex-1 text-muted-foreground">{w.creators || "(ingen upphovsperson)"}</span>
                    {w.stim_work_key && <span className="font-mono text-muted-foreground">{w.stim_work_key}</span>}
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => remove(w.id)} title="Ta bort denna version">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DuplicateWorks;
