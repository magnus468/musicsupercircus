import { useWorksStats } from "@/hooks/useWorks";
import { useSettlementStats } from "@/hooks/useSettlements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music2, Users, FileCheck, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const fmtKr = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

const Dashboard = () => {
  const { data: stats, isLoading } = useWorksStats();
  const { data: allTimeSettlements } = useSettlementStats(null);
  const latestPeriodKey =
    allTimeSettlements?.periods
      ?.map((p) => p.distributionKey)
      .sort()
      .at(-1) ?? null;
  const { data: latestSettlements } = useSettlementStats(latestPeriodKey);
  const latestPeriodName =
    allTimeSettlements?.periods?.find((p) => p.distributionKey === latestPeriodKey)?.distribution ??
    latestPeriodKey;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Laddar statistik...</div>;
  }

  if (!stats) return null;

  const typeData = [
    { name: "Original", value: stats.byType.original },
    { name: "MSCE", value: stats.byType.MSCE },
    { name: "MSCP", value: stats.byType.MSCP },
  ];

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
        {/* Top songs all time */}
        <Card>
          <CardHeader><CardTitle className="text-base">Topp verk – alla tider</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(allTimeSettlements?.topWorks ?? []).map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate">{name}</span>
                  <span className="font-medium tabular-nums whitespace-nowrap">{fmtKr(amount)}</span>
                </div>
              ))}
              {!allTimeSettlements && (
                <p className="text-sm text-muted-foreground">Laddar…</p>
              )}
              {allTimeSettlements && allTimeSettlements.topWorks.length === 0 && (
                <p className="text-sm text-muted-foreground">Ingen avräkningsdata ännu</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top songs latest settlement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Topp verk – senaste avräkningen{latestPeriodName ? ` (${latestPeriodName})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(latestSettlements?.topWorks ?? []).map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate">{name}</span>
                  <span className="font-medium tabular-nums whitespace-nowrap">{fmtKr(amount)}</span>
                </div>
              ))}
              {!latestSettlements && (
                <p className="text-sm text-muted-foreground">Laddar…</p>
              )}
              {latestSettlements && latestSettlements.topWorks.length === 0 && (
                <p className="text-sm text-muted-foreground">Ingen avräkningsdata ännu</p>
              )}
            </div>
          </CardContent>
        </Card>
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
