import { useState } from "react";
import { Link } from "react-router-dom";
import { useProjects, Project } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FolderOpen, ArrowUp, ArrowDown, ArrowUpDown, ChevronRight } from "lucide-react";

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

const columns: { key: SortKey; label: string }[] = [
  { key: "project_number", label: "Nr" },
  { key: "name", label: "Projekt" },
  { key: "client", label: "Kund" },
  { key: "supervisor", label: "Supervisor" },
  { key: "composer", label: "Kompositör" },
  { key: "publishing", label: "Förlag" },
  { key: "status", label: "Status" },
];

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) => {
  if (sortKey !== col) return <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ArrowUp className="inline h-3 w-3 ml-1" />
    : <ArrowDown className="inline h-3 w-3 ml-1" />;
};

const ProjectTable = ({
  items,
  sortKey,
  sortDir,
  onToggleSort,
  showHeader = true,
}: {
  items: Project[];
  sortKey: SortKey;
  sortDir: SortDir;
  onToggleSort: (key: SortKey) => void;
  showHeader?: boolean;
}) => (
  <Table>
    {showHeader && (
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className="cursor-pointer select-none hover:text-foreground transition-colors"
              onClick={() => onToggleSort(col.key)}
            >
              {col.label}
              <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
    )}
    <TableBody>
      {items.map((p) => (
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
            {p.status ? <Badge variant={statusVariant(p.status)}>{p.status}</Badge> : "—"}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const ProjectsList = () => {
  const { data: projects, isLoading } = useProjects();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [doneOpen, setDoneOpen] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortFn = (a: Project, b: Project) => {
    const va = a[sortKey] ?? "";
    const vb = b[sortKey] ?? "";
    const cmp = collator.compare(String(va), String(vb));
    return sortDir === "asc" ? cmp : -cmp;
  };

  const active = [...(projects ?? [])].filter((p) => p.status !== "Klart").sort(sortFn);
  const done = [...(projects ?? [])].filter((p) => p.status === "Klart").sort(sortFn);

  if (isLoading) return <p className="text-muted-foreground py-10 text-center">Laddar projekt...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{active.length} aktiva projekt</p>
      </div>

      {active.length === 0 && done.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FolderOpen className="mx-auto h-10 w-10 mb-2 opacity-40" />
            <p>Inga projekt hittades.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="rounded-lg overflow-x-auto">
                  <ProjectTable items={active} sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} />
                </div>
              </CardContent>
            </Card>
          )}

          {done.length > 0 && (
            <Collapsible open={doneOpen} onOpenChange={setDoneOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
                <ChevronRight className={`h-4 w-4 transition-transform ${doneOpen ? "rotate-90" : ""}`} />
                Avslutade projekt ({done.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card>
                  <CardContent className="p-0">
                    <div className="rounded-lg overflow-x-auto">
                      <ProjectTable items={done} sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} />
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectsList;
