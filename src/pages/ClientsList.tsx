import { useState } from "react";
import { useClients, useDeleteClient, type Client } from "@/hooks/useClients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Pencil, Trash2, Plus, Eye } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import ClientForm from "@/components/ClientForm";

const ClientsList = () => {
  const [search, setSearch] = useState("");
  const { data: clients, isLoading } = useClients(search);
  const fullName = (c: Client) => `${c.first_name} ${c.last_name}`.trim();
  const deleteClient = useDeleteClient();
  const [editClient, setEditClient] = useState<Client | null>(null);
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
              <TableHead className="w-28"></TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {clients?.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.first_name}</TableCell>
                <TableCell className="font-medium">{client.last_name}</TableCell>
                <TableCell className="text-muted-foreground">{client.email || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{client.phone || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{client.organization || "—"}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{client.ipi_number || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link to={`/clients/${client.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditClient(client)}>
                      <Pencil className="h-3.5 w-3.5" />
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

      {/* Edit dialog */}
      <Dialog open={!!editClient} onOpenChange={(open) => !open && setEditClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Redigera klient</DialogTitle></DialogHeader>
          {editClient && <ClientForm client={editClient} onSuccess={() => setEditClient(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsList;
