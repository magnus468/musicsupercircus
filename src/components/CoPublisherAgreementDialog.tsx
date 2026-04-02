import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, ExternalLink } from "lucide-react";
import type { Agreement } from "@/hooks/useAgreements";
import type { Work } from "@/hooks/useWorks";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface Props {
  agreement: Agreement | null;
  allWorks: Work[];
  agreementWorkIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewPdf?: (agreement: Agreement) => void;
}

const typeLabels: Record<string, string> = {
  original: "Original",
  "co-publishing": "Co-publishing",
  administration: "Administration",
  MSCE: "MSCE",
  MSCP: "MSCP",
};

const fmt = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "d MMM yyyy", { locale: sv });
  } catch {
    return dateStr;
  }
};

const computeDuration = (a: Agreement) => {
  if (a.life_of_copyright) return "Life of Copyright";
  if (!a.expiry_date) return "Inget slutdatum angivet";

  const start = new Date(a.agreement_date);
  const end = new Date(a.expiry_date);
  const diffMs = end.getTime() - start.getTime();
  const years = Math.round(diffMs / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10;
  if (years >= 1) return `${years} år`;
  const months = Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000));
  return `${months} mån`;
};

const postExpiryLabel = (action: string) => {
  switch (action) {
    case "expires": return "Upphör";
    case "rolling_1y": return "Rullande 1 år";
    case "rolling_2y": return "Rullande 2 år";
    case "rolling_3y": return "Rullande 3 år";
    default: return action;
  }
};

const computeStatus = (a: Agreement): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
  const today = new Date().toISOString().split("T")[0];
  if (!a.life_of_copyright && a.retention_date && a.retention_date <= today) {
    return { label: "Retention utgången", variant: "destructive" };
  }
  if (a.expiry_date && a.expiry_date <= today && !a.post_expiry_action?.startsWith("rolling")) {
    return { label: "Avslutat", variant: "secondary" };
  }
  return { label: "Aktivt", variant: "default" };
};

const CoPublisherAgreementDialog = ({ agreement, allWorks, agreementWorkIds, open, onOpenChange, onViewPdf }: Props) => {
  const linkedWorks = useMemo(() => {
    if (!agreementWorkIds?.length) return [];
    return allWorks.filter((w) => agreementWorkIds.includes(w.id));
  }, [allWorks, agreementWorkIds]);

  if (!agreement) return null;

  const status = computeStatus(agreement);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Förlagsavtal – {agreement.client_name || "Okänd"}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
          {/* Agreement details grid */}
          <div className="rounded-lg border bg-card p-4">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs mb-0.5">Avtalstyp</dt>
                <dd className="font-medium">{typeLabels[agreement.agreement_type] || agreement.agreement_type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-0.5">Status</dt>
                <dd><Badge variant={status.variant}>{status.label}</Badge></dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-0.5">Internt förlag</dt>
                <dd className="font-medium">{agreement.internal_publisher}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-0.5">Andel</dt>
                <dd className="font-medium">{agreement.share_percentage != null ? `${agreement.share_percentage}%` : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-0.5">Startdatum</dt>
                <dd className="font-medium">{fmt(agreement.agreement_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-0.5">Slutdatum</dt>
                <dd className="font-medium">{agreement.life_of_copyright ? "—" : fmt(agreement.expiry_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-0.5">Löptid</dt>
                <dd className="font-medium">{computeDuration(agreement)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs mb-0.5">Vid förfall</dt>
                <dd className="font-medium">{postExpiryLabel(agreement.post_expiry_action)}</dd>
              </div>

              {/* LoC or Retention */}
              {agreement.life_of_copyright ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs mb-0.5">Life of Copyright</dt>
                  <dd><Badge className="bg-primary/15 text-primary border-0">Ja</Badge></dd>
                </div>
              ) : (
                <>
                  {agreement.retention_years != null && (
                    <div>
                      <dt className="text-muted-foreground text-xs mb-0.5">Retention (år)</dt>
                      <dd className="font-medium">{agreement.retention_years}</dd>
                    </div>
                  )}
                  {agreement.retention_date && (
                    <div>
                      <dt className="text-muted-foreground text-xs mb-0.5">Retention t.o.m.</dt>
                      <dd className="font-medium">{fmt(agreement.retention_date)}</dd>
                    </div>
                  )}
                </>
              )}

              {agreement.rolling_end_date && (
                <div>
                  <dt className="text-muted-foreground text-xs mb-0.5">Rullande slutdatum</dt>
                  <dd className="font-medium">{fmt(agreement.rolling_end_date)}</dd>
                </div>
              )}

              {agreement.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground text-xs mb-0.5">Anteckningar</dt>
                  <dd className="whitespace-pre-line text-muted-foreground">{agreement.notes}</dd>
                </div>
              )}
            </dl>

            {agreement.file_path && (
              <div className="mt-3 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => onViewPdf?.(agreement)}
                >
                  <FileText className="h-4 w-4" />
                  {agreement.file_name || "Visa avtal"}
                </Button>
              </div>
            )}
          </div>

          {/* Linked works */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">
              Kopplade verk ({linkedWorks.length})
            </h3>
            {linkedWorks.length > 0 ? (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titel</TableHead>
                      <TableHead>Projekt</TableHead>
                      <TableHead>Typ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedWorks.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/works/${w.id}`}
                            className="text-primary underline underline-offset-2 hover:text-primary/80"
                          >
                            {w.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{w.project || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {w.publishing_type === "original" ? "—" : w.publishing_type}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Inga verk kopplade till detta avtal.</p>
            )}
          </div>

          {/* Link to agreements page */}
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground">
              <Link to={`/agreements?highlight=${agreement.id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                Visa i avtalslistan
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoPublisherAgreementDialog;
