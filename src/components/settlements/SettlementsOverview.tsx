import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, Music2, Globe, Search } from "lucide-react";
import type { SettlementStats } from "@/hooks/useSettlements";
import { CountryWorksDialog } from "./CountryWorksDialog";

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

const barColors = [
  "hsl(220, 70%, 45%)", "hsl(220, 70%, 55%)", "hsl(220, 70%, 65%)",
  "hsl(160, 60%, 45%)", "hsl(36, 90%, 55%)", "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)", "hsl(200, 70%, 50%)", "hsl(100, 50%, 45%)", "hsl(320, 60%, 50%)",
];

interface Props {
  stats: SettlementStats;
}

export const SettlementsOverview = ({ stats }: Props) => {
  const composerChartData = stats.topComposers.map(([name, amount]) => ({
    name: name.length > 22 ? name.slice(0, 20) + "…" : name,
    fullName: name,
    amount,
  }));

  return (
    <>
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="flex items-center gap-4 p-6 relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Totalt belopp</p>
              <p className="text-xl font-bold tabular-nums">{fmt(stats.totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <CardContent className="flex items-center gap-4 p-6 relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 ring-1 ring-success/20">
              <Music2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unika verk</p>
              <p className="text-xl font-bold tabular-nums">{stats.uniqueWorks}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <CardContent className="flex items-center gap-4 p-6 relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 ring-1 ring-violet-200">
              <Globe className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Länder</p>
              <p className="text-xl font-bold tabular-nums">{stats.uniqueCountries}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          <CardContent className="flex items-center gap-4 p-6 relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
              <Search className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Totalt rader</p>
              <p className="text-xl font-bold tabular-nums">{stats.totalRows.toLocaleString("sv-SE")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By type of right */}
        <Card>
          <CardHeader><CardTitle className="text-base">Per rättighetstyp</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byRight)
                .sort((a, b) => b[1] - a[1])
                .map(([name, amount]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span>{name}</span>
                    <span className="font-medium tabular-nums">{fmt(amount)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* By country */}
        <Card>
          <CardHeader><CardTitle className="text-base">Per land</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topCountries.map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-medium tabular-nums">{fmt(amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top countries */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top 10 länder</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topCountries.map(([name, amount]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-32 text-sm text-muted-foreground">{name}</span>
                <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-md transition-all duration-500 flex items-center px-3"
                    style={{ width: `${Math.max((amount / stats.topCountries[0][1]) * 100, 4)}%` }}
                  >
                    <span className="text-xs font-medium text-primary-foreground whitespace-nowrap">{fmt(amount)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top composers chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top upphovspersoner (intäkt)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={composerChartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tickFormatter={(v) => fmt(v)} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [fmt(value), "Belopp"]} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {composerChartData.map((_, i) => (
                    <Cell key={i} fill={barColors[i % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
