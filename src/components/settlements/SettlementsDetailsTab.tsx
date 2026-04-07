import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Settlement } from "@/hooks/useSettlements";

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";

interface Props {
  rows: Settlement[];
  totalCount: number;
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const SettlementsDetailsTab = ({
  rows,
  totalCount,
  isLoading,
  search,
  onSearchChange,
  page,
  pageSize,
  onPageChange,
}: Props) => {
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök verk, kompositör, land, källa..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{totalCount.toLocaleString("sv-SE")} rader</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Laddar...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Verk</TableHead>
                    <TableHead className="text-right">Belopp</TableHead>
                    <TableHead>Kompositör</TableHead>
                    <TableHead>Rättighet</TableHead>
                    <TableHead>Land</TableHead>
                    <TableHead>Källa</TableHead>
                    <TableHead>Underkälla</TableHead>
                    <TableHead>Produktion</TableHead>
                    <TableHead className="text-right">Användningar</TableHead>
                    <TableHead>Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium whitespace-nowrap">{s.work_title}</TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(Number(s.amount))}</TableCell>
                      <TableCell>{s.composers}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {s.type_of_right}
                        </Badge>
                      </TableCell>
                      <TableCell>{s.country}</TableCell>
                      <TableCell>{s.source}</TableCell>
                      <TableCell>{s.sub_source}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{s.production_title}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.number_of_uses}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {s.from_date && s.to_date ? `${s.from_date} – ${s.to_date}` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    Sida {page + 1} av {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => onPageChange(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Föregående
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => onPageChange(page + 1)}
                    >
                      Nästa
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
