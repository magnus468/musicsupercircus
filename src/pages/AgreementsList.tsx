import { useEffect, useState } from "react";
import {
  useAgreements,
  useCreateAgreement,
  useUpdateAgreement,
  useDeleteAgreement,
  useAgreementWorks,
  uploadAgreementFile,
  getAgreementSignedUrl,
  type Agreement,
} from "@/hooks/useAgreements";
import { useClients, useCreateClient } from "@/hooks/useClients";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import AgreementPdfPreview from "@/components/AgreementPdfPreview";
import { Check, ChevronsUpDown, Download, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  internalPublisher: string;
  agreementDate: string;
  expiryDate: string;
  status: string;
  notes: string;
  lifeOfCopyright: string;
  retentionDate: string;
  postExpiryAction: string;
  selectedWorkIds: string[];
  workSearch: string;
  pdfFile: File | null;
}

const emptyForm: FormState = {
  clientId: "",
  agreementType: "MSCP",
  agreementDate: new Date().toISOString().split("T")[0],
  expiryDate: "",
  status: "active",
  notes: "",
  lifeOfCopyright: "yes",
  retentionDate: "",
  postExpiryAction: "expires",
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
  const createClient = useCreateClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClientType, setNewClientType] = useState<"person" | "company">("person");
  const [newClientFirstName, setNewClientFirstName] = useState("");
  const [newClientLastName, setNewClientLastName] = useState("");
  const [newClientOrg, setNewClientOrg] = useState("");
  const [newClientContact, setNewClientContact] = useState("");

  const { data: editWorkIds } = useAgreementWorks(editingAgreement?.id);

  useEffect(() => {
    if (editingAgreement && editWorkIds) {
      setForm((f) => ({ ...f, selectedWorkIds: editWorkIds }));
    }
  }, [editWorkIds, editingAgreement?.id]);

  useEffect(() => {
    return () => {
      if (pdfViewerUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pdfViewerUrl);
      }
    };
  }, [pdfViewerUrl]);

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
      postExpiryAction: (a as any).post_expiry_action || "expires",
      selectedWorkIds: [],
      workSearch: "",
      pdfFile: null,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingAgreement(null);
    setForm(emptyForm);
  };

  const closePdfViewer = () => {
    if (pdfViewerUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(pdfViewerUrl);
    }
    setPdfViewerUrl(null);
    setPdfLoading(false);
    setPdfError(null);
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
      post_expiry_action: form.lifeOfCopyright === "no" ? form.postExpiryAction : "expires",
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
      setPdfLoading(true);
      setPdfError(null);

      if (pdfViewerUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pdfViewerUrl);
      }

      const signedUrl = await getAgreementSignedUrl(filePath);
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error("Kunde inte hämta PDF-filen");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPdfViewerUrl(objectUrl);
    } catch {
      setPdfError("Kunde inte visa PDF-filen.");
      toast.error("Kunde inte öppna filen");
    } finally {
      setPdfLoading(false);
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

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Klient</TableHead>
              <TableHead>Avtalstyp</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Förfaller</TableHead>
              <TableHead>LoC</TableHead>
              <TableHead>Retention</TableHead>
              <TableHead>Vid förfall</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dokument</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agreements?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.client_name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{typeLabels[a.agreement_type] || a.agreement_type}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{a.agreement_date}</TableCell>
                <TableCell className="text-muted-foreground">{a.expiry_date || "—"}</TableCell>
                <TableCell>
                  {a.life_of_copyright ? <Badge variant="secondary">Ja</Badge> : <span className="text-muted-foreground">Nej</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {!a.life_of_copyright && a.retention_date ? a.retention_date : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {!a.life_of_copyright
                    ? ((a as any).post_expiry_action === "rolling_3" ? "Rullande 3 månader"
                      : (a as any).post_expiry_action === "rolling_6" ? "Rullande 6 månader"
                      : (a as any).post_expiry_action === "expires" || !(a as any).post_expiry_action ? "Upphör"
                      : (a as any).post_expiry_action)
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={a.status === "active" ? "default" : "outline"}>
                    {statusLabels[a.status] || a.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {a.file_path ? (
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => handleDownload(a.file_path)}>
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
                      <Button variant="outline" size="sm" className="pointer-events-none h-7 gap-1.5 text-xs" disabled={uploading === a.id}>
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
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  Inga avtal registrerade
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col">
          <DialogHeader>
            <DialogTitle>{editingAgreement ? "Redigera förlagsavtal" : "Nytt förlagsavtal"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Klient *</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
                      {form.clientId
                        ? (() => {
                            const c = clients?.find((c) => c.id === form.clientId);
                            return c ? (c.organization || `${c.first_name} ${c.last_name}`.trim()) : "Välj klient";
                          })()
                        : "Välj klient"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Sök klient..." />
                      <CommandList>
                        <CommandEmpty>Ingen klient hittad</CommandEmpty>
                        <CommandGroup>
                          {clients?.map((c) => {
                            const label = c.organization || `${c.first_name} ${c.last_name}`.trim();
                            return (
                              <CommandItem
                                key={c.id}
                                value={label}
                                onSelect={() => setField("clientId", c.id)}
                              >
                                <Check className={cn("mr-2 h-4 w-4", form.clientId === c.id ? "opacity-100" : "opacity-0")} />
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setShowNewClientDialog(true)}
                  title="Lägg till ny klient"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={form.agreementType} onValueChange={(v) => setField("agreementType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="co-publishing">Co-publishing</SelectItem>
                    <SelectItem value="administration">Administration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Internt förlag</Label>
                <Select value={form.agreementType === "MSCE" || form.agreementType === "MSCP" ? form.agreementType : "MSCP"} onValueChange={() => {}}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MSCE">MSCE</SelectItem>
                    <SelectItem value="MSCP">MSCP</SelectItem>
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
              <>
                <div className="space-y-2">
                  <Label>Retention (slutdatum)</Label>
                  <Input type="date" value={form.retentionDate} onChange={(e) => setField("retentionDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Vid förfall</Label>
                  <Select
                    value={["expires", "rolling_3", "rolling_6"].includes(form.postExpiryAction) ? form.postExpiryAction : "custom"}
                    onValueChange={(v) => setField("postExpiryAction", v === "custom" ? "" : v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expires">Upphör</SelectItem>
                      <SelectItem value="rolling_3">Rullande 3 månaders uppsägning</SelectItem>
                      <SelectItem value="rolling_6">Rullande 6 månaders uppsägning</SelectItem>
                      <SelectItem value="custom">Annat...</SelectItem>
                    </SelectContent>
                  </Select>
                  {!["expires", "rolling_3", "rolling_6"].includes(form.postExpiryAction) && (
                    <Input
                      placeholder="Ange villkor vid förfall..."
                      value={form.postExpiryAction === "custom" ? "" : form.postExpiryAction}
                      onChange={(e) => setField("postExpiryAction", e.target.value)}
                    />
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Anteckningar</Label>
              <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Koppla verk</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Sök verk..."
                  value={form.workSearch || ""}
                  onChange={(e) => setField("workSearch", e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
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
                    <label key={w.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-accent/50">
                      <Checkbox
                        checked={form.selectedWorkIds.includes(w.id)}
                        onCheckedChange={() => toggleWork(w.id)}
                      />
                      <span className="truncate">{w.title}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{w.creators}</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Signerat avtal (PDF)</Label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => setField("pdfFile", e.target.files?.[0] || null)}
                  />
                  <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:bg-accent/50">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className={form.pdfFile ? "text-foreground" : "text-muted-foreground"}>
                      {form.pdfFile
                        ? form.pdfFile.name
                        : editingAgreement?.file_path
                          ? `Byt ut: ${editingAgreement.file_name || editingAgreement.file_path}`
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

      <Dialog open={pdfLoading || !!pdfViewerUrl || !!pdfError} onOpenChange={(open) => { if (!open) closePdfViewer(); }}>
        <DialogContent className="flex h-[90vh] max-w-5xl flex-col">
          <DialogHeader>
            <DialogTitle>Förhandsgranskning</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted/20">
            {pdfLoading && (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Laddar PDF...
              </div>
            )}

            {!pdfLoading && pdfError && (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-destructive">{pdfError}</p>
              </div>
            )}

            {!pdfLoading && pdfViewerUrl && !pdfError && (
              <AgreementPdfPreview fileUrl={pdfViewerUrl} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick-add client dialog */}
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ny klient</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={newClientType} onValueChange={(v) => setNewClientType(v as "person" | "company")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Person</SelectItem>
                  <SelectItem value="company">Företag</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newClientType === "person" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Förnamn *</Label>
                  <Input value={newClientFirstName} onChange={(e) => setNewClientFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Efternamn</Label>
                  <Input value={newClientLastName} onChange={(e) => setNewClientLastName(e.target.value)} />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Organisation *</Label>
                  <Input value={newClientOrg} onChange={(e) => setNewClientOrg(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Kontaktperson</Label>
                  <Input value={newClientContact} onChange={(e) => setNewClientContact(e.target.value)} />
                </div>
              </>
            )}

            <Button
              className="w-full"
              disabled={
                createClient.isPending ||
                (newClientType === "person" ? !newClientFirstName.trim() : !newClientOrg.trim())
              }
              onClick={async () => {
                try {
                  const payload = newClientType === "person"
                    ? { first_name: newClientFirstName.trim(), last_name: newClientLastName.trim(), client_type: "person" as const }
                    : { first_name: newClientOrg.trim(), organization: newClientOrg.trim(), contact_person: newClientContact.trim() || null, client_type: "company" as const };
                  const result = await createClient.mutateAsync(payload);
                  setField("clientId", result.id);
                  setNewClientFirstName("");
                  setNewClientLastName("");
                  setNewClientOrg("");
                  setNewClientContact("");
                  setNewClientType("person");
                  setShowNewClientDialog(false);
                  toast.success("Klient skapad");
                } catch {
                  toast.error("Kunde inte skapa klient");
                }
              }}
            >
              {createClient.isPending ? "Skapar..." : "Skapa klient"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgreementsList;
