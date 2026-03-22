import { Link } from "react-router-dom";
import { useWorks } from "@/hooks/useWorks";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderOpen } from "lucide-react";

const ProjectsList = () => {
  const { data: works, isLoading } = useWorks();

  const projectMap = new Map<string, number>();
  works?.forEach((w) => {
    const name = w.project?.trim();
    if (name) projectMap.set(name, (projectMap.get(name) || 0) + 1);
  });

  const projects = Array.from(projectMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "sv"))
    .map(([name, count]) => ({ name, count }));

  if (isLoading) return <p className="text-muted-foreground py-10 text-center">Laddar projekt...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{projects.length} projekt</p>
      </div>

      {projects.length === 0 ? (
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
                    <TableHead>Projekt</TableHead>
                    <TableHead className="text-right">Antal verk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.name} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <Link
                          to={`/projects/${encodeURIComponent(p.name)}`}
                          className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{p.count}</TableCell>
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
