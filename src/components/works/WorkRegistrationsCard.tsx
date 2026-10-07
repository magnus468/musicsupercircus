import { FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkRegistrations, openRegistrationPdf, type RegParty } from "@/hooks/useWorkRegistrations";

const pct = (v: number | null) => (v == null ? "–" : `${String(v).replace(".", ",")} %`);

const PartyRows = ({ parties, publisher }: { parties: RegParty[]; publisher?: boolean }) => (
  <>
    {parties.map((p, i) => (
      <TableRow key={`${p.name}-${i}`}>
        <TableCell className="text-xs text-muted-foreground">{p.role}</TableCell>
        <TableCell className="font-medium">{p.name}</TableCell>
        <TableCell className="text-xs tabular-nums">{p.ipi ?? "–"}</TableCell>
        <TableCell className="text-xs tabular-nums">{publisher ? p.agreement ?? "–" : ""}</TableCell>
        <TableCell className="text-right tabular-nums">{pct(p.perf)}</TableCell>
        <TableCell className="text-right tabular-nums">{pct(p.mech)}</TableCell>
      </TableRow>
    ))}
  </>
);

const WorkRegistrationsCard = ({ workId }: { workId: string }) => {
  const { data: regs = [] } = useWorkRegistrations(workId);
  if (!regs.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> STIM-verkanmälan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {regs.map((r) => (
          <div key={r.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium">{r.title}</span>
                {r.duration && <span className="text-muted-foreground"> · {r.duration}</span>}
                {r.folder && <div className="text-xs text-muted-foreground">{r.folder}</div>}
              </div>
              {r.pdf_path && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => openRegistrationPdf(r.pdf_path!).catch(() => toast.error("Kunde inte öppna kvittot"))}
                >
                  <FileText className="h-4 w-4" /> Öppna kvitto
                </Button>
              )}
            </div>
            {r.share_mismatch && r.mismatch_note && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Avviker från katalogen: {r.mismatch_note}</span>
              </div>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Namn</TableHead>
                    <TableHead>IPI</TableHead>
                    <TableHead>Avtalsnr</TableHead>
                    <TableHead className="text-right">Utf</TableHead>
                    <TableHead className="text-right">Mek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <PartyRows parties={r.creators} />
                  <PartyRows parties={r.publishers} publisher />
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default WorkRegistrationsCard;
