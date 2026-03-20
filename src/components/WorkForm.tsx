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

interface CreatorEntry {
  name: string;
  role: "CA" | "C" | "A" | "Arr";
  share: string; // percentage as string for input
}

// Parse "Name (CA, 50%)" format back to CreatorEntry
const parseCreatorsString = (str: string): CreatorEntry[] => {
  if (!str) return [];
  return str.split(", ").map((part) => {
    const match = part.match(/^(.+?)\s*\((\w+)(?:,\s*(\d+(?:\.\d+)?)%)?\)$/);
    if (match) {
      return { name: match[1].trim(), role: match[2] as CreatorEntry["role"], share: match[3] || "" };
    }
    return { name: part.trim(), role: "CA" as const, share: "" };
  }).filter((c) => c.name);
};

const serializeCreators = (creators: CreatorEntry[]): string => {
  return creators.map((c) => {
    const parts: string[] = [c.role];
    if (c.share) parts.push(`${c.share}%`);
    return `${c.name} (${parts.join(", ")})`;
  }).join(", ");
};

interface WorkFormProps {
  work?: Work;
  onSuccess?: () => void;
}

const ROLE_OPTIONS: { value: CreatorEntry["role"]; label: string }[] = [
  { value: "CA", label: "CA" },
  { value: "C", label: "C" },
  { value: "A", label: "A" },
  { value: "Arr", label: "Arr" },
];

const WorkForm = ({ work, onSuccess }: WorkFormProps) => {
  const [title, setTitle] = useState(work?.title ?? "");
  const [project, setProject] = useState(work?.project ?? "");
  const [creatorsList, setCreatorsList] = useState<CreatorEntry[]>(
    work?.creators ? parseCreatorsString(work.creators) : []
  );
  const [newCreatorFirst, setNewCreatorFirst] = useState("");
  const [newCreatorLast, setNewCreatorLast] = useState("");
  const [newCreatorRole, setNewCreatorRole] = useState<CreatorEntry["role"]>("CA");
  const [newCreatorShare, setNewCreatorShare] = useState("");
  const [isCoPublisher, setIsCoPublisher] = useState(
    work ? (work.co_publishers && work.co_publishers.length > 0) : false
  );
  const [publishingType, setPublishingType] = useState<"MSCE" | "MSCP">(work?.publishing_type === "MSCE" || work?.publishing_type === "MSCP" ? work.publishing_type : "MSCP");
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
    if (!creatorsList.some((c) => c.name === fullName)) {
      setCreatorsList((prev) => [...prev, { name: fullName, role: newCreatorRole, share: newCreatorShare }]);
    }
    // Auto-create client if not exists
    const alreadyExists = existingClients.some(
      (c) => c.first_name.toLowerCase() === (first || "").toLowerCase() && c.last_name.toLowerCase() === (last || "").toLowerCase()
    );
    if (!alreadyExists && (first || last)) {
      try {
        await createClient.mutateAsync({ first_name: first || last, last_name: first ? last : "" });
      } catch {
        // Silently ignore
      }
    }
    setNewCreatorFirst("");
    setNewCreatorLast("");
    setNewCreatorRole("CA");
    setNewCreatorShare("");
  };

  const removeCreator = (name: string) => {
    setCreatorsList((prev) => prev.filter((c) => c.name !== name));
  };

  const updateCreatorRole = (name: string, role: CreatorEntry["role"]) => {
    setCreatorsList((prev) => prev.map((c) => c.name === name ? { ...c, role } : c));
  };

  const updateCreatorShare = (name: string, share: string) => {
    setCreatorsList((prev) => prev.map((c) => c.name === name ? { ...c, share } : c));
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
      creators: serializeCreators(creatorsList),
      publishing_type: isCoPublisher ? publishingType : "original",
      co_publishers: isCoPublisher && selectedCoPublishers.length > 0 ? selectedCoPublishers : null,
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
        setTitle(""); setProject(""); setCreatorsList([]); setNewCreatorFirst(""); setNewCreatorLast("");
        setNewCreatorRole("CA"); setNewCreatorShare(""); setPublishingType("MSCP");
        setIsCoPublisher(false); setSelectedCoPublishers([]); setStimStatus("ej_anmäld"); setStimComment(""); setSharePercentage("");
      }
      onSuccess?.();
    } catch {
      toast.error("Något gick fel");
    }
  };

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
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <span className="text-xs text-muted-foreground">Förnamn</span>
            <Input
              value={newCreatorFirst}
              onChange={(e) => setNewCreatorFirst(e.target.value)}
              placeholder="Förnamn"
            />
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-xs text-muted-foreground">Efternamn</span>
            <Input
              value={newCreatorLast}
              onChange={(e) => setNewCreatorLast(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCreator(); } }}
              placeholder="Efternamn"
            />
          </div>
          <div className="w-20 space-y-1">
            <span className="text-xs text-muted-foreground">Roll</span>
            <Select value={newCreatorRole} onValueChange={(v) => setNewCreatorRole(v as CreatorEntry["role"])}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-20 space-y-1">
            <span className="text-xs text-muted-foreground">Andel %</span>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={newCreatorShare}
              onChange={(e) => setNewCreatorShare(e.target.value)}
              placeholder="%"
            />
          </div>
          <Button type="button" variant="secondary" onClick={addCreator} disabled={!newCreatorFirst.trim() && !newCreatorLast.trim()} className="h-10">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {creatorsList.length > 0 && (
          <div className="space-y-1 mt-2">
            {creatorsList.map((creator) => (
              <div key={creator.name} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                <span className="flex-1 font-medium">{creator.name}</span>
                <Select value={creator.role} onValueChange={(v) => updateCreatorRole(creator.name, v as CreatorEntry["role"])}>
                  <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={creator.share}
                  onChange={(e) => updateCreatorShare(creator.name, e.target.value)}
                  placeholder="%"
                  className="h-7 w-20 text-xs"
                />
                <button type="button" onClick={() => removeCreator(creator.name)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={() => {
                const count = creatorsList.length;
                if (count === 0) return;
                const equalShare = (100 / count).toFixed(2).replace(/\.?0+$/, "");
                setCreatorsList((prev) => prev.map((c) => ({ ...c, share: equalShare })));
              }}
            >
              Fördela lika ({creatorsList.length} st = {(100 / (creatorsList.length || 1)).toFixed(2).replace(/\.?0+$/, "")}% var)
            </Button>
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
          <Label>Typ</Label>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant={!isCoPublisher ? "default" : "outline"}
              size="sm"
              onClick={() => { setIsCoPublisher(false); setSelectedCoPublishers([]); }}
            >
              Original
            </Button>
            <Button
              type="button"
              variant={isCoPublisher ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCoPublisher(true)}
            >
              Co-publishing
            </Button>
          </div>
        </div>
      </div>
      {isCoPublisher && (
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
      )}
      <div className="grid gap-4 sm:grid-cols-2">
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
