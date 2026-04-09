import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkRevenueBreakdown } from "@/hooks/useWorkRevenueBreakdown";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Globe, Radio } from "lucide-react";

const COLORS = [
  "hsl(210, 80%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(35, 85%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(270, 55%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(50, 75%, 50%)",
  "hsl(15, 75%, 55%)",
  "hsl(130, 50%, 45%)",
  "hsl(300, 45%, 55%)",
];

const fmtKr = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr";

interface Props {
  workTitle: string | undefined;
}

const WorkRevenueCharts = ({ workTitle }: Props) => {
  const { byCountry, bySource } = useWorkRevenueBreakdown(workTitle);

  const countryData = byCountry.data;
  const sourceData = bySource.data;

  const totalRevenue = useMemo(
    () => countryData?.reduce((s, c) => s + c.total, 0) ?? 0,
    [countryData]
  );

  if (!countryData?.length && !sourceData?.length) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Country breakdown */}
      {countryData && countryData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Intäkter per land</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, countryData.length * 36)}>
              <BarChart data={countryData} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                <XAxis type="number" tickFormatter={(v) => fmtKr(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="country" width={90} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [fmtKr(value), "Belopp"]}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {countryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Percentage list */}
            <div className="mt-3 space-y-1.5">
              {countryData.slice(0, 8).map((c, i) => (
                <div key={c.country} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-foreground">{c.country}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {totalRevenue > 0 ? ((c.total / totalRevenue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source breakdown */}
      {sourceData && sourceData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Intäkter per källa</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="total"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                  label={({ source, percent }) =>
                    `${source} (${(percent * 100).toFixed(0)}%)`
                  }
                  labelLine={{ strokeWidth: 1 }}
                >
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [fmtKr(value), "Belopp"]}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend list */}
            <div className="mt-2 space-y-1.5">
              {sourceData.map((s, i) => (
                <div key={s.source} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-foreground">{s.source}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">{fmtKr(s.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkRevenueCharts;
