import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Check, Loader2 } from "lucide-react";
import { buildMatchWorkSearch } from "@/lib/matchWorkSearch";

interface MatchWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlementTitle: string;
  totalAmount: number;
  onMatch: (workTitle: string) => Promise<void>;
  isMatching: boolean;
}

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

const useSearchWorks = (search: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["match-work-search", search],
    enabled: enabled && search.trim().length >= 1,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("id, title, creators, project")
        .or(buildMatchWorkSearch(search))
        .order("title")
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
};

const MatchWorkDialog = ({
  open,
  onOpenChange,
  settlementTitle,
  totalAmount,
  onMatch,
  isMatching,
}: MatchWorkDialogProps) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedWork, setSelectedWork] = useState<{ id: string; title: string; creators: string; project: string | null } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = isMatching || saving;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setDebouncedSearch("");
      setSelectedWork(null);
      setSaveError(null);
    }
  }, [open, settlementTitle]);

  const { data: works, isLoading, isError } = useSearchWorks(debouncedSearch, open);

  const confirmMatch = async () => {
    if (!selectedWork || busy) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onMatch(selectedWork.title);
    } catch {
      setSaveError("Kopplingen kunde inte sparas. Försök igen. Ditt val finns kvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!busy) onOpenChange(nextOpen); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[80dvh] flex flex-col" aria-busy={busy}>
        <DialogHeader className="shrink-0 pr-5">
          <DialogTitle className="text-base">Matcha avräkningsverk</DialogTitle>
          <div className="space-y-1 pt-1">
            <p className="text-sm font-medium break-words">{settlementTitle}</p>
            <Badge variant="secondary" className="text-xs">{fmt(totalAmount)}</Badge>
          </div>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök titel eller upphovsperson..."
            value={search}
            disabled={busy}
            onChange={(e) => { setSearch(e.target.value); setSelectedWork(null); setSaveError(null); }}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-1 min-h-0">
          {!debouncedSearch.trim() ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Skriv för att söka bland verk
            </p>
          ) : isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-6">Söker...</p>
          ) : isError ? (
            <p role="alert" className="text-sm text-destructive py-6">Kunde inte hämta verk. Försök söka igen.</p>
          ) : works && works.length > 0 ? (
            works.map((w) => (
              <Button
                key={w.id}
                type="button"
                variant={selectedWork?.id === w.id ? "secondary" : "ghost"}
                aria-pressed={selectedWork?.id === w.id}
                disabled={busy}
                onClick={() => { setSelectedWork(w); setSaveError(null); }}
                className="w-full h-auto whitespace-normal text-left px-3 py-2 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{w.title}</p>
                  <p className="text-xs text-muted-foreground break-words">
                    {w.creators.replace(/\([^)]*\)/g, "").replace(/,\s*$/, "").trim()}
                    {w.project && ` · ${w.project}`}
                  </p>
                </div>
                {selectedWork?.id === w.id && <Check className="h-4 w-4 text-primary shrink-0" />}
              </Button>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground py-6">
              Inga verk hittades
            </p>
          )}
        </div>
        <div className="shrink-0 border-t pt-3 space-y-3">
          {selectedWork && <p className="text-sm break-words">Valt verk: <span className="font-medium">{selectedWork.title}</span></p>}
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Avbryt</Button>
            <Button type="button" disabled={!selectedWork || busy} onClick={confirmMatch}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {busy ? "Sparar koppling…" : "OK – spara koppling"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchWorkDialog;
