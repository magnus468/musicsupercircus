import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorks } from "@/hooks/useWorks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileCheck2 } from "lucide-react";
import { toast } from "sonner";

type StimRow = {
  id: string; ice_work_key: string; title: string; creators: string | null;
  work_type: string | null; conflict: boolean; work_id: string | null; match_status: string;
};

const norm = (s: string | null | undefined) =>
  (s ?? "").trim().replace(/^"|"$/g, "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "").replace(/\s+/g, " ");

const StimReconciliation = () => {
  const qc = useQueryClient();
  const { data: works = [] } = useWorks();
  const [filter, setFilter] = useState("");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["stim-works"],
    queryFn: async () => {
      const all: StimRow[] = [];
      for (let from = 0; from < 10000; from += 1000) {
        const { data, error } = await supabase.from("stim_works")
          .select("id, ice_work_key, title, creators, work_type, conflict, work_id, match_status")
          .order("title").range(from, from + 999);
        if (error) throw error;
        all.push(...(data as StimRow[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  const worksByTitle = useMemo(() => {
    const m = new Map<string, typeof works>();
    works.forEach((w) => m.set(norm(w.title), [...(m.get(norm(w.title)) ?? []), w]));
    return m;
  }, [works]);

  const f = norm(filter);
  const match = (t: string, c?: string | null) => !f || norm(t).includes(f) || norm(c).includes(f);
  const unmatched = rows.filter((r) => r.match_status === "unmatched" && match(r.title, r.creators));
  const uncertain = rows.filter((r) => r.match_status === "uncertain" && match(r.title, r.creators));
  const linked = new Set(rows.filter((r) => r.work_id).map((r) => r.work_id));
  const missingAtStim = works.filter((w) => !linked.has(w.id) && match(w.title, w.creators));
  const matchedCount = rows.filter((r) => r.match_status === "matched").length;

  const link = async (r: StimRow, workId: string | null) => {
    const status = workId ? "matched" : "unmatched";
    const { error } = await supabase.from("stim_works").update({ work_id: workId, match_status: status }).eq("id", r.id);
    if (!error && workId) {
      await supabase.from("works").update({ stim_work_key: r.ice_work_key, stim_conflict: r.conflict }).eq("id", workId);
    }
    if (error) return toast.error("Kunde inte spara");
    toast.success(workId ? "Kopplad" : "Markerad som ej i katalogen");
    qc.invalidateQueries({ queryKey: ["stim-works"] });
  };

  const StimLine = ({ r, children }: { r: StimRow; children?: React.ReactNode }) => (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
      <span className="min-w-[12rem] flex-1 font-medium">{r.title}</span>
      <span className="font-mono text-xs text-muted-foreground">{r.ice_work_key}</span>
      <span className="text-xs text-muted-foreground">{r.creators}</span>
      {r.work_type && <Badge variant="outline">{r.work_type}</Badge>}
      {r.conflict && <Badge variant="destructive">Konflikt</Badge>}
      {children}
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileCheck2 className="h-4 w-4" /> STIM-avstämning (MSCE)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Laddar…" : `${rows.length} verk hos STIM, ${matchedCount} säkert kopplade (titel + upphovsperson).`}
        </p>
        <Input placeholder="Filtrera på titel eller upphovsperson…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="uncertain">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="uncertain">Osäker matchning ({uncertain.length})</TabsTrigger>
            <TabsTrigger value="unmatched">Hos STIM, ej i katalogen ({unmatched.length})</TabsTrigger>
            <TabsTrigger value="missing">I katalogen, ej hos STIM ({missingAtStim.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="uncertain" className="max-h-[60vh] divide-y overflow-y-auto rounded border">
            {uncertain.map((r) => {
              const cands = worksByTitle.get(norm(r.title)) ?? [];
              return (
                <div key={r.id}>
                  <StimLine r={r}>
                    <Button size="sm" variant="ghost" onClick={() => link(r, null)}>Inget av dessa</Button>
                  </StimLine>
                  {cands.map((w) => (
                    <div key={w.id} className="flex flex-wrap items-center gap-3 bg-muted/40 px-6 py-1.5 text-xs">
                      <Link to={`/works/${w.id}`} className="text-primary underline underline-offset-2">{w.title}</Link>
                      <span className="text-muted-foreground">{w.project || "—"}</span>
                      <span className="flex-1 text-muted-foreground">{w.creators}</span>
                      <Button size="sm" variant="outline" className="h-7" onClick={() => link(r, w.id)}>Koppla</Button>
                    </div>
                  ))}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="unmatched" className="max-h-[60vh] divide-y overflow-y-auto rounded border">
            {unmatched.map((r) => <StimLine key={r.id} r={r} />)}
          </TabsContent>

          <TabsContent value="missing" className="max-h-[60vh] divide-y overflow-y-auto rounded border">
            {missingAtStim.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <Link to={`/works/${w.id}`} className="min-w-[12rem] flex-1 font-medium text-primary underline underline-offset-2">{w.title}</Link>
                <span className="text-xs text-muted-foreground">{w.project || "—"}</span>
                <Badge variant="outline">{w.stim_status}</Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StimReconciliation;
