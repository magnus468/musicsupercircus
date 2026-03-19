import { useState, useEffect } from "react";
import { useAgreements, useCreateAgreement, useUpdateAgreement, useDeleteAgreement, useAgreementWorks, uploadAgreementFile, getAgreementSignedUrl, type Agreement } from "@/hooks/useAgreements";
import { useClients } from "@/hooks/useClients";
import { useWorks } from "@/hooks/useWorks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, FileText, Upload, Download, X, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  original: "Original",
  MSCE: "MSCE",
  MSCP: "MSCP",
  administration: "Administration",
};

const statusLabels: Record<string, string> = {
  active: "Aktivt",
  expired: "Avslutat",
};

interface FormState {
  clientId: string;
  agreementType: string;
  agreementDate: string;
  expiryDate: string;
  status: string;
  notes: string;
  lifeOfCopyright: string;
  retentionDate: string;
  selectedWorkIds: string[];
  workSearch: string;
  pdfFile: File | null;
}

const emptyForm: FormState = {
  clientId: "",
  agreementType: "original",
  agreementDate: new Date().toISOString().split("T")[0],
  expiryDate: "",
  status: "active",
  notes: "",
  lifeOfCopyright: "yes",
  retentionDate: "",
  selectedWorkIds: [],
  workSearch: "",
  pdfFile: null,
};

