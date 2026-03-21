import { useState } from "react";
import { useCreateWork, useUpdateWork, type Work, type WorkInsert } from "@/hooks/useWorks";
import { useCreateClient, useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";

interface CreatorEntry {
  name: string;
  role: "CA" | "C" | "A" | "Arr" | "E";
  share: string; // percentage as string for input
  represented: boolean;
}

// Parse "Name (CA, 50%)" format back to CreatorEntry
const parseCreatorsString = (str: string): CreatorEntry[] => {
  if (!str) return [];
  // Split on ", " only when followed by a name (uppercase letter) and not inside parentheses
  const parts = str.match(/[^,]+\([^)]*\)/g) || str.split(", ");
  return parts.map((part) => {
    const trimmed = part.trim().replace(/^,\s*/, "");
    const match = trimmed.match(/^(.+?)\s*\((\w+)(?:,\s*(\d+(?:\.\d+)?)%)?(?:,\s*(repr))?\)$/);
    if (match) {
      return { name: match[1].trim(), role: match[2] as CreatorEntry["role"], share: match[3] || "", represented: !!match[4] };
    }
    return { name: trimmed, role: "CA" as const, share: "", represented: false };
  }).filter((c) => c.name);
};

const serializeCreators = (creators: CreatorEntry[]): string => {
  return creators.map((c) => {
    const parts: string[] = [c.role];
    if (c.share) parts.push(`${c.share}%`);
    if (c.represented) parts.push("repr");
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
  { value: "E", label: "E" },
];

const WorkForm = ({ work, onSuccess }: WorkFormProps) => {
  const [title, setTitle] = useState(work?.title ?? "");
  const [project, setProject] = useState(work?.project ?? "");
  const [creatorsList, setCreatorsList] = useState<CreatorEntry[]>(
    work?.creators ? parseCreatorsString(work.creators) : []
  );
  const [newCreatorFirst, setNewCreatorFirst] = useState("");
  const [newCreatorLast, setNewCreatorLast] = useState("");
  const [newCreatorName, setNewCreatorName] = useState("");
  const [newCreatorRole, setNewCreatorRole] = useState<CreatorEntry["role"]>("CA");
  const [newCreatorShare, setNewCreatorShare] = useState("");
  const [stimStatus, setStimStatus] = useState<"anmäld" | "claimad" | "ej_anmäld">(work?.stim_status ?? "ej_anmäld");
  const [stimComment, setStimComment] = useState(work?.stim_comment ?? "");
  const [sharePercentage, setSharePercentage] = useState(work?.share_percentage?.toString() ?? "");
  const [nordicPublisherShare, setNordicPublisherShare] = useState((work as any)?.nordic_publisher_share?.toString() ?? "50");
  const [rowPublisherShare, setRowPublisherShare] = useState((work as any)?.row_publisher_share?.toString() ?? "50");

  const createWork = useCreateWork();
  const updateWork = useUpdateWork();
  const createClient = useCreateClient();
  const { data: existingClients = [] } = useClients();
  const isEdit = !!work;

  const addCreator = async () => {
    if (newCreatorRole === "E") {
      const name = newCreatorName.trim();
      if (!name) return;
      if (!creatorsList.some((c) => c.name === name)) {
        setCreatorsList((prev) => [...prev, { name, role: "E", share: newCreatorShare, represented: true }]);
      }
      setNewCreatorName("");
      setNewCreatorRole("CA");
      setNewCreatorShare("");
      return;
    }
    const first = newCreatorFirst.trim();
    const last = newCreatorLast.trim();
    if (!first && !last) return;
    const fullName = [first, last].filter(Boolean).join(" ");
    if (!creatorsList.some((c) => c.name === fullName)) {
      setCreatorsList((prev) => [...prev, { name: fullName, role: newCreatorRole, share: newCreatorShare, represented: true }]);
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

  const toggleCreatorRepresented = (name: string) => {
    setCreatorsList((prev) => prev.map((c) => c.name === name ? { ...c, represented: !c.represented } : c));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Extract co_publishers from creators with role E
    const publishers = creatorsList.filter((c) => c.role === "E").map((c) => c.name);
    const data: WorkInsert = {
      title: title.trim(),
      project: project.trim() || null,
      creators: serializeCreators(creatorsList),
      publishing_type: publishers.length > 0 ? "MSCP" as const : "original" as const,
      co_publishers: publishers.length > 0 ? publishers : null,
      stim_status: stimStatus,
      stim_comment: stimComment.trim() || null,
      share_percentage: creatorsList.filter((c) => c.represented).reduce((acc, c) => acc + (parseFloat(c.share) || 0), 0) || null,
    };

    try {
      if (isEdit) {
        await updateWork.mutateAsync({ id: work.id, ...data });
        toast.success("Verk uppdaterat");
      } else {
        await createWork.mutateAsync(data);
        toast.success("Verk tillagt");
        setTitle(""); setProject(""); setCreatorsList([]); setNewCreatorFirst(""); setNewCreatorLast("");
        setNewCreatorName(""); setNewCreatorRole("CA"); setNewCreatorShare("");
        setStimStatus("ej_anmäld"); setStimComment(""); setSharePercentage("");
      }
      onSuccess?.();
    } catch {
      toast.error("Något gick fel");
    }
  };

  const isPublisherRole = newCreatorRole === "E";

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
        <Label>Upphovsperson(er) & Förlag *</Label>
        <div className="flex gap-2 items-end">
          <div className="w-20 space-y-1">
            <span className="text-xs text-muted-foreground">Roll</span>
            <Select value={newCreatorRole} onValueChange={(v) => {
              setNewCreatorRole(v as CreatorEntry["role"]);
              // Clear fields when switching between E and other roles
              setNewCreatorFirst(""); setNewCreatorLast(""); setNewCreatorName("");
            }}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isPublisherRole ? (
            <div className="flex-1 space-y-1">
              <span className="text-xs text-muted-foreground">Förlagsnamn</span>
              <Input
                value={newCreatorName}
                onChange={(e) => setNewCreatorName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCreator(); } }}
                placeholder="Förlagsnamn"
              />
            </div>
          ) : (
            <>
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
            </>
          )}
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
          <Button type="button" variant="secondary" onClick={addCreator} disabled={isPublisherRole ? !newCreatorName.trim() : (!newCreatorFirst.trim() && !newCreatorLast.trim())} className="h-10">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {creatorsList.length > 0 && (
          <div className="space-y-1 mt-2">
            {[...creatorsList].sort((a, b) => (a.role === "E" ? 1 : 0) - (b.role === "E" ? 1 : 0)).map((creator) => (
              <div key={creator.name} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                <span className="flex-1 font-medium">{creator.name}</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                  <Checkbox
                    checked={creator.represented}
                    onCheckedChange={() => toggleCreatorRepresented(creator.name)}
                    className="h-3.5 w-3.5"
                  />
                  Repr.
                </label>
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
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Andel (%)</Label>
          <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm">
            {(() => {
              const sum = creatorsList
                .filter((c) => c.represented)
                .reduce((acc, c) => acc + (parseFloat(c.share) || 0), 0);
              return sum > 0 ? `${sum}%` : "—";
            })()}
          </div>
          <p className="text-xs text-muted-foreground">Summeras automatiskt från representerade upphovspersoner</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stimComment">Kommentar</Label>
          <Input id="stimComment" value={stimComment} onChange={(e) => setStimComment(e.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={createWork.isPending || updateWork.isPending}>
        {isEdit ? "Spara ändringar" : "Lägg till verk"}
      </Button>
    </form>
  );
};

export default WorkForm;
