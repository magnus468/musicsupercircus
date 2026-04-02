import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useWorks } from "@/hooks/useWorks";
import { useClients } from "@/hooks/useClients";
import { useAgreements, useAgreementWorks, getAgreementSignedUrl, type Agreement } from "@/hooks/useAgreements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Pencil } from "lucide-react";
import WorkForm from "@/components/WorkForm";
import CoPublisherAgreementDialog from "@/components/CoPublisherAgreementDialog";
import AgreementPdfPreview from "@/components/AgreementPdfPreview";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

/** Fetch all agreement_works rows so we can show linked works per agreement */
const useAllAgreementWorks = () => {
  return useQuery({
    queryKey: ["all-agreement-works"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreement_works")
        .select("agreement_id, work_id");
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data as any[]).forEach((d) => {
        if (!map[d.agreement_id]) map[d.agreement_id] = [];
        map[d.agreement_id].push(d.work_id);
      });
      return map;
    },
  });
};

const WorkDetail = () => {
  const [editing, setEditing] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const { id } = useParams<{id: string;}>();
  const { data: works, isLoading } = useWorks();
  const { data: clients } = useClients();
  const { data: agreements } = useAgreements();
  const { data: linkedAgreementIds } = useAgreementWorks(id);
  const { data: allAgreementWorks } = useAllAgreementWorks();

  const work = works?.find((w) => w.id === id);

  const clientMap = new Map<string, string>();
  clients?.forEach((c) => clientMap.set(`${c.first_name} ${c.last_name}`.trim().toLowerCase(), c.id));

  // Map co-publisher name (lowercase) → full agreement object
  const coPublisherAgreementMap = useMemo(() => {
    const map = new Map<string, Agreement>();
    if (!agreements || !linkedAgreementIds) return map;
    const linked = agreements.filter((a) => linkedAgreementIds.includes(a.id));
    linked.forEach((a) => {
      if (a.client_name) {
        map.set(a.client_name.toLowerCase(), a);
      }
    });
    return map;
  }, [agreements, linkedAgreementIds]);

  const handleViewPdf = async (agreement: Agreement) => {
    if (!agreement.file_path) return;
    try {
      const url = await getAgreementSignedUrl(agreement.file_path);
      setPdfViewerUrl(url);
    } catch {
      toast.error("Kunde inte öppna avtalet");
    }
  };

  const closePdfViewer = () => {
    if (pdfViewerUrl?.startsWith("blob:")) URL.revokeObjectURL(pdfViewerUrl);
    setPdfViewerUrl(null);
  };

  if (isLoading) return <p className="text-muted-foreground">Laddar...</p>;
  if (!work) return <p className="text-muted-foreground">Verket hittades inte.</p>;

  const creatorEntries = (work.creators.match(/(?:^|,\s*)([^,(]+?)(?:\s*\(([^)]*)\))?(?=,|$)/g) || []).map((c) => {
    const trimmed = c.replace(/^,\s*/, "").trim();
    const match = trimmed.match(/^(.+?)\s*\(([^)]*)\)$/);
    if (match) {
      const name = match[1].trim();
      const meta = match[2];
      const roleMatch = meta.match(/^(CA|C|A|Arr|E)/i);
      const shareMatch = meta.match(/(?<![w:])(\d+(?:\.\d+)?)%/);
      const rowMatch = meta.match(/row:(\d+(?:\.\d+)?)%/);
      const repr = meta.includes("repr");
      return { name, role: roleMatch?.[1] || "", share: shareMatch?.[1] || "", shareRow: rowMatch?.[1] || "", repr };
    }
    return { name: trimmed, role: "", share: "", shareRow: "", repr: false };
  });

  const publishingLabel = (type: string) => {
    if (type === "MSCE") return "MSCE";
    if (type === "MSCP") return "MSCP";
    if (type === "administration") return "Administration";
    return type;
  };

  const stimLabel = (status: string) => {
    if (status === "anmäld") return "Anmäld";
    if (status === "claimad") return "Claimad";
    return "Ej anmäld";
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/works"><ArrowLeft className="h-4 w-4" /> Tillbaka</Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" /> Redigera
        </Button>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redigera verk</DialogTitle>
          </DialogHeader>
          <WorkForm work={work} onSuccess={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>{work.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            {work.project &&
            <div>
                <dt className="text-muted-foreground">Projekt</dt>
                <dd>{work.project}</dd>
              </div>
            }
            <div>
              <dt className="text-muted-foreground">Internt förlag</dt>
              <dd><Badge variant="secondary">{publishingLabel(work.publishing_type)}</Badge></dd>
            </div>
            <div>
              <dt className="text-muted-foreground">STIM-status</dt>
              <dd><Badge variant="outline">{stimLabel(work.stim_status)}</Badge></dd>
            </div>
            {work.share_percentage != null &&
            <div>
                <dt className="text-muted-foreground">Andel</dt>
                <dd>{work.share_percentage}%</dd>
              </div>
            }
            {work.co_publishers && work.co_publishers.length > 0 && <div>
                <dt className="text-muted-foreground">Co-publishers</dt>
                <dd className="space-x-1">
                  {work.co_publishers.map((cp, i) => {
                    const agreement = coPublisherAgreementMap.get(cp.toLowerCase());
                    return (
                      <span key={cp}>
                        {agreement ? (
                          <button
                            onClick={() => setSelectedAgreement(agreement)}
                            className="text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer"
                          >
                            {cp}
                          </button>
                        ) : (
                          <span>{cp}</span>
                        )}
                        {i < work.co_publishers!.length - 1 && ", "}
                      </span>
                    );
                  })}
                </dd>
              </div>}
            {work.stim_comment &&
            <div className="sm:col-span-2">
                <dt className="text-muted-foreground">STIM-kommentar</dt>
                <dd className="whitespace-pre-line">{work.stim_comment}</dd>
              </div>
            }
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upphovspersoner ({creatorEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Namn</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Roll</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Norden</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">ROW</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Representerar</th>
                </tr>
              </thead>
              <tbody>
                {[...creatorEntries].sort((a, b) => {
                  const aIsE = a.role === "E" ? 1 : 0;
                  const bIsE = b.role === "E" ? 1 : 0;
                  return aIsE - bIsE;
                }).map((entry, i) => {
                  const clientId = clientMap.get(entry.name.toLowerCase());
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">
                        {clientId ?
                        <Link to={`/clients/${clientId}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                            {entry.name}
                          </Link> :
                        entry.name}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{entry.role || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{entry.share ? `${entry.share}%` : "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{entry.shareRow ? `${entry.shareRow}%` : "—"}</td>
                      <td className="px-4 py-2">
                        {entry.repr ?
                        <Badge className="bg-primary/15 text-primary border-0">Ja</Badge> :
                        <span className="text-muted-foreground">Nej</span>
                        }
                      </td>
                    </tr>);
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Co-publisher agreement dialog */}
      <CoPublisherAgreementDialog
        agreement={selectedAgreement}
        allWorks={works || []}
        agreementWorkIds={selectedAgreement ? (allAgreementWorks?.[selectedAgreement.id] || []) : []}
        open={!!selectedAgreement}
        onOpenChange={(open) => !open && setSelectedAgreement(null)}
        onViewPdf={handleViewPdf}
      />

      {/* PDF viewer dialog */}
      <Dialog open={!!pdfViewerUrl} onOpenChange={(open) => !open && closePdfViewer()}>
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

export default WorkDetail;
