import { useParams, Link, useSearchParams } from "react-router-dom";
import { useClient } from "@/hooks/useClients";
import { useWorks } from "@/hooks/useWorks";
import {
  useAgreements,
  useDeleteAgreement,
  useAgreementFiles,
  getAgreementSignedUrl,
  type Agreement,
} from "@/hooks/useAgreements";
import AgreementPdfPreview from "@/components/AgreementPdfPreview";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  original: "Original",
  "co-publishing": "Co-publishing",
  administration: "Administration",
  MSCE: "MSCE",
  MSCP: "MSCP",
};

const isRolling = (action: string) => action === "rolling_3" || action === "rolling_6";

const calcRetentionDate = (
  expiryDate: string,
  retentionYears: string,
  postExpiryAction: string,
  rollingEndDate: string,
): { retentionDate: string; isLocked: boolean } => {
  const years = parseInt(retentionYears, 10);
  if (isNaN(years) || years <= 0) return { retentionDate: "", isLocked: false };

  if (isRolling(postExpiryAction)) {
    if (rollingEndDate) {
      const d = new Date(rollingEndDate);
      d.setFullYear(d.getFullYear() + years);
      const today = new Date().toISOString().split("T")[0];
      return { retentionDate: d.toISOString().split("T")[0], isLocked: rollingEndDate <= today };
    }

    const noticeMonths = postExpiryAction === "rolling_3" ? 3 : 6;
    const d = new Date();
    d.setMonth(d.getMonth() + noticeMonths);
    d.setFullYear(d.getFullYear() + years);
    return { retentionDate: d.toISOString().split("T")[0], isLocked: false };
  }

  if (!expiryDate) return { retentionDate: "", isLocked: false };
  const d = new Date(expiryDate);
  d.setFullYear(d.getFullYear() + years);
  return { retentionDate: d.toISOString().split("T")[0], isLocked: true };
};

const getPostExpiryLabel = (action: string) => {
  if (action === "rolling_3") return "Rullande 3 månader";
  if (action === "rolling_6") return "Rullande 6 månader";
  if (action === "expires" || !action) return "Upphör";
  return action;
};

const computeDisplayStatus = (agreement: Agreement): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
  const today = new Date().toISOString().split("T")[0];

  if (!agreement.life_of_copyright) {
    const ret = calcRetentionDate(
      agreement.expiry_date || "",
      (agreement.retention_years || "").toString(),
      agreement.post_expiry_action || "expires",
      agreement.rolling_end_date || "",
    );

    if (ret.retentionDate && ret.retentionDate <= today) {
      return { label: "Retention utgången", variant: "destructive" };
    }
  }

  if (agreement.expiry_date && agreement.expiry_date <= today && !isRolling(agreement.post_expiry_action || "expires")) {
    return { label: "Avslutat", variant: "secondary" };
  }

  return { label: "Aktivt", variant: "default" };
};

