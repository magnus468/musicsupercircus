import { useState } from "react";
import { useClientActivities, useCreateActivity, useUpdateActivity, useDeleteActivity, type CrmActivity } from "@/hooks/useCrm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, StickyNote, Phone, Mail, CalendarDays, ListChecks, Check, Trash2, AlarmClock } from "lucide-react";
import { toast } from "sonner";

export const typeMeta: Record<string, { label: string; icon: typeof StickyNote; className: string }> = {
  note: { label: "Anteckning", icon: StickyNote, className: "bg-violet-100 text-violet-700" },
  call: { label: "Samtal", icon: Phone, className: "bg-blue-100 text-blue-700" },
  email: { label: "E-post", icon: Mail, className: "bg-emerald-100 text-emerald-700" },
  meeting: { label: "Möte", icon: CalendarDays, className: "bg-amber-100 text-amber-700" },
  task: { label: "Uppgift", icon: ListChecks, className: "bg-rose-100 text-rose-700" },
};

const today = () => new Date().toISOString().split("T")[0];

const AddActivityDialog = ({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const create = useCreateActivity();
  const [type, setType] = useState("note");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [activityDate, setActivityDate] = useState(today());
  const [followUpDate, setFollowUpDate] = useState("");

  const submit = async () => {
    if (!subject.trim()) {
      toast.error("Ange en rubrik");
      return;
    }
    try {
      await create.mutateAsync({
        client_id: clientId,
        activity_type: type,
        subject: subject.trim(),
        body: body.trim() || null,
        activity_date: activityDate || today(),
        follow_up_date: followUpDate || null,
      });
      toast.success("Aktivitet sparad");
      setSubject("");
      setBody("");
      setFollowUpDate("");
      onOpenChange(false);
    } catch {
      toast.error("Kunde inte spara aktiviteten");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ny aktivitet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeMeta).map(([key, m]) => (
                  <SelectItem key={key} value={key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Rubrik</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="T.ex. Samtal om nya verk" />
          </div>
          <div className="space-y-1.5">
            <Label>Beskrivning</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Vad kom ni överens om?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Datum</Label>
              <Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Uppföljning</Label>
              <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button onClick={submit} disabled={create.isPending}>Spara</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ClientCrmSection = ({ clientId }: { clientId: string }) => {
  const { data: activities, isLoading } = useClientActivities(clientId);
  const update = useUpdateActivity();
  const del = useDeleteActivity();
  const [showNew, setShowNew] = useState(false);

  const markDone = async (a: CrmActivity) => {
    try {
      await update.mutateAsync({ id: a.id, status: "done", completed_at: new Date().toISOString() });
      toast.success("Uppföljning klar");
    } catch {
      toast.error("Kunde inte uppdatera");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Vill du ta bort denna aktivitet?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Aktivitet borttagen");
    } catch {
      toast.error("Kunde inte ta bort aktiviteten");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>CRM — aktivitetslogg</CardTitle>
        <Button size="sm" className="gap-2" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> Ny aktivitet
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laddar...</p>
        ) : (activities?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Inga aktiviteter ännu. Lägg till samtal, möten, e-post och anteckningar med uppföljningsdatum.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l pl-5">
            {activities!.map((a) => {
              const meta = typeMeta[a.activity_type] ?? typeMeta.note;
              const Icon = meta.icon;
              const isOverdue = a.status === "open" && a.follow_up_date && a.follow_up_date <= today();
              return (
                <li key={a.id} className="relative">
                  <span className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full ${meta.className}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{a.activity_date}</span>
                    <Badge variant="outline" className="text-xs">{meta.label}</Badge>
                    {a.follow_up_date && a.status === "open" && (
                      <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs gap-1">
                        <AlarmClock className="h-3 w-3" /> Uppföljning {a.follow_up_date}
                      </Badge>
                    )}
                    {a.status === "done" && <Badge variant="secondary" className="text-xs">Klar</Badge>}
                  </div>
                  <p className="mt-1 text-sm font-medium">{a.subject}</p>
                  {a.body && <p className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>}
                  <div className="mt-1 flex gap-1">
                    {a.follow_up_date && a.status === "open" && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => markDone(a)}>
                        <Check className="h-3 w-3" /> Klar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
      <AddActivityDialog clientId={clientId} open={showNew} onOpenChange={setShowNew} />
    </Card>
  );
};

export default ClientCrmSection;
