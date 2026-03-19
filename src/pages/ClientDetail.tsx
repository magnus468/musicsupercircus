import { useParams, Link } from "react-router-dom";
import { useClient } from "@/hooks/useClients";
import { useWorks } from "@/hooks/useWorks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading: loadingClient } = useClient(id);
  const { data: allWorks, isLoading: loadingWorks } = useWorks();

  const fullName = client ? `${client.first_name} ${client.last_name}`.trim() : "";
  const clientWorks = allWorks?.filter((w) =>
    client && w.creators.toLowerCase().split(/[,/]/).some((c) => c.trim().toLowerCase() === fullName.toLowerCase())
  ) ?? [];

  if (loadingClient) return <p className="text-muted-foreground">Laddar...</p>;
  if (!client) return <p className="text-muted-foreground">Klienten hittades inte.</p>;

  const addressParts = [client.street_address, client.postal_code, client.city, client.country].filter(Boolean);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link to="/clients"><ArrowLeft className="h-4 w-4" /> Tillbaka</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            <Link to="/clients" className="hover:underline">
              {fullName}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            {client.email && <div><dt className="text-muted-foreground">E-post</dt><dd>{client.email}</dd></div>}
            {client.phone && <div><dt className="text-muted-foreground">Telefon</dt><dd>{client.phone}</dd></div>}
            {client.organization && <div><dt className="text-muted-foreground">Organisation</dt><dd>{client.organization}</dd></div>}
            {client.contact_person && <div><dt className="text-muted-foreground">Kontaktperson</dt><dd>{client.contact_person}</dd></div>}
            {client.ipi_number && <div><dt className="text-muted-foreground">IPI-nummer</dt><dd className="font-mono">{client.ipi_number}</dd></div>}
            {client.vat_number && <div><dt className="text-muted-foreground">Momsnummer</dt><dd className="font-mono">{client.vat_number}</dd></div>}
            {client.bank_name && <div><dt className="text-muted-foreground">Bank</dt><dd>{client.bank_name}</dd></div>}
            {client.iban && <div><dt className="text-muted-foreground">IBAN</dt><dd className="font-mono">{client.iban}</dd></div>}
            {client.bic_swift && <div><dt className="text-muted-foreground">BIC/SWIFT</dt><dd className="font-mono">{client.bic_swift}</dd></div>}
            {addressParts.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Adress</dt>
                <dd>{addressParts.join(", ")}</dd>
              </div>
            )}
            {client.notes && <div className="sm:col-span-2"><dt className="text-muted-foreground">Anteckningar</dt><dd className="whitespace-pre-line">{client.notes}</dd></div>}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verk ({clientWorks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingWorks ? (
            <p className="text-muted-foreground text-sm">Laddar verk...</p>
          ) : clientWorks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Inga verk kopplade till denna klient.</p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Förlag</TableHead>
                    <TableHead>STIM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientWorks.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.title}</TableCell>
                      <TableCell className="text-muted-foreground">{w.project || "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{w.publishing_type}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{w.stim_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDetail;
