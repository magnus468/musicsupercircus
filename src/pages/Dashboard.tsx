import { useWorksStats } from "@/hooks/useWorks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music2, Users, FileCheck, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const Dashboard = () => {
  const { data: stats, isLoading } = useWorksStats();

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
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Music2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Totalt antal verk</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
              <FileCheck className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Anmälda till STIM</p>
              <p className="text-2xl font-bold">{stats.byStimStatus.anmäld}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Co-publishing</p>
              <p className="text-2xl font-bold">{stats.byType.MSCE + stats.byType.MSCP}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upphovspersoner</p>
              <p className="text-2xl font-bold">{stats.topCreators.length}+</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Publishing type breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Internt förlag</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typeData.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-muted-foreground">{d.name}</span>
                  <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-md transition-all duration-500 flex items-center px-3"
                      style={{ width: `${Math.max((d.value / stats.total) * 100, 4)}%` }}
                    >
                      <span className="text-xs font-medium text-primary-foreground">{d.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Co-publishers */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top co-publishers</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topCoPublishers.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-medium text-muted-foreground">{count} verk</span>
                </div>
              ))}
              {stats.topCoPublishers.length === 0 && (
                <p className="text-sm text-muted-foreground">Ingen data ännu</p>
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
