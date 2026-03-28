import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2 } from "lucide-react";

import { type Work } from "@/hooks/useWorks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SortKey = "title" | "project" | "creators" | "publishing_type" | "stim_status" | "share_percentage";
type SortDir = "asc" | "desc";

interface WorksTableProps {
  works: Work[] | undefined;
  isLoading: boolean;
  sortKey: SortKey | null;
  sortDir: SortDir;
  onToggleSort: (key: SortKey) => void;
  clientMap: Map<string, string>;
  onEdit: (work: Work) => void;
  onDelete: (id: string) => void;
}

const parseCreatorParts = (creators: string) => {
  return (creators.match(/(?:^|,\s*)([^,(]+?)(?:\s*\([^)]*\))?(?=,|$)/g) || [])
    .map((c) => ({
      name: c.replace(/^,\s*/, "").replace(/\s*\(.*\)$/, "").trim(),
      parens: (c.match(/\(([^)]*)\)/) || [])[1] || "",
    }));
};

const creatorItems = (creators: string) => {
  return parseCreatorParts(creators)
    .filter((c) => c.name && !c.parens.split(",").map((part) => part.trim()).includes("E"));
};

const computeControlledShare = (creators: string): { nordic: number; row: number } => {
  const parts = parseCreatorParts(creators);
  let nordic = 0;
  let row = 0;
  for (const { parens } of parts) {
    const tags = parens.split(",").map((t) => t.trim());
    if (!tags.includes("repr")) continue;
    for (const tag of tags) {
      const nordicMatch = tag.match(/^(\d+(?:\.\d+)?)%$/);
      if (nordicMatch) nordic += parseFloat(nordicMatch[1]);
      const rowMatch = tag.match(/^row:(\d+(?:\.\d+)?)%$/);
      if (rowMatch) row += parseFloat(rowMatch[1]);
    }
  }
  return { nordic: Math.round(nordic * 100) / 100, row: Math.round(row * 100) / 100 };
};

const publishingBadge = (type: string) => {
  if (type === "MSCE") return <Badge className="bg-primary/15 text-primary border-0">MSCE</Badge>;
  if (type === "MSCP") return <Badge className="bg-accent/15 text-accent-foreground border-0">MSCP</Badge>;
  if (type === "administration") return <Badge className="bg-muted text-muted-foreground border-0">Administration</Badge>;
  return <Badge variant="outline">—</Badge>;
};

const stimBadge = (status: string) => {
  if (status === "anmäld") return <Badge className="bg-success/15 text-success border-0">Anmäld</Badge>;
  if (status === "claimad") return <Badge className="bg-warning/15 text-warning-foreground border-0">Claimad</Badge>;
  return <Badge variant="outline">Ej anmäld</Badge>;
};

const SortIcon = ({ active, direction }: { active: boolean; direction: SortDir }) => {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return direction === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
};

const WorksTable = memo(({
  works,
  isLoading,
  sortKey,
  sortDir,
  onToggleSort,
  clientMap,
  onEdit,
  onDelete,
}: WorksTableProps) => {
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer select-none" onClick={() => onToggleSort("title")}>
              <span className="flex items-center">Titel<SortIcon active={sortKey === "title"} direction={sortDir} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => onToggleSort("project")}>
              <span className="flex items-center">Projekt/Kund<SortIcon active={sortKey === "project"} direction={sortDir} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => onToggleSort("creators")}>
              <span className="flex items-center">Upphovsperson<SortIcon active={sortKey === "creators"} direction={sortDir} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => onToggleSort("publishing_type")}>
              <span className="flex items-center">Förlag<SortIcon active={sortKey === "publishing_type"} direction={sortDir} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => onToggleSort("stim_status")}>
              <span className="flex items-center">STIM<SortIcon active={sortKey === "stim_status"} direction={sortDir} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => onToggleSort("share_percentage")}>
              <span className="flex items-center">Andel (N/ROW)<SortIcon active={sortKey === "share_percentage"} direction={sortDir} /></span>
            </TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {works?.map((work) => (
            <TableRow key={work.id}>
              <TableCell className="font-medium max-w-[200px] truncate">
                <Link to={`/works/${work.id}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                  {work.title}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[150px] truncate">
                {work.project ? (
                  <Link to={`/projects/${encodeURIComponent(work.project)}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                    {work.project}
                  </Link>
                ) : "—"}
              </TableCell>
              <TableCell className="max-w-[200px]">
                {creatorItems(work.creators).map(({ name }, i, arr) => {
                  const clientId = clientMap.get(name.toLowerCase());
                  return (
                    <span key={`${work.id}-${name}-${i}`}>
                      {clientId ? (
                        <Link to={`/clients/${clientId}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                          {name}
                        </Link>
                      ) : name}
                      {i < arr.length - 1 && ", "}
                    </span>
                  );
                })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {publishingBadge(work.publishing_type)}
                  {work.co_publishers && work.co_publishers.length > 0 && (
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      / {work.co_publishers.join(", ")}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{stimBadge(work.stim_status)}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {(() => {
                  const { nordic, row } = computeControlledShare(work.creators);
                  if (nordic === 0 && row === 0) return "—";
                  return `${nordic}% / ${row}%`;
                })()}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(work)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(work.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && works?.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Inga verk hittades
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
});

WorksTable.displayName = "WorksTable";

export default WorksTable;
