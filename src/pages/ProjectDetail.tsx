import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useProject, useUpdateProject } from "@/hooks/useProjects";
import { useWorks } from "@/hooks/useWorks";
import { useClients } from "@/hooks/useClients";
import { useAgreements } from "@/hooks/useAgreements";
import { useProjectAgreements, useSaveProjectAgreements } from "@/hooks/useProjectAgreements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileText, Pencil, Check, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_OPTIONS = ["Pågående", "Avslutat", "Under utveckling", "På paus"];

const ProjectDetail = () => {
  const { name } = useParams<{ name: string }>();
  const projectName = decodeURIComponent(name || "");
  const { data: project, isLoading: projectLoading } = useProject(projectName);
  const { data: works, isLoading: worksLoading } = useWorks();
  const { data: clients } = useClients();
  const { data: agreements } = useAgreements();
  const updateProject = useUpdateProject();
  const saveProjectAgreements = useSaveProjectAgreements();
  const navigate = useNavigate();

  const { data: directAgreementIds } = useProjectAgreements(project?.id);

  const [editing, setEditing] = useState(false);
  const [selectedAgreementIds, setSelectedAgreementIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    project_number: "",
    client: "",
    supervisor: "",
    composer: "",
    publishing: "",
    status: "",
    description: "",
  });

  const startEditing = () => {
    if (!project) return;
    setForm({
      name: project.name,
      project_number: project.project_number || "",
      client: project.client || "",
      supervisor: project.supervisor || "",
      composer: project.composer || "",
      publishing: project.publishing || "",
      status: project.status || "",
      description: project.description || "",
    });
    setSelectedAgreementIds(directAgreementIds ?? []);
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const saveEditing = () => {
    if (!project || !form.name.trim()) return;
    const newName = form.name.trim();
    updateProject.mutate(
      {
        id: project.id,
        name: newName,
        project_number: form.project_number || null,
        client: form.client || null,
        supervisor: form.supervisor || null,
        composer: form.composer || null,
        publishing: form.publishing || null,
        status: form.status || null,
        description: form.description || null,
      },
      {
        onSuccess: () => {
          saveProjectAgreements.mutate({ projectId: project.id, agreementIds: selectedAgreementIds });
          toast.success("Projektet uppdaterat");
          setEditing(false);
          if (newName !== projectName) {
            navigate(`/projects/${encodeURIComponent(newName)}`, { replace: true });
          }
        },
        onError: () => toast.error("Kunde inte spara"),
      }
    );
  };

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

  const linkedAgreementIds = new Set<string>();
  allAgreementWorks?.forEach((aw) => {
    if (projectWorkIds.has(aw.work_id)) linkedAgreementIds.add(aw.agreement_id);
  });
  const linkedAgreements = agreements?.filter((a) => linkedAgreementIds.has(a.id)) ?? [];

  const internalPublishers = new Set<string>();
  projectWorks.forEach((w) => {
    const label = w.publishing_type === "MSCE" ? "MSCE" : w.publishing_type === "MSCP" ? "MSCP" : w.publishing_type === "administration" ? "Administration" : null;
    if (label) internalPublishers.add(label);
  });

  if (projectLoading || worksLoading) return <p className="text-muted-foreground">Laddar...</p>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/projects"><ArrowLeft className="h-4 w-4" /> Tillbaka</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {editing ? (
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="text-xl font-semibold h-auto py-1"
                />
              ) : (
                <CardTitle>{projectName}</CardTitle>
              )}
              {!editing && project?.status && <Badge variant="secondary">{project.status}</Badge>}
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={startEditing} className="gap-1">
                <Pencil className="h-3.5 w-3.5" /> Redigera
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={saveEditing} disabled={updateProject.isPending} className="gap-1">
                  <Check className="h-3.5 w-3.5" /> Spara
                </Button>
                <Button variant="outline" size="sm" onClick={cancelEditing} className="gap-1">
                  <X className="h-3.5 w-3.5" /> Avbryt
                </Button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nr</label>
                <Input value={form.project_number} onChange={(e) => setForm((f) => ({ ...f, project_number: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Kund</label>
                <Input value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Supervisor</label>
                <Input value={form.supervisor} onChange={(e) => setForm((f) => ({ ...f, supervisor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Kompositör</label>
                <Input value={form.composer} onChange={(e) => setForm((f) => ({ ...f, composer: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Förlag</label>
                <Input value={form.publishing} onChange={(e) => setForm((f) => ({ ...f, publishing: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-full space-y-1">
                <label className="text-xs text-muted-foreground">Beskrivning</label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
            </div>
          ) : project ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm mt-2">
                {project.project_number && <div><span className="text-muted-foreground">Nr:</span> {project.project_number}</div>}
                {project.client && <div><span className="text-muted-foreground">Kund:</span> {project.client}</div>}
                {project.supervisor && <div><span className="text-muted-foreground">Supervisor:</span> {project.supervisor}</div>}
                {project.composer && <div><span className="text-muted-foreground">Kompositör:</span> {project.composer}</div>}
                {(internalPublishers.size > 0 || linkedAgreements.length > 0 || project.publishing) && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Förlag:</span>{" "}
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {internalPublishers.size > 0 && (
                        [...internalPublishers].map((pub) => (
                          <Badge key={pub} variant="secondary">{pub}</Badge>
                        ))
                      )}
                      {linkedAgreements.length > 0 && linkedAgreements.map((a) => (
                        <Link
                          key={a.id}
                          to={`/agreements?highlight=${a.id}`}
                          className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-1 text-sm"
                        >
                          <FileText className="h-3 w-3" />
                          {a.client_name} ({a.agreement_type})
                        </Link>
                      ))}
                      {internalPublishers.size === 0 && linkedAgreements.length === 0 && project.publishing && (
                        <span>{project.publishing}</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              {project.description && <p className="text-sm text-muted-foreground mt-2 italic">{project.description}</p>}
            </>
          ) : null}
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
                          <Link to={`/works/${work.id}`} className="text-primary underline underline-offset-2 hover:text-primary/80">{work.title}</Link>
                        </TableCell>
                        <TableCell>
                          {creatorNames.map((name, i) => {
                            const clientId = clientMap.get(name.toLowerCase());
                            return (
                              <span key={i}>
                                {clientId ? <Link to={`/clients/${clientId}`} className="text-primary underline underline-offset-2 hover:text-primary/80">{name}</Link> : name}
                                {i < creatorNames.length - 1 && ", "}
                              </span>
                            );
                          })}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{work.publishing_type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{work.share_percentage != null ? `${work.share_percentage}%` : "—"}</TableCell>
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
