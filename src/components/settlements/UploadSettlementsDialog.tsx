import { useState } from "react";
import * as XLSX from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type SourceType = "stim" | "wc";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[\s_\-./()]+/g, "").trim();

// Find a row value by trying multiple header aliases (normalized)
const pick = (row: Record<string, any>, aliases: string[]): any => {
  const keys = Object.keys(row);
  for (const a of aliases) {
    const na = norm(a);
    const k = keys.find((k) => norm(k) === na);
    if (k != null && row[k] !== undefined && row[k] !== "") return row[k];
  }
  return undefined;
};

const toNumber = (v: any): number => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(/,/g, ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const toDate = (v: any): string | null => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    return null;
  }
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
};

const detectType = (headers: string[]): SourceType => {
  const set = new Set(headers.map(norm));
  if ([...set].some((h) => h.includes("amountpaidlesstax") || h.includes("paidlesstax"))) return "wc";
  return "stim";
};

const mapStimRow = (row: Record<string, any>) => ({
  work_title: String(pick(row, ["Work Title", "Verktitel", "Title", "Titel"]) ?? "").trim(),
  work_key: pick(row, ["Work Key", "Verknyckel", "Work No", "Work Number"])?.toString() ?? null,
  amount: toNumber(pick(row, ["Amount", "Belopp", "Net Amount"])),
  distribution: pick(row, ["Distribution", "Avräkning", "Distribution Name"])?.toString() ?? null,
  distribution_key: pick(row, ["Distribution Key", "Distribution No", "Avräkningsnummer", "Distribution Number"])?.toString() ?? null,
  recipient_name: pick(row, ["Recipient Name", "Mottagare", "Recipient"])?.toString() ?? null,
  member_number: pick(row, ["Member Number", "Medlemsnummer", "Member No"])?.toString() ?? null,
  ipi_name_number: pick(row, ["IPI Name Number", "IPI", "IPI No"])?.toString() ?? null,
  role: pick(row, ["Role", "Roll"])?.toString() ?? null,
  share: (() => { const v = pick(row, ["Share", "Andel", "Share %"]); return v == null || v === "" ? null : toNumber(v); })(),
  type_of_right: pick(row, ["Type of Right", "Rättighetstyp", "Right Type"])?.toString() ?? null,
  country: pick(row, ["Country", "Land"])?.toString() ?? null,
  source: pick(row, ["Source", "Källa"])?.toString() ?? null,
  sub_source: pick(row, ["Sub Source", "Sub-Source", "Subsource", "Underkälla"])?.toString() ?? null,
  production_title: pick(row, ["Production Title", "Produktionstitel", "Production"])?.toString() ?? null,
  episode_title: pick(row, ["Episode Title", "Avsnittstitel", "Episode"])?.toString() ?? null,
  agreement_key: pick(row, ["Agreement Key", "Avtalsnummer", "Agreement No"])?.toString() ?? null,
  number_of_uses: parseInt(String(pick(row, ["Number of Uses", "Antal användningar", "Uses"]) ?? 0)) || 0,
  from_date: toDate(pick(row, ["From Date", "Från datum", "From"])),
  to_date: toDate(pick(row, ["To Date", "Till datum", "To"])),
  composers: pick(row, ["Composers", "Composer", "Kompositörer", "Writers", "Writer"])?.toString() ?? null,
});

const mapWcRow = (row: Record<string, any>, distribution: string, distribution_key: string) => ({
  work_title: String(pick(row, ["Work Title", "Title", "Composition Title"]) ?? "").trim(),
  work_key: pick(row, ["Work Key", "Work Code", "Work Number", "WorkID"])?.toString() ?? null,
  amount: toNumber(pick(row, ["Amount Paid Less Tax", "Paid Less Tax", "Amount"])),
  distribution,
  distribution_key,
  recipient_name: pick(row, ["Recipient Name", "Recipient", "Payee"])?.toString() ?? null,
  member_number: null,
  ipi_name_number: pick(row, ["IPI Name Number", "IPI"])?.toString() ?? null,
  role: pick(row, ["Role"])?.toString() ?? null,
  share: (() => { const v = pick(row, ["Share", "Share %"]); return v == null || v === "" ? null : toNumber(v); })(),
  type_of_right: pick(row, ["Type of Right", "Right Type", "Royalty Type"])?.toString() ?? null,
  country: pick(row, ["Country", "Territory"])?.toString() ?? null,
  source: pick(row, ["Source", "Society", "Income Source"])?.toString() ?? null,
  sub_source: pick(row, ["Sub Source", "Sub-Source", "Service", "DSP", "Platform"])?.toString() ?? null,
  production_title: pick(row, ["Production Title", "Production"])?.toString() ?? null,
  episode_title: pick(row, ["Episode Title", "Episode"])?.toString() ?? null,
  agreement_key: pick(row, ["Agreement Key", "Contract"])?.toString() ?? null,
  number_of_uses: parseInt(String(pick(row, ["Number of Uses", "Units", "Quantity"]) ?? 0)) || 0,
  from_date: toDate(pick(row, ["From Date", "Period From", "Start Date"])),
  to_date: toDate(pick(row, ["To Date", "Period To", "End Date"])),
  composers: pick(row, ["Composers", "Writers", "Composer/Writer", "Writer"])?.toString() ?? null,
});

