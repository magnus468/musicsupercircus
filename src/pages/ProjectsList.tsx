import { useState } from "react";
import { Link } from "react-router-dom";
import { useProjects, Project } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

type SortKey = keyof Pick<Project, "project_number" | "name" | "client" | "supervisor" | "composer" | "publishing" | "status">;
type SortDir = "asc" | "desc";

const statusVariant = (status: string | null) => {
  switch (status) {
    case "Pågående": return "default";
    case "Klart": return "secondary";
    case "Under utveckling": return "outline";
    case "På paus": return "destructive";
    default: return "secondary";
  }
};

const collator = new Intl.Collator("sv", { numeric: true, sensitivity: "base" });

const ProjectsList = () => {
  const { data: projects, isLoading } = useProjects();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...(projects ?? [])].sort((a, b) => {
    const va = a[sortKey] ?? "";
    const vb = b[sortKey] ?? "";
    const cmp = collator.compare(String(va), String(vb));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="inline h-3 w-3 ml-1" />
      : <ArrowDown className="inline h-3 w-3 ml-1" />;
  };

  const columns: { key: SortKey; label: string }[] = [
    { key: "project_number", label: "Nr" },
    { key: "name", label: "Projekt" },
    { key: "client", label: "Kund" },
    { key: "supervisor", label: "Supervisor" },
    { key: "composer", label: "Kompositör" },
    { key: "publishing", label: "Förlag" },
    { key: "status", label: "Status" },
  ];

  if (isLoading) return <p className="text-muted-foreground py-10 text-center">Laddar projekt...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sorted.length} projekt</p>
      </div>

      {sorted.length === 0 ? (
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
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className="cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.label}
                        <SortIcon col={col.key} />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((p) => (
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
