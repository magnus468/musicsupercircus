import { useState } from "react";
import { useWorks, useDeleteWork, type Work } from "@/hooks/useWorks";
import { useClients } from "@/hooks/useClients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import WorkForm from "@/components/WorkForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WorksList = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stimFilter, setStimFilter] = useState<string>("all");
  const { data: works, isLoading } = useWorks(search);
  const deleteWork = useDeleteWork();
  const [editWork, setEditWork] = useState<Work | null>(null);

  const filtered = works?.filter((w) => {
    if (typeFilter !== "all" && w.publishing_type !== typeFilter) return false;
    if (stimFilter !== "all" && w.stim_status !== stimFilter) return false;
    return true;
  });

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
    if (type === "original") return <Badge variant="secondary">Original</Badge>;
    if (type === "MSCE") return <Badge className="bg-primary/15 text-primary border-0">MSCE</Badge>;
    if (type === "MSCP") return <Badge className="bg-accent/15 text-accent-foreground border-0">MSCP</Badge>;
    return <Badge className="bg-muted text-muted-foreground border-0">Administration</Badge>;
  };

  const stimBadge = (status: string) => {
    if (status === "anmäld") return <Badge className="bg-success/15 text-success border-0">Anmäld</Badge>;
    if (status === "claimad") return <Badge className="bg-warning/15 text-warning-foreground border-0">Claimad</Badge>;
    return <Badge variant="outline">Ej anmäld</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Sök titel, upphovsperson, projekt..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Förlagstyp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla typer</SelectItem>
            <SelectItem value="original">Original</SelectItem>
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

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Laddar..." : `${filtered?.length ?? 0} verk`}
      </p>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Projekt/Kund</TableHead>
              <TableHead>Upphovsperson</TableHead>
              <TableHead>Förlag</TableHead>
              <TableHead>STIM</TableHead>
              <TableHead>Andel</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map((work) => (
              <TableRow key={work.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{work.title}</TableCell>
                <TableCell className="text-muted-foreground max-w-[150px] truncate">{work.project || "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{work.creators}</TableCell>
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

      {/* Edit dialog */}
      <Dialog open={!!editWork} onOpenChange={(open) => !open && setEditWork(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Redigera verk</DialogTitle>
          </DialogHeader>
          {editWork && <WorkForm work={editWork} onSuccess={() => setEditWork(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorksList;