export const UploadSettlementsDialog = ({ open, onOpenChange }: Props) => {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<SourceType | "auto">("auto");
  const [wcYear, setWcYear] = useState<string>(new Date().getFullYear().toString());
  const [wcHalf, setWcHalf] = useState<"H1" | "H2">("H1");
  const [progress, setProgress] = useState<{ inserted: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setType("auto");
    setProgress(null);
    setBusy(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
      if (rows.length === 0) throw new Error("Filen innehåller inga rader.");

      const headers = Object.keys(rows[0]);
      const resolvedType: SourceType = type === "auto" ? detectType(headers) : type;

      let mapped: any[];
      if (resolvedType === "wc") {
        const dk = `WC-${wcYear}${wcHalf}`;
        const dist = `Warner/Chappell ${wcHalf} ${wcYear}`;
        mapped = rows.map((r) => mapWcRow(r, dist, dk));
      } else {
        mapped = rows.map(mapStimRow);
      }

      // Filter rows without title
      mapped = mapped.filter((r) => r.work_title && r.work_title.length > 0);
      if (mapped.length === 0) throw new Error("Inga giltiga rader att importera (saknar verktitel).");

      // Apply title mappings (so future imports auto-map)
      const { data: maps } = await supabase
        .from("settlement_title_mappings")
        .select("original_title, mapped_title");
      const mapDict = new Map((maps ?? []).map((m: any) => [m.original_title.toLowerCase().trim(), m.mapped_title]));
      mapped.forEach((r) => {
        const key = r.work_title.toLowerCase().trim();
        const mt = mapDict.get(key);
        if (mt) r.work_title = mt;
      });

      // Insert in batches
      const BATCH = 500;
      let inserted = 0;
      setProgress({ inserted: 0, total: mapped.length });
      for (let i = 0; i < mapped.length; i += BATCH) {
        const chunk = mapped.slice(i, i + BATCH);
        const { error } = await supabase.from("settlements").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
        setProgress({ inserted, total: mapped.length });
      }

      toast({
        title: "Import klar",
        description: `${inserted.toLocaleString("sv-SE")} rader importerade (${resolvedType.toUpperCase()}).`,
      });
      qc.invalidateQueries({ queryKey: ["settlement-stats"] });
      qc.invalidateQueries({ queryKey: ["settlements"] });
      qc.invalidateQueries({ queryKey: ["unmatched-settlement-works"] });
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast({
        title: "Importen misslyckades",
        description: e?.message ?? "Okänt fel",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ladda upp avräkning</DialogTitle>
          <DialogDescription>
            Importera en Excel-fil från STIM eller Warner/Chappell. Filen läses direkt i webbläsaren.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (rekommenderas)</SelectItem>
                <SelectItem value="stim">STIM</SelectItem>
                <SelectItem value="wc">Warner/Chappell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "wc" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>År</Label>
                <Input
                  type="number"
                  value={wcYear}
                  onChange={(e) => setWcYear(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label>Halvår</Label>
                <Select value={wcHalf} onValueChange={(v) => setWcHalf(v as any)} disabled={busy}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="H1">H1</SelectItem>
                    <SelectItem value="H2">H2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Fil</Label>
            <label className="flex items-center gap-3 rounded-md border border-dashed border-input p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 text-sm">
                {file ? (
                  <>
                    <div className="font-medium">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">Välj en .xlsx-fil</span>
                )}
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={busy}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {progress && (
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">
                Importerar {progress.inserted.toLocaleString("sv-SE")} / {progress.total.toLocaleString("sv-SE")} rader
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(progress.inserted / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Avbryt
            </Button>
            <Button onClick={handleUpload} disabled={!file || busy}>
              {busy ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importerar...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Importera</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