const AgreementsList = () => {
  const { data: agreements, isLoading } = useAgreements();
  const { data: clients } = useClients();
  const { data: works } = useWorks();
  const createAgreement = useCreateAgreement();
  const updateAgreement = useUpdateAgreement();
  const deleteAgreement = useDeleteAgreement();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Load linked works when editing
  const { data: editWorkIds } = useAgreementWorks(editingAgreement?.id);

  useEffect(() => {
    if (editingAgreement && editWorkIds) {
      setForm((f) => ({ ...f, selectedWorkIds: editWorkIds }));
    }
  }, [editWorkIds, editingAgreement?.id]);

  const openNew = () => {
    setEditingAgreement(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (a: Agreement) => {
    setEditingAgreement(a);
    setForm({
      clientId: a.client_id,
      agreementType: a.agreement_type,
      agreementDate: a.agreement_date,
      expiryDate: a.expiry_date || "",
      status: a.status,
      notes: a.notes || "",
      lifeOfCopyright: a.life_of_copyright ? "yes" : "no",
      retentionDate: a.retention_date || "",
      selectedWorkIds: [],
      pdfFile: null,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingAgreement(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.clientId) {
      toast.error("Välj en klient");
      return;
    }
    const payload = {
      client_id: form.clientId,
      agreement_type: form.agreementType,
      agreement_date: form.agreementDate,
      expiry_date: form.expiryDate || null,
      status: form.status,
      notes: form.notes || null,
      life_of_copyright: form.lifeOfCopyright === "yes",
      retention_date: form.lifeOfCopyright === "no" && form.retentionDate ? form.retentionDate : null,
      workIds: form.selectedWorkIds,
    };

    try {
      if (editingAgreement) {
        await updateAgreement.mutateAsync({ id: editingAgreement.id, ...payload });
        if (form.pdfFile) {
          await uploadAgreementFile(form.pdfFile, editingAgreement.id);
        }
        toast.success("Avtal uppdaterat");
      } else {
        const result = await createAgreement.mutateAsync(payload);
        if (form.pdfFile && result) {
          await uploadAgreementFile(form.pdfFile, (result as any).id);
        }
        toast.success("Avtal skapat");
      }
      closeDialog();
    } catch {
      toast.error("Kunde inte spara avtalet");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Vill du verkligen ta bort detta avtal?")) return;
    try {
      await deleteAgreement.mutateAsync(id);
      toast.success("Avtal borttaget");
    } catch {
      toast.error("Kunde inte ta bort avtalet");
    }
  };

  const handleFileUpload = async (agreementId: string, file: File) => {
    setUploading(agreementId);
    try {
      await uploadAgreementFile(file, agreementId);
      toast.success("Avtal uppladdat");
      window.location.reload();
    } catch {
      toast.error("Kunde inte ladda upp filen");
    }
    setUploading(null);
  };

  const handleDownload = async (filePath: string) => {
    try {
      const url = await getAgreementSignedUrl(filePath);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error("Kunde inte öppna filen");
    }
  };

  const toggleWork = (workId: string) => {
    setForm((f) => ({
      ...f,
      selectedWorkIds: f.selectedWorkIds.includes(workId)
        ? f.selectedWorkIds.filter((id) => id !== workId)
        : [...f.selectedWorkIds, workId],
    }));
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const isSaving = createAgreement.isPending || updateAgreement.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Nytt avtal
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {isLoading ? "Laddar..." : `${agreements?.length ?? 0} avtal`}
      </p>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Klient</TableHead>
              <TableHead>Avtalstyp</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Förfaller</TableHead>
              <TableHead>LoC</TableHead>
              <TableHead>Retention</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dokument</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agreements?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.client_name}</TableCell>
                <TableCell><Badge variant="secondary">{typeLabels[a.agreement_type] || a.agreement_type}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{a.agreement_date}</TableCell>
                <TableCell className="text-muted-foreground">{a.expiry_date || "—"}</TableCell>
                <TableCell>{a.life_of_copyright ? <Badge variant="secondary">Ja</Badge> : <span className="text-muted-foreground">Nej</span>}</TableCell>
                <TableCell className="text-muted-foreground">{!a.life_of_copyright && a.retention_date ? a.retention_date : "—"}</TableCell>
                <TableCell>
                  <Badge variant={a.status === "active" ? "default" : "outline"}>
                    {statusLabels[a.status] || a.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {a.file_path ? (
                    <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => handleDownload(a.file_path!)}>
                      <Download className="h-3 w-3" /> Öppna
                    </Button>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(a.id, file);
                        }}
                      />
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs pointer-events-none" disabled={uploading === a.id}>
                        <Upload className="h-3 w-3" /> {uploading === a.id ? "Laddar..." : "Ladda upp"}
                      </Button>
                    </label>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && agreements?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Inga avtal registrerade
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingAgreement ? "Redigera förlagsavtal" : "Nytt förlagsavtal"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            <div className="space-y-2">
              <Label>Klient *</Label>
              <Select value={form.clientId} onValueChange={(v) => setField("clientId", v)}>
                <SelectTrigger><SelectValue placeholder="Välj klient" /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.organization || `${c.first_name} ${c.last_name}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Avtalstyp</Label>
                <Select value={form.agreementType} onValueChange={(v) => setField("agreementType", v)}>
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
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktivt</SelectItem>
                    <SelectItem value="expired">Avslutat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Avtalsdatum</Label>
                <Input type="date" value={form.agreementDate} onChange={(e) => setField("agreementDate", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Förfallodatum</Label>
                <Input type="date" value={form.expiryDate} onChange={(e) => setField("expiryDate", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Life of Copyright</Label>
              <Select value={form.lifeOfCopyright} onValueChange={(v) => setField("lifeOfCopyright", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Ja</SelectItem>
                  <SelectItem value="no">Nej</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.lifeOfCopyright === "no" && (
              <div className="space-y-2">
                <Label>Retention (slutdatum)</Label>
                <Input type="date" value={form.retentionDate} onChange={(e) => setField("retentionDate", e.target.value)} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Anteckningar</Label>
              <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} />
            </div>

            {/* Link works */}
            <div className="space-y-2">
              <Label>Koppla verk</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Sök verk..."
                  value={form.workSearch || ""}
                  onChange={(e) => setField("workSearch", e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <div className="rounded-lg border max-h-40 overflow-y-auto p-2 space-y-1">
                {works?.length === 0 && <p className="text-xs text-muted-foreground">Inga verk</p>}
                {works
                  ?.filter((w) => {
                    const q = (form.workSearch || "").trim().toLowerCase();
                    if (!q) return true;
                    const normalize = (s: string) =>
                      s.toLowerCase().replace(/[éèê]/g, "e").replace(/[öô]/g, "o").replace(/[åâä]/g, "a").replace(/[ü]/g, "u");
                    const nq = normalize(q);
                    return normalize(w.title).includes(nq) || normalize(w.creators).includes(nq) || (w.project && normalize(w.project).includes(nq));
                  })
                  .map((w) => (
                    <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                      <Checkbox
                        checked={form.selectedWorkIds.includes(w.id)}
                        onCheckedChange={() => toggleWork(w.id)}
                      />
                      <span className="truncate">{w.title}</span>
                      <span className="text-muted-foreground text-xs ml-auto shrink-0">{w.creators}</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Signerat avtal (PDF)</Label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer flex-1">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => setField("pdfFile", e.target.files?.[0] || null)}
                  />
                  <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent/50 transition-colors">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className={form.pdfFile ? "text-foreground" : "text-muted-foreground"}>
                      {form.pdfFile
                        ? form.pdfFile.name
                        : editingAgreement?.file_path
                          ? "Byt ut befintlig PDF..."
                          : "Välj PDF-fil..."}
                    </span>
                  </div>
                </label>
                {form.pdfFile && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setField("pdfFile", null)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? "Sparar..." : editingAgreement ? "Spara ändringar" : "Skapa avtal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgreementsList;
