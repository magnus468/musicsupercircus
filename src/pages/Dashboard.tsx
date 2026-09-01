import { useMemo, useState } from "react";
import { useWorksStats } from "@/hooks/useWorks";
import { useSettlementStats } from "@/hooks/useSettlements";
import { isStimPeriod, resolveStimPayoutLabels } from "@/components/settlements/settlementPeriodGrouping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music2, Users, FileCheck, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const fmtKr = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

const MONTH_INDEX: Record<string, number> = {
  januari: 1, februari: 2, mars: 3, april: 4, maj: 5, juni: 6,
  juli: 7, augusti: 8, september: 9, oktober: 10, november: 11, december: 12,
};

/** Chronological sort value for a period label like "Juni 2026" or "Warner/Chappell H1 2026" */
const periodSortDate = (label: string): number => {
  const monthMatch = label.match(/(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+(\d{4})/i);
  if (monthMatch) {
    return Number(monthMatch[2]) * 100 + (MONTH_INDEX[monthMatch[1].toLowerCase()] ?? 0);
  }
  const halfMatch = label.match(/H([12])\s*(\d{4})/i);
  if (halfMatch) {
    return Number(halfMatch[2]) * 100 + (halfMatch[1] === "2" ? 12 : 6);
  }
  return 0;
};

interface TopWorksCardProps {
  title: string;
  works: [string, number][];
  isLoading?: boolean;
}

const INITIAL_SHOWN = 10;

const TopWorksCard = ({ title, works, isLoading }: TopWorksCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? works : works.slice(0, INITIAL_SHOWN);
  const canExpand = works.length > INITIAL_SHOWN;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayed.map(([name, amount], idx) => (
            <div key={name} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {idx + 1}
                </span>
                <span className="truncate">{name}</span>
              </span>
              <span className="font-medium tabular-nums whitespace-nowrap">{fmtKr(amount)}</span>
            </div>
          ))}
          {isLoading && <p className="text-sm text-muted-foreground">Laddar…</p>}
          {!isLoading && works.length === 0 && (
            <p className="text-sm text-muted-foreground">Ingen avräkningsdata ännu</p>
          )}
        </div>
        {canExpand && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 w-full"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                Visa färre <ChevronUp className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Visa alla ({works.length}) <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { data: stats, isLoading } = useWorksStats();
  const { data: allTimeSettlements } = useSettlementStats(null);

  // Group periods the same way as the settlements page, then pick the chronologically latest
  const latestPeriod = useMemo(() => {
    const periods = allTimeSettlements?.periods;
    if (!periods || periods.length === 0) return null;
    const stimLabels = resolveStimPayoutLabels(periods);
    const groups = new Map<string, { label: string; keys: string[]; sortDate: number }>();
    for (const p of periods) {
      const label = isStimPeriod(p.distributionKey)
        ? stimLabels.get(p.distributionKey) ?? p.distribution
        : p.distribution;
      const groupKey = isStimPeriod(p.distributionKey) ? `stim-${label}` : p.distributionKey;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { label, keys: [], sortDate: periodSortDate(label) });
      }
      groups.get(groupKey)!.keys.push(p.distributionKey);
    }
    return Array.from(groups.values()).sort((a, b) => b.sortDate - a.sortDate)[0] ?? null;
  }, [allTimeSettlements]);

  const latestPeriodKey = latestPeriod ? latestPeriod.keys.join(",") : null;
  const { data: latestSettlements } = useSettlementStats(latestPeriodKey);
  const latestPeriodName = latestPeriod?.label ?? null;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Laddar statistik…</div>;
  }

  if (!stats) return null;


  const creatorData = stats.topCreators.map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 18) + "…" : name, fullName: name, count }));
  const barColors = ["hsl(220, 70%, 45%)", "hsl(220, 70%, 55%)", "hsl(220, 70%, 65%)", "hsl(220, 60%, 50%)", "hsl(36, 90%, 55%)"];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden relative group hover:shadow-md transition-shadow duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="flex items-center gap-4 p-6 relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Music2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Totalt antal verk</p>
              <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden relative group hover:shadow-md transition-shadow duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardContent className="flex items-center gap-4 p-6 relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 ring-1 ring-success/20">
              <FileCheck className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Anmälda till STIM</p>
              <p className="text-2xl font-bold tabular-nums">{stats.byStimStatus.anmäld}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden relative group hover:shadow-md transition-shadow duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <CardContent className="flex items-center gap-4 p-6 relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Co-publishing</p>
              <p className="text-2xl font-bold tabular-nums">{stats.byType.MSCE + stats.byType.MSCP}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden relative group hover:shadow-md transition-shadow duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <CardContent className="flex items-center gap-4 p-6 relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 ring-1 ring-violet-200">
              <Users className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upphovspersoner</p>
              <p className="text-2xl font-bold tabular-nums">{stats.topCreators.length}+</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopWorksCard
          title="Topp verk – alla tider"
          works={allTimeSettlements?.topWorks ?? []}
          isLoading={!allTimeSettlements}
        />
        <TopWorksCard
          title={`Topp verk – senaste avräkningen${latestPeriodName ? ` (${latestPeriodName})` : ""}`}
          works={latestSettlements?.topWorks ?? []}
          isLoading={!latestSettlements}
        />
      </div>

      {/* Top creators chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top 15 upphovspersoner</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={creatorData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number, _name: string, props: any) => [value, props.payload.fullName]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {creatorData.map((_, i) => (
                    <Cell key={i} fill={barColors[i % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
