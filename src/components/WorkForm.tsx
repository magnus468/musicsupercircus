import { useState } from "react";
import { useCreateWork, useUpdateWork, useCoPublisherOptions, type Work, type WorkInsert } from "@/hooks/useWorks";
import { useCreateClient, useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";

interface WorkFormProps {
  work?: Work;
  onSuccess?: () => void;
}

const WorkForm = ({ work, onSuccess }: WorkFormProps) => {
  const [title, setTitle] = useState(work?.title ?? "");
  const [project, setProject] = useState(work?.project ?? "");
  const [creatorsList, setCreatorsList] = useState<string[]>(
    work?.creators ? work.creators.split(/[,/]/).map((c) => c.trim()).filter(Boolean) : []
  );
  const [newCreatorFirst, setNewCreatorFirst] = useState("");
  const [newCreatorLast, setNewCreatorLast] = useState("");
  const [publishingType, setPublishingType] = useState<"MSCE" | "MSCP">(work?.publishing_type === "MSCE" || work?.publishing_type === "MSCP" ? work.publishing_type : "MSCE");
  const [selectedCoPublishers, setSelectedCoPublishers] = useState<string[]>(work?.co_publishers ?? []);
  const [newCoPublisher, setNewCoPublisher] = useState("");
  const [stimStatus, setStimStatus] = useState<"anmäld" | "claimad" | "ej_anmäld">(work?.stim_status ?? "ej_anmäld");
  const [stimComment, setStimComment] = useState(work?.stim_comment ?? "");
  const [sharePercentage, setSharePercentage] = useState(work?.share_percentage?.toString() ?? "");

  const createWork = useCreateWork();
  const updateWork = useUpdateWork();
  const createClient = useCreateClient();
  const { data: existingClients = [] } = useClients();
  const { data: coPublisherOptions = [] } = useCoPublisherOptions();
  const isEdit = !!work;

  const addCreator = async () => {
    const first = newCreatorFirst.trim();
    const last = newCreatorLast.trim();
    if (!first && !last) return;
    const fullName = [first, last].filter(Boolean).join(" ");
    if (!creatorsList.includes(fullName)) {
      setCreatorsList((prev) => [...prev, fullName]);
    }
    // Auto-create client if not exists
    const alreadyExists = existingClients.some(
      (c) => c.first_name.toLowerCase() === (first || "").toLowerCase() && c.last_name.toLowerCase() === (last || "").toLowerCase()
    );
    if (!alreadyExists && (first || last)) {
      try {
        await createClient.mutateAsync({ first_name: first || last, last_name: first ? last : "" });
      } catch {
        // Silently ignore if client creation fails (e.g. duplicate)
      }
    }
    setNewCreatorFirst("");
    setNewCreatorLast("");
  };

  const removeCreator = (name: string) => {
    setCreatorsList((prev) => prev.filter((c) => c !== name));
  };

  const toggleCoPublisher = (name: string) => {
    setSelectedCoPublishers((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const addNewCoPublisher = () => {
    const trimmed = newCoPublisher.trim();
    if (trimmed && !selectedCoPublishers.includes(trimmed)) {
      setSelectedCoPublishers((prev) => [...prev, trimmed]);
    }
    setNewCoPublisher("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: WorkInsert = {
      title: title.trim(),
      project: project.trim() || null,
      creators: creatorsList.join(", "),
      publishing_type: publishingType,
      co_publishers: selectedCoPublishers.length > 0 ? selectedCoPublishers : null,
      stim_status: stimStatus,
      stim_comment: stimComment.trim() || null,
      share_percentage: sharePercentage ? parseFloat(sharePercentage) : null,
    };

    try {
      if (isEdit) {
        await updateWork.mutateAsync({ id: work.id, ...data });
        toast.success("Verk uppdaterat");
      } else {
        await createWork.mutateAsync(data);
        toast.success("Verk tillagt");
        setTitle(""); setProject(""); setCreatorsList([]); setNewCreatorFirst(""); setNewCreatorLast(""); setPublishingType("MSCE");
        setSelectedCoPublishers([]); setStimStatus("ej_anmäld"); setStimComment(""); setSharePercentage("");
      }
      onSuccess?.();
    } catch {
      toast.error("Något gick fel");
    }
  };

  // Merge existing options with any selected values not yet in the DB
  const allOptions = Array.from(new Set([...coPublisherOptions, ...selectedCoPublishers])).sort();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Titel *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project">Projekt/Kund</Label>
          <Input id="project" value={project} onChange={(e) => setProject(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Upphovsperson(er) *</Label>
        <div className="flex gap-2">
          <Input
            value={newCreatorFirst}
            onChange={(e) => setNewCreatorFirst(e.target.value)}
            placeholder="Förnamn"
            className="flex-1"
          />
          <Input
            value={newCreatorLast}
            onChange={(e) => setNewCreatorLast(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCreator(); } }}
            placeholder="Efternamn"
            className="flex-1"
          />
          <Button type="button" variant="secondary" onClick={addCreator} disabled={!newCreatorFirst.trim() && !newCreatorLast.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {creatorsList.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {creatorsList.map((name) => (
              <Badge key={name} variant="secondary" className="gap-1">
                {name}
                <button type="button" onClick={() => removeCreator(name)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Internt förlag</Label>
          <Select value={publishingType} onValueChange={(v) => setPublishingType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MSCE">MSCE</SelectItem>
              <SelectItem value="MSCP">MSCP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>STIM-status</Label>
          <Select value={stimStatus} onValueChange={(v) => setStimStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="anmäld">Anmäld</SelectItem>
              <SelectItem value="claimad">Claimad</SelectItem>
              <SelectItem value="ej_anmäld">Ej anmäld</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Co-publishers</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button" className="w-full justify-between font-normal">
                {selectedCoPublishers.length > 0
                  ? `${selectedCoPublishers.length} valda`
                  : "Välj co-publishers"}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allOptions.map((name) => (
                  <label key={name} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-accent rounded px-1 py-0.5">
                    <Checkbox
                      checked={selectedCoPublishers.includes(name)}
                      onCheckedChange={() => toggleCoPublisher(name)}
                    />
                    {name}
                  </label>
                ))}
                {allOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">Inga co-publishers ännu</p>
                )}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Input
                  placeholder="Lägg till nytt..."
                  value={newCoPublisher}
                  onChange={(e) => setNewCoPublisher(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewCoPublisher(); } }}
                  className="h-8 text-sm"
                />
                <Button type="button" size="sm" variant="secondary" onClick={addNewCoPublisher} disabled={!newCoPublisher.trim()}>
                  +
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {selectedCoPublishers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedCoPublishers.map((name) => (
                <Badge key={name} variant="secondary" className="gap-1">
                  {name}
                  <button type="button" onClick={() => toggleCoPublisher(name)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="share">Andel (%)</Label>
          <Input id="share" type="number" min="0" max="100" step="0.01" value={sharePercentage} onChange={(e) => setSharePercentage(e.target.value)} placeholder="t.ex. 50" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="stimComment">Kommentar</Label>
        <Input id="stimComment" value={stimComment} onChange={(e) => setStimComment(e.target.value)} />
      </div>
      <Button type="submit" disabled={createWork.isPending || updateWork.isPending}>
        {isEdit ? "Spara ändringar" : "Lägg till verk"}
      </Button>
    </form>
  );
};

export default WorkForm;
