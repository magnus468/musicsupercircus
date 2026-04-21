import { useState, useEffect, useMemo } from "react";
import { useCreateWork, useUpdateWork, type Work, type WorkInsert } from "@/hooks/useWorks";
import { useCreateClient, useClients } from "@/hooks/useClients";
import { useAgreements, useWorkAgreements, useSetWorkAgreements } from "@/hooks/useAgreements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface CreatorEntry {
  firstName: string;
  lastName: string;
  role: "CA" | "C" | "A" | "Arr" | "E";
  share: string;
  shareRow: string;
  represented: boolean;
}

const fullName = (c: CreatorEntry) => `${c.firstName} ${c.lastName}`.trim();

// Parse "Name (CA, 50%, row:40%, repr)" format back to CreatorEntry
const parseCreatorsString = (str: string): CreatorEntry[] => {
  if (!str) return [];
  // Split on "), " to correctly handle names with spaces/commas
  const parts = str.split(/\),\s*/).map((p, i, arr) => i < arr.length - 1 ? p + ")" : p);
  return parts.map((part) => {
    const trimmed = part.trim();
    const match = trimmed.match(/^(.+?)\s*\((\w+)(?:,\s*(\d+(?:\.\d+)?)%)?(?:,\s*row:(\d+(?:\.\d+)?)%)?(?:,\s*(repr))?\)$/);
    if (match) {
      const role = match[2] as CreatorEntry["role"];
      const fullName = match[1].trim();
      if (role === "E") {
        return { firstName: fullName, lastName: "", role, share: match[3] || "", shareRow: match[4] || "", represented: !!match[5] };
      }
      const nameParts = fullName.split(/\s+/);
      return { firstName: nameParts[0] || "", lastName: nameParts.slice(1).join(" "), role: "CA" as const, share: match[3] || "", shareRow: match[4] || "", represented: true };
    }
    const nameParts = trimmed.split(/\s+/);
    return { firstName: nameParts[0] || "", lastName: nameParts.slice(1).join(" "), role: "CA" as const, share: "", shareRow: "", represented: true };
  }).filter((c) => c.firstName || c.lastName);
};

