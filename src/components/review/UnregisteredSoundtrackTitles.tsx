import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Disc3 } from "lucide-react";

type Row = { id: string; track: string; project: string; isrc: string | null; composer: string | null; income: number; income_rows: number };

const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " kr";

const UnregisteredSoundtrackTitles = () => {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["unregistered-soundtrack-titles"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unregistered_soundtrack_titles");
      if (error) throw error;
      return (data as unknown as Row[]) ?? [];
    },
  });

  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    data.forEach((r) => m.set(r.project, [...(m.get(r.project) ?? []), r]));
    return [...m.entries()];
  }, [data]);
  const paid = data.filter((r) => r.income > 0).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Disc3 className="h-4 w-4" /> Soundtrack-titlar utan registrerat verk
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Inspelningar där projektet finns som verk, men låttiteln saknas i verklistan.
          {!isLoading && ` ${data.length} titlar, varav ${paid} har gett inkomster (alltså korrekt registrerade hos STIM).`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Laddar…</p>}
        {error && <p className="text-sm text-destructive">Kunde inte ladda listan.</p>}
        {groups.map(([project, rows]) => (
          <div key={project}>
            <h4 className="mb-1 text-sm font-semibold">{project} <span className="font-normal text-muted-foreground">({rows.length})</span></h4>
            <div className="divide-y rounded border">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1 min-w-[12rem] font-medium">{r.track}</span>
                  <span className="font-mono text-xs text-muted-foreground">{r.isrc}</span>
                  <span className="text-xs text-muted-foreground">{r.composer}</span>
                  {r.income > 0
                    ? <Badge variant="secondary">Inkomst {fmt(r.income)}</Badge>
                    : <Badge variant="outline">Ingen inkomst</Badge>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default UnregisteredSoundtrackTitles;
