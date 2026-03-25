import { useState, useMemo, useEffect } from "react";
import { useWorks, useDeleteWork, type Work } from "@/hooks/useWorks";
import { useClients } from "@/hooks/useClients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import WorkForm from "@/components/WorkForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SortKey = "title" | "project" | "creators" | "publishing_type" | "stim_status" | "share_percentage";
type SortDir = "asc" | "desc";

const WorksList = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stimFilter, setStimFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: works, isLoading } = useWorks(debouncedSearch);
  const { data: clients } = useClients();
  const deleteWork = useDeleteWork();
  const [editWork, setEditWork] = useState<Work | null>(null);

  const clientMap = new Map<string, string>();
  clients?.forEach((c) => clientMap.set(`${c.first_name} ${c.last_name}`.trim().toLowerCase(), c.id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    let result = works?.filter((w) => {
      if (typeFilter !== "all" && w.publishing_type !== typeFilter) return false;
      if (stimFilter !== "all" && w.stim_status !== stimFilter) return false;
      return true;
    });

    if (result && sortKey) {
      result = [...result].sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";
        switch (sortKey) {
          case "title": aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
          case "project": aVal = (a.project || "").toLowerCase(); bVal = (b.project || "").toLowerCase(); break;
          case "creators": aVal = a.creators.toLowerCase(); bVal = b.creators.toLowerCase(); break;
          case "publishing_type": aVal = a.publishing_type; bVal = b.publishing_type; break;
          case "stim_status": aVal = a.stim_status; bVal = b.stim_status; break;
          case "share_percentage": aVal = a.share_percentage ?? -1; bVal = b.share_percentage ?? -1; break;
        }
        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [works, typeFilter, stimFilter, sortKey, sortDir]);

  const handleDelete = async (id: string) => {
    if (!confirm("Vill du verkligen ta bort detta verk?")) return;
    try {
      await deleteWork.mutateAsync(id);
      toast.success("Verk borttaget");
    } catch {
      toast.error("Kunde inte ta bort verket");
    }
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Sök titel, upphovsperson, projekt..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Internt förlag" />
          </SelectTrigger>
           <SelectContent>
            <SelectItem value="all">Alla typer</SelectItem>
            <SelectItem value="MSCE">MSCE</SelectItem>
            <SelectItem value="MSCP">MSCP</SelectItem>
            <SelectItem value="administration">Administration</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stimFilter} onValueChange={setStimFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="STIM-status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla status</SelectItem>
            <SelectItem value="anmäld">Anmäld</SelectItem>
            <SelectItem value="claimad">Claimad</SelectItem>
            <SelectItem value="ej_anmäld">Ej anmäld</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {isLoading ? "Laddar..." : `${filtered?.length ?? 0} verk`}
      </p>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("title")}>
                <span className="flex items-center">Titel<SortIcon column="title" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("project")}>
                <span className="flex items-center">Projekt/Kund<SortIcon column="project" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("creators")}>
                <span className="flex items-center">Upphovsperson<SortIcon column="creators" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("publishing_type")}>
                <span className="flex items-center">Förlag<SortIcon column="publishing_type" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("stim_status")}>
                <span className="flex items-center">STIM<SortIcon column="stim_status" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("share_percentage")}>
                <span className="flex items-center">Andel<SortIcon column="share_percentage" /></span>
              </TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map((work) => (
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
                  {(work.creators.match(/(?:^|,\s*)([^,(]+?)(?:\s*\([^)]*\))?(?=,|$)/g) || [])
                    .map((c) => ({ raw: c, name: c.replace(/^,\s*/, "").replace(/\s*\(.*\)$/, "").trim(), parens: (c.match(/\(([^)]*)\)/) || [])[1] || "" }))
                    .filter((c) => c.name && !c.parens.split(",").map(p => p.trim()).includes("E"))
                    .map(({ name: nameOnly }, i, arr) => {
                    const clientId = clientMap.get(nameOnly.toLowerCase());
                    return (
                      <span key={i}>
                        {clientId ? (
                          <Link to={`/clients/${clientId}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                            {nameOnly}
                          </Link>
                        ) : nameOnly}
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
                <TableCell className="text-muted-foreground">
                  {work.share_percentage != null ? `${work.share_percentage}%` : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditWork(work)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(work.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && filtered?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Inga verk hittades
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editWork} onOpenChange={(open) => !open && setEditWork(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Redigera verk</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            {editWork && <WorkForm work={editWork} onSuccess={() => setEditWork(null)} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorksList;