const serializeCreators = (creators: CreatorEntry[]): string => {
  return creators.map((c) => {
    const parts: string[] = [c.role];
    if (c.share) parts.push(`${c.share}%`);
    if (c.shareRow) parts.push(`row:${c.shareRow}%`);
    if (c.represented) parts.push("repr");
    return `${fullName(c)} (${parts.join(", ")})`;
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

// Recalculate default shares for creators and publishers
const recalcShares = (list: CreatorEntry[]): CreatorEntry[] => {
  const creators = list.filter((c) => c.role !== "E");
  const publishers = list.filter((c) => c.role === "E");

  // Creators: total Nordic = 66.67%, total ROW = 50%
  const assignEqualShares = (items: CreatorEntry[], totalNordic: number, totalRow: number) => {
    const n = items.length;
    if (n === 0) return items;
    const baseNordic = Math.floor((totalNordic / n) * 100) / 100;
    const baseRow = Math.floor((totalRow / n) * 100) / 100;
    const remainderNordic = Math.round((totalNordic - baseNordic * n) * 100) / 100;
    const remainderRow = Math.round((totalRow - baseRow * n) * 100) / 100;
    return items.map((c, i) => ({
      ...c,
      share: (i === 0 ? baseNordic + remainderNordic : baseNordic).toFixed(2).replace(/\.?0+$/, ''),
      shareRow: (i === 0 ? baseRow + remainderRow : baseRow).toFixed(2).replace(/\.?0+$/, ''),
    }));
  };

  const updatedCreators = assignEqualShares(creators, 66.67, 50);

  // Check if Embark Studios is among publishers for custom 30/70 split
  const hasEmbark = publishers.some((p) => fullName(p).toLowerCase().includes("embark"));
  let updatedPublishers: CreatorEntry[];

  if (hasEmbark && publishers.length === 2) {
    // Apply Embark agreement: internal publisher 30%, Embark 70%
    const totalNordic = 33.33;
    const totalRow = 50;
    updatedPublishers = publishers.map((p) => {
      const isEmbark = fullName(p).toLowerCase().includes("embark");
      return {
        ...p,
        share: isEmbark ? (totalNordic * 0.7).toFixed(2).replace(/\.?0+$/, '') : (totalNordic * 0.3).toFixed(2).replace(/\.?0+$/, ''),
        shareRow: isEmbark ? (totalRow * 0.7).toFixed(2).replace(/\.?0+$/, '') : (totalRow * 0.3).toFixed(2).replace(/\.?0+$/, ''),
      };
    });
  } else {
    updatedPublishers = assignEqualShares(publishers, 33.33, 50);
  }

  // Rebuild in original order
  let ci = 0, pi = 0;
  return list.map((c) => c.role === "E" ? updatedPublishers[pi++] : updatedCreators[ci++]);
};

const WorkForm = ({ work, onSuccess }: WorkFormProps) => {
  const [title, setTitle] = useState(work?.title ?? "");
  const [project, setProject] = useState(work?.project ?? "");
  const [creatorsList, setCreatorsList] = useState<CreatorEntry[]>(
    work?.creators ? parseCreatorsString(work.creators) : recalcShares([
      { firstName: "", lastName: "", role: "CA", share: "", shareRow: "", represented: true },
      { firstName: "", lastName: "", role: "E", share: "", shareRow: "", represented: true },
    ])
  );

  const [publishingType, setPublishingType] = useState<"MSCE" | "MSCP">(work?.publishing_type === "MSCE" ? "MSCE" : "MSCP");
  const [stimStatus, setStimStatus] = useState<"anmäld" | "claimad" | "ej_anmäld">(work?.stim_status ?? "ej_anmäld");
  const [stimComment, setStimComment] = useState(work?.stim_comment ?? "");
  const [sharePercentage, setSharePercentage] = useState(work?.share_percentage?.toString() ?? "");
  const [nordicPublisherShare, setNordicPublisherShare] = useState(work?.nordic_publisher_share?.toString() ?? "50");
  const [rowPublisherShare, setRowPublisherShare] = useState(work?.row_publisher_share?.toString() ?? "50");

  const createWork = useCreateWork();
  const updateWork = useUpdateWork();
  const createClient = useCreateClient();
  const { data: existingClients = [] } = useClients();
  const { data: allAgreements = [] } = useAgreements();
  const { data: linkedAgreementIds } = useWorkAgreements(work?.id);
  const setWorkAgreements = useSetWorkAgreements();
  const [selectedAgreementIds, setSelectedAgreementIds] = useState<string[]>([]);
  const isEdit = !!work;

  useEffect(() => {
    if (linkedAgreementIds) setSelectedAgreementIds(linkedAgreementIds);
  }, [linkedAgreementIds]);

  // Suggest agreements whose client_name matches any co-publisher
  const suggestedAgreementIds = useMemo(() => {
    const pubs = creatorsList
      .filter((c) => c.role === "E")
      .map((c) => fullName(c).toLowerCase())
      .filter((n) => n && !n.includes("music super circus"));
    if (pubs.length === 0) return new Set<string>();
    return new Set(
      allAgreements
        .filter((a) => a.client_name && pubs.some((p) => p.includes(a.client_name!.toLowerCase()) || a.client_name!.toLowerCase().includes(p)))
        .map((a) => a.id)
    );
  }, [allAgreements, creatorsList]);

  const toggleAgreement = (id: string) => {
    setSelectedAgreementIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addEmptyCreator = (role: CreatorEntry["role"] = "CA") => {
    setCreatorsList((prev) => recalcShares([...prev, { firstName: "", lastName: "", role, share: "", shareRow: "", represented: true }]));
  };

  const removeCreatorByIndex = (index: number) => {
    setCreatorsList((prev) => recalcShares(prev.filter((_, i) => i !== index)));
  };

  const updateCreatorField = (index: number, field: Partial<CreatorEntry>) => {
    setCreatorsList((prev) => {
      const updated = prev.map((c, i) => i === index ? { ...c, ...field } : c);
      if ('role' in field || (('firstName' in field || 'lastName' in field) && prev[index].role === 'E')) return recalcShares(updated);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty entries
    const validCreators = creatorsList.filter((c) => fullName(c));
    // Auto-create clients for new person creators
    for (const creator of validCreators) {
      if (creator.role === "E") continue;
      const first = creator.firstName.trim();
      const last = creator.lastName.trim();
      const alreadyExists = existingClients.some(
        (c) => c.first_name.toLowerCase() === first.toLowerCase() && c.last_name.toLowerCase() === (last || "").toLowerCase()
      );
      if (!alreadyExists && first) {
        try {
          await createClient.mutateAsync({ first_name: first, last_name: last });
        } catch {
          // Silently ignore
        }
      }
    }
    const publishers = validCreators.filter((c) => c.role === "E").map((c) => fullName(c));
    const data: WorkInsert = {
      title: title.trim(),
      project: project.trim() || null,
      creators: serializeCreators(validCreators),
      publishing_type: publishers.length > 0 ? publishingType : "original" as const,
      co_publishers: publishers.length > 0 ? publishers : null,
      stim_status: stimStatus,
      stim_comment: stimComment.trim() || null,
      share_percentage: validCreators.filter((c) => c.represented).reduce((acc, c) => acc + (parseFloat(c.share) || 0), 0) || null,
      nordic_publisher_share: parseFloat(nordicPublisherShare) || 50,
      row_publisher_share: parseFloat(rowPublisherShare) || 50,
    };

    try {
      let workId = work?.id;
      if (isEdit) {
        await updateWork.mutateAsync({ id: work.id, ...data });
        toast.success("Verk uppdaterat");
      } else {
        const created = await createWork.mutateAsync(data);
        workId = (created as any)?.id;
        toast.success("Verk tillagt");
        setTitle(""); setProject(""); setCreatorsList([]);
        setStimStatus("ej_anmäld"); setStimComment(""); setSharePercentage("");
        setSelectedAgreementIds([]);
      }
      if (workId) {
        await setWorkAgreements.mutateAsync({ workId, agreementIds: selectedAgreementIds });
      }
      onSuccess?.();
    } catch {
      toast.error("Något gick fel");
    }
  };

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
      <div className="space-y-4">
        {/* Upphovspersoner */}
        <div className="space-y-2">
          <Label>Upphovsperson(er) *</Label>
          <div className="space-y-1">
            {creatorsList.map((creator, idx) => {
              if (creator.role === "E") return null;
              return (
                <div key={idx} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                  <Select value={creator.role} onValueChange={(v) => updateCreatorField(idx, { role: v as CreatorEntry["role"] })}>
                    <SelectTrigger className="h-7 w-16 text-xs shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.filter((r) => r.value !== "E").map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={creator.firstName} onChange={(e) => updateCreatorField(idx, { firstName: e.target.value })} placeholder="Förnamn" className="h-7 min-w-0 flex-[2] text-xs" />
                  <Input value={creator.lastName} onChange={(e) => updateCreatorField(idx, { lastName: e.target.value })} placeholder="Efternamn" className="h-7 min-w-0 flex-[2] text-xs" />
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground shrink-0">
                    <Checkbox checked={creator.represented} onCheckedChange={() => updateCreatorField(idx, { represented: !creator.represented })} className="h-3.5 w-3.5" />
                    Repr.
                  </label>
                  <Input type="number" min="0" max="100" step="0.01" value={creator.share} onChange={(e) => updateCreatorField(idx, { share: e.target.value })} placeholder="Norden %" className="h-7 w-20 shrink-0 text-xs" />
                  <Input type="number" min="0" max="100" step="0.01" value={creator.shareRow} onChange={(e) => updateCreatorField(idx, { shareRow: e.target.value })} placeholder="ROW %" className="h-7 w-20 shrink-0 text-xs" />
                  <button type="button" onClick={() => addEmptyCreator("CA")} className="text-muted-foreground hover:text-primary shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeCreatorByIndex(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Förlag */}
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Label>Förlag</Label>
            <Select value={publishingType} onValueChange={(v) => setPublishingType(v as "MSCE" | "MSCP")}>
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MSCE">MSCE</SelectItem>
                <SelectItem value="MSCP">MSCP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            {creatorsList.map((creator, idx) => {
              if (creator.role !== "E") return null;
              return (
                <div key={idx} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                  <span className="text-xs text-muted-foreground w-8 shrink-0">E</span>
                  <Input value={creator.firstName} onChange={(e) => updateCreatorField(idx, { firstName: e.target.value })} placeholder="Förlagsnamn" className="h-7 min-w-0 flex-[3] text-xs" />
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground shrink-0">
                    <Checkbox checked={creator.represented} onCheckedChange={() => updateCreatorField(idx, { represented: !creator.represented })} className="h-3.5 w-3.5" />
                    Repr.
                  </label>
                  <Input type="number" min="0" max="100" step="0.01" value={creator.share} onChange={(e) => updateCreatorField(idx, { share: e.target.value })} placeholder="Norden %" className="h-7 w-20 shrink-0 text-xs" />
                  <Input type="number" min="0" max="100" step="0.01" value={creator.shareRow} onChange={(e) => updateCreatorField(idx, { shareRow: e.target.value })} placeholder="ROW %" className="h-7 w-20 shrink-0 text-xs" />
                  <button type="button" onClick={() => addEmptyCreator("E")} className="text-muted-foreground hover:text-primary shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeCreatorByIndex(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
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

      {/* Förlagsavtal */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            Förlagsavtal
            {selectedAgreementIds.length > 0 && (
              <Badge variant="secondary" className="text-xs">{selectedAgreementIds.length}</Badge>
            )}
          </Label>
          {suggestedAgreementIds.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {suggestedAgreementIds.size} föreslag{suggestedAgreementIds.size === 1 ? "et" : "na"} baserat på co-publishers
            </span>
          )}
        </div>
        <div className="rounded-md border max-h-56 overflow-y-auto divide-y">
          {allAgreements.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">Inga avtal finns ännu</div>
          ) : (
            [...allAgreements]
              .sort((a, b) => {
                const aS = suggestedAgreementIds.has(a.id) ? 0 : 1;
                const bS = suggestedAgreementIds.has(b.id) ? 0 : 1;
                if (aS !== bS) return aS - bS;
                return (a.client_name || "").localeCompare(b.client_name || "");
              })
              .map((a) => {
                const checked = selectedAgreementIds.includes(a.id);
                const suggested = suggestedAgreementIds.has(a.id);
                return (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-accent"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleAgreement(a.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="font-medium truncate flex-1">{a.client_name}</span>
                    <Badge variant="outline" className="text-[10px] py-0 h-4">{a.internal_publisher}</Badge>
                    <span className="text-muted-foreground tabular-nums">
                      {format(new Date(a.agreement_date), "yyyy-MM-dd")}
                    </span>
                    {suggested && !checked && (
                      <Badge className="text-[10px] py-0 h-4 bg-primary/15 text-primary border-0">förslag</Badge>
                    )}
                  </label>
                );
              })
          )}
        </div>
        <p className="text-xs text-muted-foreground">Koppla verket till ett eller flera förlagsavtal</p>
      </div>

      <Button type="submit" disabled={createWork.isPending || updateWork.isPending || setWorkAgreements.isPending}>
        {isEdit ? "Spara ändringar" : "Lägg till verk"}
      </Button>
    </form>
  );
};

export default WorkForm;
