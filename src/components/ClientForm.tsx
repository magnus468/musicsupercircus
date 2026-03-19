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
  const [firstName, setFirstName] = useState(client?.first_name ?? "");
  const [lastName, setLastName] = useState(client?.last_name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [organization, setOrganization] = useState(client?.organization ?? "");
  const [ipiNumber, setIpiNumber] = useState(client?.ipi_number ?? "");
  const [country, setCountry] = useState(client?.country ?? "");
  const [city, setCity] = useState(client?.city ?? "");
  const [postalCode, setPostalCode] = useState(client?.postal_code ?? "");
  const [streetAddress, setStreetAddress] = useState(client?.street_address ?? "");
  const [vatNumber, setVatNumber] = useState(client?.vat_number ?? "");
  const [bankName, setBankName] = useState(client?.bank_name ?? "");
  const [iban, setIban] = useState(client?.iban ?? "");
  const [bicSwift, setBicSwift] = useState(client?.bic_swift ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEdit = !!client;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: ClientInsert = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      organization: organization.trim() || null,
      ipi_number: ipiNumber.trim() || null,
      country: country.trim() || null,
      city: city.trim() || null,
      postal_code: postalCode.trim() || null,
      street_address: streetAddress.trim() || null,
      vat_number: vatNumber.trim() || null,
      bank_name: bankName.trim() || null,
      iban: iban.trim() || null,
      bic_swift: bicSwift.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (isEdit) {
        await updateClient.mutateAsync({ id: client.id, ...data });
        toast.success("Klient uppdaterad");
      } else {
        await createClient.mutateAsync(data);
        toast.success("Klient tillagd");
        setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setOrganization(""); setIpiNumber(""); setCountry(""); setCity(""); setPostalCode(""); setStreetAddress(""); setVatNumber(""); setNotes("");
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
          <Label htmlFor="firstName">Förnamn *</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Efternamn</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vatNumber">Momsnummer</Label>
          <Input id="vatNumber" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="t.ex. SE123456789001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Land</Label>
          <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="streetAddress">Gatuadress</Label>
        <Input id="streetAddress" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postnummer</Label>
          <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Stad</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
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
