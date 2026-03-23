import { useState, useMemo, useRef, useEffect } from "react";
import { useClients, useDeleteClient, useUpdateClient, type Client } from "@/hooks/useClients";
import { useClientWorkCounts } from "@/hooks/useClientWorkCounts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Trash2, Plus, Eye, Check, X, User, Building2, Music, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ClientForm from "@/components/ClientForm";

type EditableField = "first_name" | "last_name" | "email" | "phone" | "organization" | "ipi_number" | "country" | "city";

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
  const { data: workCounts } = useClientWorkCounts();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [sortField, setSortField] = useState<"last_name" | "works" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: "last_name" | "works") => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortField(null); setSortDir("asc"); }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedClients = useMemo(() => {
    if (!clients) return [];
    if (!sortField) return clients;
    const list = [...clients];
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "last_name") {
      list.sort((a, b) => dir * (a.last_name || "").localeCompare(b.last_name || "", "sv"));
    } else {
      list.sort((a, b) => dir * ((workCounts?.[a.id] ?? 0) - (workCounts?.[b.id] ?? 0)));
    }
    return list;
  }, [clients, sortField, sortDir, workCounts]);

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
    const current = (client as any)[field] ?? "";
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

  const renderCell = (client: Client, field: EditableField, mono?: boolean) => (
    <InlineEdit
      value={(client as any)[field] || ""}
      isEditing={isEditing(client.id, field)}
      onStartEdit={() => setEditingCell({ clientId: client.id, field })}
      onSave={(v) => handleSave(client, field, v)}
      onCancel={() => setEditingCell(null)}
      mono={mono}
    />
  );

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
              <TableHead className="text-center">Verk</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Land</TableHead>
              <TableHead>Stad</TableHead>
              <TableHead>IPI-nummer</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients?.map((client) => {
              const isPerson = !!(client.first_name && client.last_name);
              const initials = isPerson
                ? `${client.first_name.charAt(0)}${client.last_name.charAt(0)}`.toUpperCase()
                : (client.organization || client.first_name || "?").charAt(0).toUpperCase();
              return (
              <TableRow key={client.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isPerson ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>
                      {initials}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        {renderCell(client, "first_name")}
                        {isPerson ? (
                          <User className="h-3 w-3 text-violet-400" />
                        ) : (
                          <Building2 className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{renderCell(client, "last_name")}</TableCell>
                <TableCell className="text-center">
                  {(() => {
                    const count = workCounts?.[client.id] ?? 0;
                    return count > 0 ? (
                      <Badge variant="secondary" className="gap-1">
                        <Music className="h-3 w-3" />
                        {count}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">0</span>
                    );
                  })()}
                </TableCell>
                <TableCell>{renderCell(client, "email")}</TableCell>
                <TableCell>{renderCell(client, "phone")}</TableCell>
                <TableCell>{renderCell(client, "organization")}</TableCell>
                <TableCell>{renderCell(client, "country")}</TableCell>
                <TableCell>{renderCell(client, "city")}</TableCell>
                <TableCell>{renderCell(client, "ipi_number", true)}</TableCell>
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
              );
            })}
            {!isLoading && clients?.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Inga klienter hittades
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle>Ny klient</DialogTitle></DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            <ClientForm onSuccess={() => setShowNew(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsList;
