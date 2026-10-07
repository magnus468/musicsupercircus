import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorks } from "@/hooks/useWorks";
import { useWorkRegistrations, useInvalidateRegistrations, openRegistrationPdf, type WorkRegistration } from "@/hooks/useWorkRegistrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import MatchWorkDialog from "@/components/settlements/MatchWorkDialog";

type Tab = "mismatch" | "uncertain" | "unmatched" | "missing";
const PAGE = 100;

const names = (r: WorkRegistration) => r.creators.map((c) => c.name).join(", ");

const RegistrationReview = () => {
  const { data: regs = [], isLoading } = useWorkRegistrations();
  const { data: works = [] } = useWorks();
  const invalidate = useInvalidateRegistrations();
  const [tab, setTab] = useState<Tab>("mismatch");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [linking, setLinking] = useState<WorkRegistration | null>(null);

  const workById = useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);
  const registeredIds = useMemo(() => new Set(regs.map((r) => r.work_id).filter(Boolean)), [regs]);

  const lists = useMemo(() => ({
    mismatch: regs.filter((r) => r.work_id && r.share_mismatch),
    uncertain: regs.filter((r) => r.match_status === "uncertain"),
    unmatched: regs.filter((r) => r.match_status === "unmatched"),
  }), [regs]);
  const missing = useMemo(() => works.filter((w) => !registeredIds.has(w.id)), [works, registeredIds]);

  const ql = q.trim().toLowerCase();
  const rows = tab === "missing" ? [] : lists[tab].filter((r) => !ql || `${r.title} ${names(r)} ${r.folder}`.toLowerCase().includes(ql));
  const missingRows = missing.filter((w) => !ql || `${w.title} ${w.project} ${w.creators}`.toLowerCase().includes(ql));

  const link = async (workId: string) => {
    if (!linking) return;
    const { error } = await supabase
      .from("work_registrations")
      .update({ work_id: workId, match_status: "matched", match_note: "Manuellt kopplad" })
      .eq("id", linking.id);
    if (error) return toast.error("Kunde inte koppla kvittot");
    toast.success("Kvittot är kopplat till verket");
    setLinking(null);
    invalidate();
  };

  const open = (r: WorkRegistration) =>
    r.pdf_path && openRegistrationPdf(r.pdf_path).catch(() => toast.error("Kunde inte öppna kvittot"));

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "mismatch", label: "Avvikande andelar", n: lists.mismatch.length },
    { id: "uncertain", label: "Osäker koppling", n: lists.uncertain.length },
    { id: "unmatched", label: "Anmälda, saknas i katalogen", n: lists.unmatched.length },
    { id: "missing", label: "I katalogen, inget kvitto", n: missing.length },
  ];

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> STIM-verkanmälningar (kvitton)
          <span className="text-sm font-normal text-muted-foreground">{regs.length} kvitton</span>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "outline"} onClick={() => { setTab(t.id); setLimit(PAGE); }}>
              {t.label} <Badge variant="secondary" className="ml-2">{t.n}</Badge>
            </Button>
          ))}
        </div>
        <Input placeholder="Filtrera på titel, namn eller mapp..." value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laddar...</p>
        ) : tab === "missing" ? (
          <Table>
            <TableHeader><TableRow><TableHead>Verk</TableHead><TableHead>Projekt</TableHead></TableRow></TableHeader>
            <TableBody>
              {missingRows.slice(0, limit).map((w) => (
                <TableRow key={w.id}>
                  <TableCell><Link className="text-primary hover:underline" to={`/works/${w.id}`}>{w.title}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{w.project}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kvitto</TableHead>
                <TableHead>{tab === "mismatch" ? "Avvikelse" : tab === "uncertain" ? "Möjliga verk" : "Upphovspersoner"}</TableHead>
                <TableHead className="w-40"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, limit).map((r) => {
                const w = r.work_id ? workById.get(r.work_id) : null;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[280px]">
                      <div className="font-medium">{w ? <Link className="text-primary hover:underline" to={`/works/${w.id}`}>{r.title}</Link> : r.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.folder}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {tab === "mismatch" ? r.mismatch_note : tab === "uncertain" ? r.match_note : names(r)}
                    </TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap text-right">
                      <Button size="icon" variant="ghost" title="Öppna kvitto" onClick={() => open(r)}><FileText className="h-4 w-4" /></Button>
                      {tab !== "mismatch" && (
                        <Button size="icon" variant="ghost" title="Koppla till verk" onClick={() => setLinking(r)}><Link2 className="h-4 w-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {(tab === "missing" ? missingRows.length : rows.length) > limit && (
          <div className="pt-3 text-center">
            <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + PAGE)}>Visa fler</Button>
          </div>
        )}
      </CardContent>
      {linking && (
        <MatchWorkDialog
          open={!!linking}
          onOpenChange={(o) => !o && setLinking(null)}
          settlementTitle={linking.title}
          onMatch={link}
        />
      )}
    </Card>
  );
};

export default RegistrationReview;
