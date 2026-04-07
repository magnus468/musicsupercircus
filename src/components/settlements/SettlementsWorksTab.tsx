import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { SettlementStats } from "@/hooks/useSettlements";

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

export const SettlementsWorksTab = ({ stats }: Props) => {
  const workChartData = stats.topWorks.slice(0, 15).map(([name, amount]) => ({
    name: name.length > 22 ? name.slice(0, 20) + "…" : name,
    fullName: name,
    amount,
  }));

  return (
    <>
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
    </>
  );
};
