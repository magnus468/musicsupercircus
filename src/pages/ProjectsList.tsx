import { Link } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";

const statusVariant = (status: string | null) => {
  switch (status) {
    case "Pågående": return "default";
    case "Klart": return "secondary";
    case "Under utveckling": return "outline";
    case "På paus": return "destructive";
    default: return "secondary";
  }
};

const ProjectsList = () => {
  const { data: projects, isLoading } = useProjects();

  if (isLoading) return <p className="text-muted-foreground py-10 text-center">Laddar projekt...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{projects?.length ?? 0} projekt</p>
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FolderOpen className="mx-auto h-10 w-10 mb-2 opacity-40" />
            <p>Inga projekt hittades.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Kund</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Kompositör</TableHead>
                    <TableHead>Förlag</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="text-muted-foreground whitespace-nowrap">{p.project_number || "—"}</TableCell>
                      <TableCell className="font-medium">
                        <Link
                          to={`/projects/${encodeURIComponent(p.name)}`}
                          className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.client || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.supervisor || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{p.composer || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{p.publishing || "—"}</TableCell>
                      <TableCell>
                        {p.status ? (
                          <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectsList;
