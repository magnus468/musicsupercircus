import { useState } from "react";
import { useCreateClient, useUpdateClient, type Client, type ClientInsert } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { User, Building2 } from "lucide-react";
import { toast } from "sonner";

interface ClientFormProps {
  client?: Client;
  onSuccess?: () => void;
}

const ClientForm = ({ client, onSuccess }: ClientFormProps) => {
  const [clientType, setClientType] = useState<string>(client?.client_type ?? "person");
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
  const [contactPerson, setContactPerson] = useState(client?.contact_person ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEdit = !!client;
  const isCompany = clientType === "company";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: ClientInsert = {
      client_type: clientType,
      first_name: isCompany ? (organization.trim() || firstName.trim()) : firstName.trim(),
      last_name: isCompany ? "" : lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      organization: isCompany ? organization.trim() || null : organization.trim() || null,
      ipi_number: ipiNumber.trim() || null,
      country: country.trim() || null,
      city: city.trim() || null,
      postal_code: postalCode.trim() || null,
      street_address: streetAddress.trim() || null,
      vat_number: vatNumber.trim() || null,
      bank_name: bankName.trim() || null,
      iban: iban.trim() || null,
      bic_swift: bicSwift.trim() || null,
      contact_person: isCompany ? (contactPerson.trim() || null) : null,
      notes: notes.trim() || null,
    };

    try {
      if (isEdit) {
        await updateClient.mutateAsync({ id: client.id, ...data });
        toast.success("Klient uppdaterad");
      } else {
        await createClient.mutateAsync(data);
        toast.success("Klient tillagd");
        setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setOrganization(""); setIpiNumber(""); setCountry(""); setCity(""); setPostalCode(""); setStreetAddress(""); setVatNumber(""); setBankName(""); setIban(""); setBicSwift(""); setContactPerson(""); setNotes("");
      }
      onSuccess?.();
    } catch {
      toast.error("Något gick fel");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Typ</Label>
        <ToggleGroup
          type="single"
          value={clientType}
          onValueChange={(v) => { if (v) setClientType(v); }}
          className="justify-start"
        >
          <ToggleGroupItem value="person" className="gap-2">
            <User className="h-4 w-4" /> Person
          </ToggleGroupItem>
          <ToggleGroupItem value="company" className="gap-2">
            <Building2 className="h-4 w-4" /> Företag
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {isCompany ? (
        <div className="space-y-2">
          <Label htmlFor="organization">Företagsnamn *</Label>
          <Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPerson">Kontaktperson</Label>
          <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
      ) : (
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
      )}

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

      {isCompany ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vatNumber">Momsnummer</Label>
            <Input id="vatNumber" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="t.ex. SE123456789001" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ipiNumber">IPI-nummer</Label>
            <Input id="ipiNumber" value={ipiNumber} onChange={(e) => setIpiNumber(e.target.value)} placeholder="t.ex. 00123456789" />
          </div>
        </div>
      ) : (
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
      )}

      <div className="space-y-2">
        <Label htmlFor="streetAddress">Gatuadress</Label>
        <Input id="streetAddress" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="postalCode">Postnummer</Label>
          <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </div>
        {!isCompany && (
          <div className="space-y-2">
            <Label htmlFor="vatNumber">Momsnummer</Label>
            <Input id="vatNumber" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="t.ex. SE123456789001" />
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">Stad</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Land</Label>
          <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank</Label>
          <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="iban">IBAN</Label>
          <Input id="iban" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="t.ex. SE1234567890" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bicSwift">BIC/SWIFT</Label>
          <Input id="bicSwift" value={bicSwift} onChange={(e) => setBicSwift(e.target.value)} placeholder="t.ex. NDEASESS" />
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
