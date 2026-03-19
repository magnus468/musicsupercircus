import { useState, useRef, useEffect } from "react";
import { useClients, useDeleteClient, useUpdateClient, type Client } from "@/hooks/useClients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Trash2, Plus, Eye, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ClientForm from "@/components/ClientForm";

type EditableField = "first_name" | "last_name" | "email" | "phone" | "organization" | "ipi_number";

interface EditingCell {
  clientId: string;
  field: EditableField;
}

const InlineEdit = ({
  value,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  mono,
}: {
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (val: string) => void;
  onCancel: () => void;
  mono?: boolean;
}) => {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(value);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing, value]);

  if (!isEditing) {
    return (
      <span
        className={`cursor-pointer rounded px-1 py-0.5 -mx-1 hover:bg-accent transition-colors ${mono ? "font-mono text-xs" : ""} ${!value ? "text-muted-foreground" : ""}`}
        onClick={onStartEdit}
        title="Klicka för att redigera"
      >
        {value || "—"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(draft);
          if (e.key === "Escape") onCancel();
        }}
        className={`h-7 text-sm px-1.5 min-w-0 ${mono ? "font-mono text-xs" : ""}`}
      />
      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onSave(draft)}>
        <Check className="h-3 w-3" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCancel}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

const ClientsList = () => {
  const [search, setSearch] = useState("");
  const { data: clients, isLoading } = useClients(search);
  const deleteClient = useDeleteClient();
  const updateClient = useUpdateClient();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [showNew, setShowNew] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("Vill du verkligen ta bort denna klient?")) return;
    try {
      await deleteClient.mutateAsync(id);
      toast.success("Klient borttagen");
    } catch {
      toast.error("Kunde inte ta bort klienten");
    }
  };

  const handleSave = async (client: Client, field: EditableField, value: string) => {
    const trimmed = value.trim();
    const current = client[field] ?? "";
    if (trimmed === current) {
      setEditingCell(null);
      return;
    }
    try {
      await updateClient.mutateAsync({ id: client.id, [field]: trimmed || null });
      toast.success("Uppdaterad");
    } catch {
      toast.error("Kunde inte spara");
    }
    setEditingCell(null);
  };

  const isEditing = (clientId: string, field: EditableField) =>
    editingCell?.clientId === clientId && editingCell?.field === field;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Sök namn, e-post, organisation..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Ny klient
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {isLoading ? "Laddar..." : `${clients?.length ?? 0} klienter`}
      </p>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Förnamn</TableHead>
              <TableHead>Efternamn</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>IPI-nummer</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients?.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <InlineEdit
                    value={client.first_name}
                    isEditing={isEditing(client.id, "first_name")}
                    onStartEdit={() => setEditingCell({ clientId: client.id, field: "first_name" })}
                    onSave={(v) => handleSave(client, "first_name", v)}
                    onCancel={() => setEditingCell(null)}
                  />
                </TableCell>
                <TableCell>
                  <InlineEdit
                    value={client.last_name}
                    isEditing={isEditing(client.id, "last_name")}
                    onStartEdit={() => setEditingCell({ clientId: client.id, field: "last_name" })}
                    onSave={(v) => handleSave(client, "last_name", v)}
                    onCancel={() => setEditingCell(null)}
                  />
                </TableCell>
                <TableCell>
                  <InlineEdit
                    value={client.email || ""}
                    isEditing={isEditing(client.id, "email")}
                    onStartEdit={() => setEditingCell({ clientId: client.id, field: "email" })}
                    onSave={(v) => handleSave(client, "email", v)}
                    onCancel={() => setEditingCell(null)}
                  />
                </TableCell>
                <TableCell>
                  <InlineEdit
                    value={client.phone || ""}
                    isEditing={isEditing(client.id, "phone")}
                    onStartEdit={() => setEditingCell({ clientId: client.id, field: "phone" })}
                    onSave={(v) => handleSave(client, "phone", v)}
                    onCancel={() => setEditingCell(null)}
                  />
                </TableCell>
                <TableCell>
                  <InlineEdit
                    value={client.organization || ""}
                    isEditing={isEditing(client.id, "organization")}
                    onStartEdit={() => setEditingCell({ clientId: client.id, field: "organization" })}
                    onSave={(v) => handleSave(client, "organization", v)}
                    onCancel={() => setEditingCell(null)}
                  />
                </TableCell>
                <TableCell>
                  <InlineEdit
                    value={client.ipi_number || ""}
                    isEditing={isEditing(client.id, "ipi_number")}
                    onStartEdit={() => setEditingCell({ clientId: client.id, field: "ipi_number" })}
                    onSave={(v) => handleSave(client, "ipi_number", v)}
                    onCancel={() => setEditingCell(null)}
                    mono
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link to={`/clients/${client.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(client.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && clients?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Inga klienter hittades
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* New dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ny klient</DialogTitle></DialogHeader>
          <ClientForm onSuccess={() => setShowNew(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsList;
