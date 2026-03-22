import { useParams, Link } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { useWorks } from "@/hooks/useWorks";
import { useClients } from "@/hooks/useClients";
import { useAgreements, useAllAgreementWorkCounts } from "@/hooks/useAgreements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ProjectDetail = () => {
  const { name } = useParams<{ name: string }>();
  const projectName = decodeURIComponent(name || "");
  const { data: project, isLoading: projectLoading } = useProject(projectName);
  const { data: works, isLoading: worksLoading } = useWorks();
  const { data: clients } = useClients();
  const { data: agreements } = useAgreements();

  // Get all agreement_works to find which agreements link to this project's works
  const { data: allAgreementWorks } = useQuery({
    queryKey: ["all-agreement-works"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreement_works")
        .select("agreement_id, work_id");
      if (error) throw error;
      return data as { agreement_id: string; work_id: string }[];
    },
  });

  const clientMap = new Map<string, string>();
  clients?.forEach((c) => clientMap.set(`${c.first_name} ${c.last_name}`.trim().toLowerCase(), c.id));

  const projectWorks = works?.filter((w) => w.project === projectName) ?? [];
  const projectWorkIds = new Set(projectWorks.map((w) => w.id));

  // Find agreements linked to this project's works
  const linkedAgreementIds = new Set<string>();
  allAgreementWorks?.forEach((aw) => {
    if (projectWorkIds.has(aw.work_id)) {
      linkedAgreementIds.add(aw.agreement_id);
    }
  });
  const linkedAgreements = agreements?.filter((a) => linkedAgreementIds.has(a.id)) ?? [];

  if (projectLoading || worksLoading) return <p className="text-muted-foreground">Laddar...</p>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/projects"><ArrowLeft className="h-4 w-4" /> Tillbaka</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>{projectName}</CardTitle>
            {project?.status && <Badge variant="secondary">{project.status}</Badge>}
          </div>
          {project && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm mt-2">
              {project.project_number && (
                <div><span className="text-muted-foreground">Nr:</span> {project.project_number}</div>
              )}
              {project.client && (
                <div><span className="text-muted-foreground">Kund:</span> {project.client}</div>
              )}
              {project.supervisor && (
                <div><span className="text-muted-foreground">Supervisor:</span> {project.supervisor}</div>
              )}
              {project.composer && (
                <div><span className="text-muted-foreground">Kompositör:</span> {project.composer}</div>
              )}
              {linkedAgreements.length > 0 ? (
                <div>
                  <span className="text-muted-foreground">Förlag:</span>{" "}
                  {linkedAgreements.map((a, i) => (
                    <span key={a.id}>
                      <Link
                        to={`/agreements?highlight=${a.id}`}
                        className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        {a.client_name} ({a.agreement_type})
                      </Link>
                      {i < linkedAgreements.length - 1 && ", "}
                    </span>
                  ))}
                </div>
              ) : project.publishing ? (
                <div><span className="text-muted-foreground">Förlag:</span> {project.publishing}</div>
              ) : null}
            </div>
          )}
          {project?.description && (
            <p className="text-sm text-muted-foreground mt-2 italic">{project.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">{projectWorks.length} verk</p>
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
