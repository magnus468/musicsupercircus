import { useState } from "react";
import { useAgreements, useCreateAgreement, useDeleteAgreement, uploadAgreementFile, getAgreementSignedUrl } from "@/hooks/useAgreements";
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
import { Plus, Trash2, FileText, Upload, Download } from "lucide-react";
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

const AgreementsList = () => {
  const { data: agreements, isLoading } = useAgreements();
  const { data: clients } = useClients();
  const { data: works } = useWorks();
  const createAgreement = useCreateAgreement();
  const deleteAgreement = useDeleteAgreement();
  const [showNew, setShowNew] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState("");
  const [agreementType, setAgreementType] = useState("original");
  const [agreementDate, setAgreementDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [sharePercentage, setSharePercentage] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [lifeOfCopyright, setLifeOfCopyright] = useState("no");
  const [retentionDate, setRetentionDate] = useState("");
  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([]);

  const resetForm = () => {
    setClientId("");
    setAgreementType("original");
    setAgreementDate(new Date().toISOString().split("T")[0]);
    setExpiryDate("");
    setSharePercentage("");
    setStatus("active");
    setNotes("");
    setLifeOfCopyright("no");
    setSelectedWorkIds([]);
  };

  const handleCreate = async () => {
    if (!clientId) {
      toast.error("Välj en klient");
      return;
    }
    try {
      await createAgreement.mutateAsync({
        client_id: clientId,
        agreement_type: agreementType,
        agreement_date: agreementDate,
        expiry_date: expiryDate || null,
        share_percentage: sharePercentage ? parseFloat(sharePercentage) : null,
        status,
        notes: notes || null,
        life_of_copyright: lifeOfCopyright === "yes",
        workIds: selectedWorkIds,
      });
      toast.success("Avtal skapat");
      setShowNew(false);
      resetForm();
    } catch {
      toast.error("Kunde inte skapa avtalet");
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
      // Refetch
      window.location.reload();
    } catch {
      toast.error("Kunde inte ladda upp filen");
    }
    setUploading(null);
  };

  const handleDownload = async (filePath: string) => {
    try {
      const url = await getAgreementSignedUrl(filePath);
      window.open(url, "_blank");
    } catch {
      toast.error("Kunde inte öppna filen");
    }
  };

  const toggleWork = (workId: string) => {
    setSelectedWorkIds((prev) =>
      prev.includes(workId) ? prev.filter((id) => id !== workId) : [...prev, workId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowNew(true)} className="gap-2">
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
              <TableHead>Status</TableHead>
              <TableHead>Dokument</TableHead>
              <TableHead className="w-16"></TableHead>
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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

      {/* New Agreement Dialog */}
      <Dialog open={showNew} onOpenChange={(open) => { setShowNew(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Nytt förlagsavtal</DialogTitle></DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            <div className="space-y-2">
              <Label>Klient *</Label>
              <Select value={clientId} onValueChange={setClientId}>
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
                <Select value={agreementType} onValueChange={setAgreementType}>
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
                <Select value={status} onValueChange={setStatus}>
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
                <Input type="date" value={agreementDate} onChange={(e) => setAgreementDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Förfallodatum</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Life of Copyright</Label>
              <Select value={lifeOfCopyright} onValueChange={setLifeOfCopyright}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Ja</SelectItem>
                  <SelectItem value="no">Nej</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Anteckningar</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {/* Link works */}
            <div className="space-y-2">
              <Label>Koppla verk</Label>
              <div className="rounded-lg border max-h-40 overflow-y-auto p-2 space-y-1">
                {works?.length === 0 && <p className="text-xs text-muted-foreground">Inga verk</p>}
                {works?.map((w) => (
                  <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                    <Checkbox
                      checked={selectedWorkIds.includes(w.id)}
                      onCheckedChange={() => toggleWork(w.id)}
                    />
                    <span className="truncate">{w.title}</span>
                    <span className="text-muted-foreground text-xs ml-auto shrink-0">{w.creators}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={handleCreate} disabled={createAgreement.isPending} className="w-full">
              {createAgreement.isPending ? "Sparar..." : "Skapa avtal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgreementsList;
