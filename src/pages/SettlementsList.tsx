import { useState, useMemo } from "react";
import { useSettlements, useSettlementStats } from "@/hooks/useSettlements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DollarSign, Music2, Globe, Search } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

const barColors = [
  "hsl(220, 70%, 45%)", "hsl(220, 70%, 55%)", "hsl(220, 70%, 65%)",
  "hsl(160, 60%, 45%)", "hsl(36, 90%, 55%)", "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)", "hsl(200, 70%, 50%)", "hsl(100, 50%, 45%)", "hsl(320, 60%, 50%)",
];

const SettlementsList = () => {
  const { data: stats, isLoading: statsLoading } = useSettlementStats();
  const { data: settlements, isLoading: listLoading } = useSettlements();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("overview");

  const filtered = useMemo(() => {
    if (!settlements) return [];
    if (!search.trim()) return settlements;
    const q = search.toLowerCase();
    return settlements.filter(
      (s) =>
        s.work_title.toLowerCase().includes(q) ||
        (s.composers?.toLowerCase().includes(q)) ||
        (s.country?.toLowerCase().includes(q)) ||
        (s.source?.toLowerCase().includes(q)) ||
        (s.production_title?.toLowerCase().includes(q))
    );
  }, [settlements, search]);

  if (statsLoading || listLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Laddar avräkningsdata...</div>;
  }

  if (!stats) return null;

  const workChartData = stats.topWorks.slice(0, 15).map(([name, amount]) => ({
    name: name.length > 22 ? name.slice(0, 20) + "…" : name,
    fullName: name,
    amount,
  }));

  const composerChartData = stats.topComposers.map(([name, amount]) => ({
    name: name.length > 22 ? name.slice(0, 20) + "…" : name,
    fullName: name,
    amount,
  }));

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="works">Per verk</TabsTrigger>
          <TabsTrigger value="details">Alla rader</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
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

            {/* By source */}
            <Card>
              <CardHeader><CardTitle className="text-base">Per källa</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topSources.map(([name, amount]) => (
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
        </TabsContent>

        {/* PER WORK TAB */}
        <TabsContent value="works" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Top 15 verk (intäkt)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workChartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" tickFormatter={(v) => fmt(v)} />
                    <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [fmt(value), "Belopp"]}
                      labelFormatter={(_label: string, payload: any[]) => payload?.[0]?.payload?.fullName || _label}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {workChartData.map((_, i) => (
                        <Cell key={i} fill={barColors[i % barColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Full work list table */}
          <Card>
            <CardHeader><CardTitle className="text-base">Alla verk ({stats.topWorks.length > 20 ? "top 20" : stats.topWorks.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Verk</TableHead>
                    <TableHead className="text-right">Belopp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topWorks.map(([title, amount]) => (
                    <TableRow key={title}>
                      <TableCell className="font-medium">{title}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALL ROWS TAB */}
        <TabsContent value="details" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök verk, kompositör, land, källa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">{filtered.length.toLocaleString("sv-SE")} rader</Badge>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Verk</TableHead>
                      <TableHead className="text-right">Belopp</TableHead>
                      <TableHead>Kompositör</TableHead>
                      <TableHead>Rättighet</TableHead>
                      <TableHead>Land</TableHead>
                      <TableHead>Källa</TableHead>
                      <TableHead>Underkälla</TableHead>
                      <TableHead>Produktion</TableHead>
                      <TableHead className="text-right">Användningar</TableHead>
                      <TableHead>Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 200).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium whitespace-nowrap">{s.work_title}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(Number(s.amount))}</TableCell>
                        <TableCell>{s.composers}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {s.type_of_right}
                          </Badge>
                        </TableCell>
                        <TableCell>{s.country}</TableCell>
                        <TableCell>{s.source}</TableCell>
                        <TableCell>{s.sub_source}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{s.production_title}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.number_of_uses}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {s.from_date && s.to_date ? `${s.from_date} – ${s.to_date}` : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length > 200 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Visar 200 av {filtered.length.toLocaleString("sv-SE")} rader. Använd sökfältet för att filtrera.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettlementsList;
