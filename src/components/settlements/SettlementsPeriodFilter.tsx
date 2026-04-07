import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarRange } from "lucide-react";
import type { SettlementPeriod } from "@/hooks/useSettlements";

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

interface Props {
  periods: SettlementPeriod[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}

export const SettlementsPeriodFilter = ({ periods, selectedKey, onSelect }: Props) => {
  if (!periods || periods.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Avräkningsperiod</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedKey === null ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(null)}
          >
            Alla perioder
          </Button>
          {periods.map((p) => (
            <Button
              key={p.distributionKey}
              variant={selectedKey === p.distributionKey ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect(p.distributionKey)}
              className="gap-2"
            >
              <span>{p.distribution}</span>
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {p.rowCount.toLocaleString("sv-SE")}
              </Badge>
            </Button>
          ))}
        </div>
        {selectedKey && (
          <p className="mt-2 text-xs text-muted-foreground">
            Visar data för: {periods.find((p) => p.distributionKey === selectedKey)?.distribution}
            {" — "}
            {fmt(periods.find((p) => p.distributionKey === selectedKey)?.total ?? 0)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
