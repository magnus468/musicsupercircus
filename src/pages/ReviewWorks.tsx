import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useWorks, useDeleteWork, type Work } from "@/hooks/useWorks";
import { useClients } from "@/hooks/useClients";
import { useAgreements } from "@/hooks/useAgreements";
import { useUnmatchedSettlementWorks, useMatchSettlementWork } from "@/hooks/useSettlements";
import MatchWorkDialog from "@/components/settlements/MatchWorkDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, AlertTriangle, Music } from "lucide-react";
import WorkForm from "@/components/WorkForm";
import { toast } from "sonner";

type IssueType = "no_publisher" | "bad_split" | "no_repr" | "no_project" | "no_agreement";

const ISSUE_LABELS: Record<IssueType, string> = {
  no_publisher: "Saknar förlag",
  bad_split: "Felaktig split",
  no_repr: "Saknar repr",
  no_project: "Saknar projekt",
  no_agreement: "Inget avtal",
};

const ISSUE_COLORS: Record<IssueType, string> = {
  no_publisher: "bg-destructive/15 text-destructive",
  bad_split: "bg-warning/15 text-warning-foreground",
  no_repr: "bg-orange-500/15 text-orange-600",
  no_project: "bg-muted text-muted-foreground",
  no_agreement: "bg-violet-500/15 text-violet-600",
};

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

const parseCreatorParts = (creators: string) => {
  return (creators.match(/(?:^|,\s*)([^,(]+?)(?:\s*\([^)]*\))?(?=,|$)/g) || [])
    .map((c) => ({
      full: c.replace(/^,\s*/, "").trim(),
      name: c.replace(/^,\s*/, "").replace(/\s*\(.*\)$/, "").trim(),
      parens: (c.match(/\(([^)]*)\)/) || [])[1] || "",
    }));
};

const detectIssues = (
  work: Work,
  agreementClientNames: Set<string>
): IssueType[] => {
  const issues: IssueType[] = [];
  const parts = work.creators.split(/\),\s*/).map((p, i, arr) => (i < arr.length - 1 ? p + ")" : p));

  const parsed = parts.map((part) => {
    const match = part.trim().match(/^(.+?)\s*\((\w+)(?:,.*?)?\)$/);
    return match ? { name: match[1].trim(), role: match[2], parens: (part.match(/\(([^)]*)\)/) || [])[1] || "" } : null;
  }).filter(Boolean) as { name: string; role: string; parens: string }[];

  if (!parsed.some((p) => p.role === "E")) {
    issues.push("no_publisher");
  }

  const nonE = parsed.filter((p) => p.role !== "E");
  const hasAnyShare = parsed.some((p) => p.parens.match(/\d+(\.\d+)?%/));
  if (!hasAnyShare && parsed.length > 0) {
    issues.push("bad_split");
  }

  if (nonE.some((p) => !p.parens.includes("repr"))) {
    issues.push("no_repr");
  }

  if (!work.project?.trim()) {
    issues.push("no_project");
  }

  if (work.co_publishers && work.co_publishers.length > 0) {
    const externalPubs = work.co_publishers.filter(
      (cp) => !cp.toLowerCase().includes("music super circus")
    );
    if (externalPubs.length > 0 && !externalPubs.some((cp) => agreementClientNames.has(cp.toLowerCase()))) {
      issues.push("no_agreement");
    }
  }

  return issues;
};

