import { useState } from "react";
import { useCreateClient, useUpdateClient, type Client, type ClientInsert } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ClientFormProps {
  client?: Client;
  onSuccess?: () => void;
}

const ClientForm = ({ client, onSuccess }: ClientFormProps) => {
  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [organization, setOrganization] = useState(client?.organization ?? "");
  const [ipiNumber, setIpiNumber] = useState(client?.ipi_number ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEdit = !!client;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: ClientInsert = {
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      organization: organization.trim() || null,
      ipi_number: ipiNumber.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (isEdit) {
        await updateClient.mutateAsync({ id: client.id, ...data });
        toast.success("Klient uppdaterad");
      } else {
        await createClient.mutateAsync(data);
        toast.success("Klient tillagd");
        setName(""); setEmail(""); setPhone(""); setOrganization(""); setIpiNumber(""); setNotes("");
      }
      onSuccess?.();
    } catch {
      toast.error("Något gick fel");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Namn *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">E-post</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="organization">Organisation</Label>
          <Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ipiNumber">IPI-nummer</Label>
          <Input id="ipiNumber" value={ipiNumber} onChange={(e) => setIpiNumber(e.target.value)} placeholder="t.ex. 00123456789" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Anteckningar</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <Button type="submit" disabled={createClient.isPending || updateClient.isPending}>
        {isEdit ? "Spara ändringar" : "Lägg till klient"}
      </Button>
    </form>
  );
};

export default ClientForm;