const ClientDetail = () => {
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const selectedAgreementId = searchParams.get("agreement");
  const { data: client, isLoading: loadingClient } = useClient(id);
  const { data: allWorks } = useWorks();
  const { data: agreements, isLoading: loadingAgreements } = useAgreements();

  const clientAgreements = (agreements?.filter((a) => a.client_id === id) ?? []).filter((agreement) => {
    if (!selectedAgreementId) return true;
    return agreement.id === selectedAgreementId;
  });
  const clientAgreementIds = clientAgreements.map((a) => a.id);

  // Fetch agreement_works mapping per agreement
  const { data: agreementWorksMap } = useQuery({
    queryKey: ["client-agreement-works-map", id, clientAgreementIds],
    enabled: clientAgreementIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreement_works")
        .select("agreement_id, work_id")
        .in("agreement_id", clientAgreementIds);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data as any[]).forEach((d) => {
        if (!map[d.agreement_id]) map[d.agreement_id] = [];
        map[d.agreement_id].push(d.work_id);
      });
      return map;
    },
  });

  const fullName = client ? `${client.first_name} ${client.last_name}`.trim() : "";

  // All work IDs linked to any of this client's agreements
  const allLinkedWorkIds = new Set(Object.values(agreementWorksMap ?? {}).flat());
  const clientWorks = allWorks?.filter((w) => {
    const creatorNames = (w.creators.match(/(?:^|,\s*)([^,(]+?)(?:\s*\([^)]*\))?(?=,|$)/g) || [])
      .map((c) => c.replace(/^,\s*/, "").replace(/\s*\(.*\)$/, "").trim().toLowerCase());
    const matchByName = client && creatorNames.includes(fullName.toLowerCase());
    const matchByAgreement = allLinkedWorkIds.has(w.id);
    return matchByName || matchByAgreement;
  }) ?? [];

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
          <CardTitle>{fullName}</CardTitle>
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

      {loadingAgreements ? (
        <p className="text-muted-foreground text-sm">Laddar avtal...</p>
      ) : clientAgreements.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Inga förlagsavtal kopplade till denna klient.</p>
          </CardContent>
        </Card>
      ) : (
        clientAgreements.map((agreement) => {
          const status = computeDisplayStatus(agreement);
          const retention = !agreement.life_of_copyright
            ? calcRetentionDate(
                agreement.expiry_date || "",
                (agreement.retention_years || "").toString(),
                agreement.post_expiry_action || "expires",
                agreement.rolling_end_date || "",
              )
            : null;
          const linkedWorkIds = agreementWorksMap?.[agreement.id] ?? [];
          const linkedWorks = allWorks?.filter((w) => linkedWorkIds.includes(w.id)) ?? [];

          return (
            <Card key={agreement.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">
                    Förlagsavtal — {typeLabels[agreement.agreement_type] || agreement.agreement_type}
                  </CardTitle>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                {agreement.file_path && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={async () => {
                      try {
                        const url = await getAgreementSignedUrl(agreement.file_path!);
                        setPdfViewerUrl(url);
                      } catch {
                        toast.error("Kunde inte öppna avtalet");
                      }
                    }}
                  >
                    <FileText className="h-4 w-4" /> Visa avtal
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Internt förlag</dt>
                    <dd><Badge variant="outline">{agreement.internal_publisher || "MSCP"}</Badge></dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Avtalsdatum</dt>
                    <dd>{agreement.agreement_date}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Förfallodatum</dt>
                    <dd>{agreement.expiry_date || "—"}</dd>
                  </div>
                  {agreement.share_percentage != null && (
                    <div>
                      <dt className="text-muted-foreground">Andel</dt>
                      <dd>{agreement.share_percentage}%</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Life of Copyright</dt>
                    <dd>{agreement.life_of_copyright ? <Badge variant="secondary">Ja</Badge> : <span className="text-muted-foreground">Nej</span>}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Vid förfall</dt>
                    <dd>{getPostExpiryLabel(agreement.post_expiry_action)}</dd>
                  </div>
                  {retention?.retentionDate && (
                    <div>
                      <dt className="text-muted-foreground">Retention t.o.m.</dt>
                      <dd className="flex items-center gap-1">
                        {retention.retentionDate}
                        {!retention.isLocked && <Badge variant="outline" className="text-xs">dynamiskt</Badge>}
                      </dd>
                    </div>
                  )}
                  {agreement.retention_years != null && (
                    <div>
                      <dt className="text-muted-foreground">Retention (år)</dt>
                      <dd>{agreement.retention_years}</dd>
                    </div>
                  )}
                  {agreement.notes && (
                    <div className="sm:col-span-3">
                      <dt className="text-muted-foreground">Anteckningar</dt>
                      <dd className="whitespace-pre-line">{agreement.notes}</dd>
                    </div>
                  )}
                </dl>

                {linkedWorks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Kopplade verk ({linkedWorks.length})</h4>
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
                          {linkedWorks.map((w) => (
                            <TableRow key={w.id}>
                              <TableCell className="font-medium">
                                <Link to={`/works/${w.id}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                                  {w.title}
                                </Link>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{w.project || "—"}</TableCell>
                              <TableCell><Badge variant="secondary">{w.publishing_type}</Badge></TableCell>
                              <TableCell><Badge variant="outline">{w.stim_status}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* PDF viewer dialog */}
      <Dialog open={!!pdfViewerUrl} onOpenChange={(open) => {
        if (!open) {
          if (pdfViewerUrl?.startsWith("blob:")) URL.revokeObjectURL(pdfViewerUrl);
          setPdfViewerUrl(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Avtalsdokument</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[60vh]">
            {pdfViewerUrl && <AgreementPdfPreview fileUrl={pdfViewerUrl} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetail;
