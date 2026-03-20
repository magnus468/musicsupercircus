import { useParams, Link } from "react-router-dom";
import { useWorks } from "@/hooks/useWorks";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

const ProjectDetail = () => {
  const { name } = useParams<{ name: string }>();
  const projectName = decodeURIComponent(name || "");
  const { data: works, isLoading } = useWorks();
  const { data: clients } = useClients();

  const clientMap = new Map<string, string>();
  clients?.forEach((c) => clientMap.set(`${c.first_name} ${c.last_name}`.trim().toLowerCase(), c.id));

  const projectWorks = works?.filter((w) => w.project === projectName) ?? [];

  if (isLoading) return <p className="text-muted-foreground">Laddar...</p>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/works"><ArrowLeft className="h-4 w-4" /> Tillbaka</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{projectName}</CardTitle>
          <p className="text-sm text-muted-foreground">{projectWorks.length} verk</p>
        </CardHeader>
        <CardContent>
          {projectWorks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Inga verk hittades för detta projekt.</p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Upphovsperson</TableHead>
                    <TableHead>Förlag</TableHead>
                    <TableHead>Andel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectWorks.map((work) => {
                    const creatorNames = (work.creators.match(/(?:^|,\s*)([^,(]+?)(?:\s*\([^)]*\))?(?=,|$)/g) || [])
                      .map((c) => c.replace(/^,\s*/, "").replace(/\s*\(.*\)$/, "").trim())
                      .filter(Boolean);

                    return (
                      <TableRow key={work.id}>
                        <TableCell className="font-medium">
                          <Link to={`/works/${work.id}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                            {work.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {creatorNames.map((name, i) => {
                            const clientId = clientMap.get(name.toLowerCase());
                            return (
                              <span key={i}>
                                {clientId ? (
                                  <Link to={`/clients/${clientId}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                                    {name}
                                  </Link>
                                ) : name}
                                {i < creatorNames.length - 1 && ", "}
                              </span>
                            );
                          })}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{work.publishing_type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">
                          {work.share_percentage != null ? `${work.share_percentage}%` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectDetail;
