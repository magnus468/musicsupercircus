import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWorks } from "@/hooks/useWorks";
import { Search, Check } from "lucide-react";

interface MatchWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlementTitle: string;
  totalAmount: number;
  onMatch: (workTitle: string) => void;
  isMatching: boolean;
}

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset search when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setDebouncedSearch("");
    }
  }, [open]);

  // Use server-side search to handle 1500+ works
  const { data: works, isLoading } = useWorks(debouncedSearch || undefined);

  const displayed = (works ?? []).slice(0, 30);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Matcha avräkningsverk</DialogTitle>
          <div className="space-y-1 pt-1">
            <p className="text-sm font-medium">{settlementTitle}</p>
            <Badge variant="secondary" className="text-xs">{fmt(totalAmount)}</Badge>
          </div>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök bland registrerade verk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-1 min-h-0">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-6">Söker...</p>
          ) : displayed.length > 0 ? (
            displayed.map((w) => (
              <button
                key={w.id}
                disabled={isMatching}
                onClick={() => onMatch(w.title)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors flex items-center justify-between gap-2 group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{w.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {w.creators.replace(/\([^)]*\)/g, "").replace(/,\s*$/, "").trim()}
                    {w.project && ` · ${w.project}`}
                  </p>
                </div>
                <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 shrink-0" />
              </button>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground py-6">
              {search.trim() ? "Inga verk hittades" : "Skriv för att söka bland verk"}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MatchWorkDialog;
