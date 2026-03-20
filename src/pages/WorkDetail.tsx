import { useParams, Link } from "react-router-dom";
import { useWorks } from "@/hooks/useWorks";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const WorkDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: works, isLoading } = useWorks();
  const { data: clients } = useClients();

  const work = works?.find((w) => w.id === id);

  const clientMap = new Map<string, string>();
  clients?.forEach((c) => clientMap.set(`${c.first_name} ${c.last_name}`.trim().toLowerCase(), c.id));

  if (isLoading) return <p className="text-muted-foreground">Laddar...</p>;
  if (!work) return <p className="text-muted-foreground">Verket hittades inte.</p>;

  const creatorEntries = (work.creators.match(/(?:^|,\s*)([^,(]+?)(?:\s*\(([^)]*)\))?(?=,|$)/g) || []).map((c) => {
    const trimmed = c.replace(/^,\s*/, "").trim();
    const match = trimmed.match(/^(.+?)\s*\(([^)]*)\)$/);
    if (match) {
      const name = match[1].trim();
      const meta = match[2];
      const roleMatch = meta.match(/^(CA|C|A|Arr)/i);
      const shareMatch = meta.match(/(\d+(?:\.\d+)?)%/);
      const repr = meta.includes("repr");
      return { name, role: roleMatch?.[1] || "", share: shareMatch?.[1] || "", repr };
    }
    return { name: trimmed, role: "", share: "", repr: false };
  });

  const publishingLabel = (type: string) => {
    if (type === "MSCE") return "MSCE";
    if (type === "MSCP") return "MSCP";
    if (type === "administration") return "Administration";
    return type;
  };

  const stimLabel = (status: string) => {
    if (status === "anmäld") return "Anmäld";
    if (status === "claimad") return "Claimad";
    return "Ej anmäld";
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/works"><ArrowLeft className="h-4 w-4" /> Tillbaka</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{work.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            {work.project && (
              <div>
                <dt className="text-muted-foreground">Projekt</dt>
                <dd>{work.project}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Internt förlag</dt>
              <dd><Badge variant="secondary">{publishingLabel(work.publishing_type)}</Badge></dd>
            </div>
            <div>
              <dt className="text-muted-foreground">STIM-status</dt>
              <dd><Badge variant="outline">{stimLabel(work.stim_status)}</Badge></dd>
            </div>
            {work.share_percentage != null && (
              <div>
                <dt className="text-muted-foreground">Andel</dt>
                <dd>{work.share_percentage}%</dd>
              </div>
            )}
            {work.co_publishers && work.co_publishers.length > 0 && (
              <div>
                <dt className="text-muted-foreground">Co-publishers</dt>
                <dd>{work.co_publishers.join(", ")}</dd>
              </div>
            )}
            {work.stim_comment && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">STIM-kommentar</dt>
                <dd className="whitespace-pre-line">{work.stim_comment}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upphovspersoner ({creatorEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Namn</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Roll</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Andel</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Representerar</th>
                </tr>
              </thead>
              <tbody>
                {creatorEntries.map((entry, i) => {
                  const clientId = clientMap.get(entry.name.toLowerCase());
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">
                        {clientId ? (
                          <Link to={`/clients/${clientId}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                            {entry.name}
                          </Link>
                        ) : entry.name}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{entry.role || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{entry.share ? `${entry.share}%` : "—"}</td>
                      <td className="px-4 py-2">
                        {entry.repr ? (
                          <Badge className="bg-primary/15 text-primary border-0">Ja</Badge>
                        ) : (
                          <span className="text-muted-foreground">Nej</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkDetail;