const ReviewWorks = () => {
  const { data: works, isLoading } = useWorks();
  const { data: clients } = useClients();
  const { data: agreements } = useAgreements();
  const { data: unmatchedWorks, isLoading: unmatchedLoading } = useUnmatchedSettlementWorks();
  const deleteWork = useDeleteWork();
  const matchWork = useMatchSettlementWork();
  const [editWork, setEditWork] = useState<Work | null>(null);
  const [matchTarget, setMatchTarget] = useState<{ title: string; amount: number } | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<IssueType>>(
    new Set(["no_publisher", "bad_split", "no_repr", "no_project", "no_agreement"])
  );
  const [showUnmatched, setShowUnmatched] = useState(true);

  const agreementClientNames = useMemo(() => {
    const set = new Set<string>();
    agreements?.forEach((a) => {
      if (a.client_name) set.add(a.client_name.toLowerCase());
    });
    return set;
  }, [agreements]);

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients?.forEach((c) => map.set(`${c.first_name} ${c.last_name}`.trim().toLowerCase(), c.id));
    return map;
  }, [clients]);

  const worksWithIssues = useMemo(() => {
    if (!works) return [];
    return works
      .map((w) => ({ work: w, issues: detectIssues(w, agreementClientNames) }))
      .filter((w) => w.issues.length > 0)
      .filter((w) => w.issues.some((i) => activeFilters.has(i)));
  }, [works, agreementClientNames, activeFilters]);

  const issueCounts = useMemo(() => {
    if (!works) return {} as Record<IssueType, number>;
    const counts: Record<string, number> = {};
    works.forEach((w) => {
      detectIssues(w, agreementClientNames).forEach((i) => {
        counts[i] = (counts[i] || 0) + 1;
      });
    });
    return counts as Record<IssueType, number>;
  }, [works, agreementClientNames]);

  const toggleFilter = useCallback((type: IssueType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Vill du verkligen ta bort detta verk?")) return;
    try {
      await deleteWork.mutateAsync(id);
      toast.success("Verk borttaget");
    } catch {
      toast.error("Kunde inte ta bort verket");
    }
  }, [deleteWork]);

  const creatorItems = (creators: string) => {
    return parseCreatorParts(creators)
      .filter((c) => c.name && !c.parens.split(",").map((t) => t.trim()).includes("E"));
  };

  return (
    <div className="space-y-6">
      {/* Issues section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning-foreground" />
          <span className="text-muted-foreground">
            {isLoading ? "Laddar..." : `${worksWithIssues.length} verk med problem`}
            {!isLoading && works && ` (av ${works.length} totalt)`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(ISSUE_LABELS) as IssueType[]).map((type) => (
            <label key={type} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={activeFilters.has(type)}
                onCheckedChange={() => toggleFilter(type)}
                className="h-3.5 w-3.5"
              />
              <Badge className={ISSUE_COLORS[type] + " border-0 text-xs"}>
                {ISSUE_LABELS[type]} ({issueCounts[type] || 0})
              </Badge>
            </label>
          ))}
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Projekt</TableHead>
                <TableHead>Upphovspersoner</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {worksWithIssues.map(({ work, issues }) => (
                <TableRow key={work.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    <Link to={`/works/${work.id}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                      {work.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[150px] truncate">
                    {work.project || "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm">
                    {creatorItems(work.creators).map(({ name }, i, arr) => {
                      const clientId = clientMap.get(name.toLowerCase());
                      return (
                        <span key={`${work.id}-${name}-${i}`}>
                          {clientId ? (
                            <Link to={`/clients/${clientId}`} className="text-primary underline underline-offset-2 hover:text-primary/80">
                              {name}
                            </Link>
                          ) : name}
                          {i < arr.length - 1 && ", "}
                        </span>
                      );
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {issues.filter((i) => activeFilters.has(i)).map((issue) => (
                        <Badge key={issue} className={ISSUE_COLORS[issue] + " border-0 text-xs"}>
                          {ISSUE_LABELS[issue]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditWork(work)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(work.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && worksWithIssues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    🎉 Inga verk med problem hittades!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Unmatched settlement works */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">
                Omatchade avräkningsverk
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {unmatchedLoading ? "..." : unmatchedWorks?.length ?? 0}
              </Badge>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm">
              <Checkbox
                checked={showUnmatched}
                onCheckedChange={(v) => setShowUnmatched(!!v)}
                className="h-3.5 w-3.5"
              />
              <span className="text-muted-foreground">Visa</span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Verk med intäkter i avräkningar som inte matchar något verk i verklistan.
          </p>
        </CardHeader>
        {showUnmatched && (
          <CardContent className="p-0">
            {unmatchedLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                Laddar...
              </div>
            ) : unmatchedWorks && unmatchedWorks.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Verktitel (avräkning)</TableHead>
                      <TableHead>Kompositör</TableHead>
                      <TableHead className="text-right">Totalt belopp</TableHead>
                      <TableHead className="text-right">Rader</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmatchedWorks.map((uw) => (
                      <TableRow key={uw.work_title} className="cursor-pointer hover:bg-accent/50" onClick={() => setMatchTarget({ title: uw.work_title, amount: Number(uw.total_amount) })}>
                        <TableCell className="font-medium text-primary underline underline-offset-2">{uw.work_title}</TableCell>
                        <TableCell className="text-muted-foreground">{uw.composers || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {fmt(Number(uw.total_amount))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{uw.row_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                ✅ Alla avräkningsverk är matchade!
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={!!editWork} onOpenChange={(open) => !open && setEditWork(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Redigera verk</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            {editWork && <WorkForm work={editWork} onSuccess={() => setEditWork(null)} />}
          </div>
        </DialogContent>
      </Dialog>

      {matchTarget && (
        <MatchWorkDialog
          open={!!matchTarget}
          onOpenChange={(open) => !open && setMatchTarget(null)}
          settlementTitle={matchTarget.title}
          totalAmount={matchTarget.amount}
          isMatching={matchWork.isPending}
          onMatch={(newTitle) => {
            matchWork.mutate(
              { oldTitle: matchTarget.title, newTitle },
              {
                onSuccess: () => {
                  toast.success(`"${matchTarget.title}" matchad till "${newTitle}"`);
                  setMatchTarget(null);
                },
                onError: () => toast.error("Kunde inte matcha verket"),
              }
            );
          }}
        />
      )}
    </div>
  );
};

export default ReviewWorks;
