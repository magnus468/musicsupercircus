import { useState, useMemo, useEffect, useCallback } from "react";
import { useDeleteWork, useWorks, type Work } from "@/hooks/useWorks";
import { useClients } from "@/hooks/useClients";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import WorkForm from "@/components/WorkForm";
import WorksFilters from "@/components/works/WorksFilters";
import WorksTable from "@/components/works/WorksTable";
import { toast } from "sonner";

type SortKey = "title" | "project" | "creators" | "publishing_type" | "stim_status" | "share_percentage" | "created_at";
type SortDir = "asc" | "desc";

const WorksList = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stimFilter, setStimFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [editWork, setEditWork] = useState<Work | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: works, isLoading } = useWorks(debouncedSearch);
  const { data: clients } = useClients();
  const deleteWork = useDeleteWork();

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients?.forEach((c) => map.set(`${c.first_name} ${c.last_name}`.trim().toLowerCase(), c.id));
    return map;
  }, [clients]);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir("asc");
  }, [sortKey]);

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
          case "title":
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case "project":
            aVal = (a.project || "").toLowerCase();
            bVal = (b.project || "").toLowerCase();
            break;
          case "creators":
            aVal = a.creators.toLowerCase();
            bVal = b.creators.toLowerCase();
            break;
          case "publishing_type":
            aVal = a.publishing_type;
            bVal = b.publishing_type;
            break;
          case "stim_status":
            aVal = a.stim_status;
            bVal = b.stim_status;
            break;
          case "share_percentage":
            aVal = a.share_percentage ?? -1;
            bVal = b.share_percentage ?? -1;
            break;
        }

        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [works, typeFilter, stimFilter, sortKey, sortDir]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Vill du verkligen ta bort detta verk?")) return;

    try {
      await deleteWork.mutateAsync(id);
      toast.success("Verk borttaget");
    } catch {
      toast.error("Kunde inte ta bort verket");
    }
  }, [deleteWork]);

  return (
    <div className="space-y-4">
      <WorksFilters
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        stimFilter={stimFilter}
        onStimFilterChange={setStimFilter}
      />

      <p className="text-sm text-muted-foreground">
        {isLoading ? "Laddar..." : `${filtered?.length ?? 0} verk`}
      </p>

      <WorksTable
        works={filtered}
        isLoading={isLoading}
        sortKey={sortKey}
        sortDir={sortDir}
        onToggleSort={toggleSort}
        clientMap={clientMap}
        onEdit={setEditWork}
        onDelete={handleDelete}
      />

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
