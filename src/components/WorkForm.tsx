import { useState } from "react";
import { useCreateWork, useUpdateWork, type Work, type WorkInsert } from "@/hooks/useWorks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface WorkFormProps {
  work?: Work;
  onSuccess?: () => void;
}

const WorkForm = ({ work, onSuccess }: WorkFormProps) => {
  const [title, setTitle] = useState(work?.title ?? "");
  const [project, setProject] = useState(work?.project ?? "");
  const [creators, setCreators] = useState(work?.creators ?? "");
  const [publishingType, setPublishingType] = useState<"original" | "MSCE" | "MSCP" | "administration">(work?.publishing_type ?? "original");
  const [coPublishers, setCoPublishers] = useState(work?.co_publishers?.join(", ") ?? "");
  const [stimStatus, setStimStatus] = useState<"anmäld" | "claimad" | "ej_anmäld">(work?.stim_status ?? "ej_anmäld");
  const [stimComment, setStimComment] = useState(work?.stim_comment ?? "");
  const [sharePercentage, setSharePercentage] = useState(work?.share_percentage?.toString() ?? "");

  const createWork = useCreateWork();
  const updateWork = useUpdateWork();
  const isEdit = !!work;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: WorkInsert = {
      title: title.trim(),
      project: project.trim() || null,
      creators: creators.trim(),
      publishing_type: publishingType,
      co_publishers: coPublishers.trim() ? coPublishers.split(",").map((s) => s.trim()).filter(Boolean) : null,
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
        setTitle(""); setProject(""); setCreators(""); setPublishingType("original");
        setCoPublishers(""); setStimStatus("ej_anmäld"); setStimComment(""); setSharePercentage("");
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
      <div className="space-y-2">
        <Label htmlFor="creators">Upphovsperson(er) *</Label>
        <Input id="creators" value={creators} onChange={(e) => setCreators(e.target.value)} required placeholder="Separera med komma" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Förlagstyp</Label>
          <Select value={publishingType} onValueChange={(v) => setPublishingType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="original">Original</SelectItem>
              <SelectItem value="MSCE">MSCE</SelectItem>
              <SelectItem value="MSCP">MSCP</SelectItem>
              <SelectItem value="administration">Administration</SelectItem>
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
          <Label htmlFor="coPublishers">Co-publishers</Label>
          <Input id="coPublishers" value={coPublishers} onChange={(e) => setCoPublishers(e.target.value)} placeholder="Separera med komma" />
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
