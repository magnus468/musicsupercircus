import { useRef, useState } from "react";
import Papa from "papaparse";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Map common Swedish/English STIM headers → settlements column names.
// Keys are lower-cased + trimmed when looked up.
const HEADER_MAP: Record<string, string> = {
  "verkets titel": "work_title",
  "verktitel": "work_title",
  "work title": "work_title",
  "verknyckel": "work_key",
  "work key": "work_key",
  "belopp": "amount",
  "amount": "amount",
  "avräkning": "distribution",
  "avrakning": "distribution",
  "distribution": "distribution",
  "avräkningsnyckel": "distribution_key",
  "avrakningsnyckel": "distribution_key",
  "distribution key": "distribution_key",
  "distributionsnyckel": "distribution_key",
  "namn": "recipient_name",
  "name": "recipient_name",
  "medlemsnummer": "member_number",
  "member number": "member_number",
  "ipi namnnummer": "ipi_name_number",
  "ipi-namnnummer": "ipi_name_number",
  "ipi name number": "ipi_name_number",
  "roll": "role",
  "role": "role",
  "andel": "share",
  "share": "share",
  "typ av rättighet": "type_of_right",
  "typ av rattighet": "type_of_right",
  "rättighet": "type_of_right",
  "type of right": "type_of_right",
  "land": "country",
  "country": "country",
  "källa": "source",
  "kalla": "source",
  "source": "source",
  "underkälla": "sub_source",
  "underkalla": "sub_source",
  "sub source": "sub_source",
  "produktionstitel": "production_title",
  "production title": "production_title",
  "avsnittstitel": "episode_title",
  "episode title": "episode_title",
  "avtalsnyckel": "agreement_key",
  "agreement key": "agreement_key",
  "antal användningar": "number_of_uses",
  "antal anvandningar": "number_of_uses",
  "number of uses": "number_of_uses",
  "från datum": "from_date",
  "fran datum": "from_date",
  "from date": "from_date",
  "till datum": "to_date",
  "to date": "to_date",
  "kompositörer": "composers",
  "kompositorer": "composers",
  "composers": "composers",
};

// STIM: comma = decimal, period = thousands separator. After the comma are ören.
const parseSwedishNumber = (raw: string | undefined | null): number => {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  // Remove spaces and thousands periods, swap decimal comma to dot.
  const cleaned = s.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const parseDate = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
};

const normalizeHeader = (h: string) =>
  h.replace(/^\ufeff/, "").toLowerCase().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

interface ParsedRow {
  work_title: string;
  work_key: string | null;
  amount: number;
  distribution: string | null;
  distribution_key: string | null;
  publisher: "MSCE" | "MSCP";
  recipient_name: string | null;
  member_number: string | null;
  ipi_name_number: string | null;
  role: string | null;
  share: number | null;
  type_of_right: string | null;
  country: string | null;
  source: string | null;
  sub_source: string | null;
  production_title: string | null;
  episode_title: string | null;
  agreement_key: string | null;
  number_of_uses: number | null;
  from_date: string | null;
  to_date: string | null;
  composers: string | null;
}

const BATCH_SIZE = 500;

// --- Warner/Chappell (WCM) statement support -------------------------------
// WCM-exporter är kommaseparerade med engelska kolumnnamn och punkt som decimaltecken.
const isWcmHeaderSet = (fields: string[]) =>
  fields.includes("tango_work_title") || fields.includes("tango_work_code");

const parseDotNumber = (raw: string | undefined | null): number => {
  if (raw == null) return 0;
  const s = String(raw).trim().replace(/[@\s]/g, "");
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

// "202504" -> 2025-04-01 (start) eller sista dagen i månaden (slut)
const parseYearMonth = (raw: string | undefined | null, end = false): string | null => {
  const s = String(raw ?? "").trim();
  const m = s.match(/^(\d{4})(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const day = end ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 1;
  return `${m[1]}-${m[2]}-${String(day).padStart(2, "0")}`;
};

// Statementperiod från filnamn: Statement_2026-01-01_2026-06-30.csv -> 2026 / H1
const periodFromFileName = (fileName: string): { year: string; half: "H1" | "H2" } | null => {
  const m = fileName.match(/(\d{4})-(\d{2})-\d{2}/);
  if (!m) return null;
  return { year: m[1], half: Number(m[2]) <= 6 ? "H1" : "H2" };
};

const periodFromRoyaltyPeriod = (raw: string | undefined): { year: string; half: "H1" | "H2" } | null => {
  const m = String(raw ?? "").match(/^(\d{4})(\d{2})/);
  if (!m) return null;
  return { year: m[1], half: Number(m[2]) <= 6 ? "H1" : "H2" };
};

const parseWcmRows = (
  data: Record<string, string>[],
  fileName: string
): ParsedRow[] => {
  const first = data[0] ?? {};
  const period =
    periodFromFileName(fileName) ?? periodFromRoyaltyPeriod(first["royalty_period"]);
  const distribution_key = period ? `WC-${period.year}${period.half}` : "WC-okänd";
  const distribution = period
    ? `Warner/Chappell ${period.half} ${period.year}`
    : "Warner/Chappell";

  const rows: ParsedRow[] = [];
  for (const raw of data) {
    const val = (k: string) => {
      const v = raw[k];
      return v != null && String(v).trim() !== "" ? String(v).trim() : null;
    };
    const work_title = val("tango_work_title") ?? val("source_work_id") ?? "";
    if (!work_title) continue;

    const units = val("units");
    const rate = val("rate_percentage");

    rows.push({
      work_title,
      work_key: val("tango_work_code"),
      amount: parseDotNumber(val("amount_paid")),
      distribution,
      distribution_key,
      publisher: "MSCE",
      recipient_name: val("deal_scope_name"),
      member_number: null,
      ipi_name_number: null,
      role: null,
      share: rate ? parseDotNumber(rate) : null,
      type_of_right: val("tango_income_type_name") ?? val("source_income_type"),
      country: val("exploitation_territory_name") ?? val("processing_territory_name"),
      source: val("income_provider_name"),
      sub_source: val("exploitation_source"),
      production_title: val("product_description"),
      episode_title: null,
      agreement_key: val("deal_contract_brief_number"),
      number_of_uses: units ? Math.trunc(parseDotNumber(units)) : null,
      from_date: parseYearMonth(val("distribution_start")),
      to_date: parseYearMonth(val("distribution_end"), true),
      composers: val("creator_names") ?? val("composer"),
    });
  }
  return rows;
};

const detectStimPublisher = (data: Record<string, string>[]): "MSCE" | "MSCP" => {
  const recipients = data
    .map((row) => String(row.name ?? "").trim().toLowerCase())
    .filter(Boolean);

  return recipients.some((name) => name.includes("music super circus publishing")) ? "MSCP" : "MSCE";
};

export const SettlementsUpload = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const queryClient = useQueryClient();

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(`Läser ${file.name}…`);

    try {
      const text = await file.text();
      // Detect delimiter — STIM uses ; but Warner/Chappell (WCM) uses ,
      const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
      const delimiter = firstLine.includes(";") ? ";" : ",";

      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        delimiter,
        skipEmptyLines: true,
        transformHeader: (h) => normalizeHeader(h),
      });

      if (result.errors.length > 0) {
        console.warn("CSV parse warnings", result.errors.slice(0, 5));
      }

      const headers = result.meta.fields ?? [];
      const isWcm = isWcmHeaderSet(headers);

      const rows: ParsedRow[] = isWcm ? parseWcmRows(result.data, file.name) : [];
      if (!isWcm) for (const raw of result.data) {

        const get = (col: string): string | undefined => {
          for (const [header, mapped] of Object.entries(HEADER_MAP)) {
            if (mapped === col) {
              const v = raw[header];
              if (v != null && String(v).trim() !== "") return v;
            }
          }
          return undefined;
        };

        const work_title = (get("work_title") ?? "").trim();
        if (!work_title) continue;

        const numUses = get("number_of_uses");
        const shareRaw = get("share");

        rows.push({
          work_title,
          work_key: get("work_key") ?? null,
          amount: parseSwedishNumber(get("amount")),
          distribution: get("distribution") ?? null,
          distribution_key: get("distribution_key") ?? null,
          publisher: detectStimPublisher(result.data),
          recipient_name: get("recipient_name") ?? null,
          member_number: get("member_number") ?? null,
          ipi_name_number: get("ipi_name_number") ?? null,
          role: get("role") ?? null,
          share: shareRaw ? parseSwedishNumber(shareRaw) : null,
          type_of_right: get("type_of_right") ?? null,
          country: get("country") ?? null,
          source: get("source") ?? null,
          sub_source: get("sub_source") ?? null,
          production_title: get("production_title") ?? null,
          episode_title: get("episode_title") ?? null,
          agreement_key: get("agreement_key") ?? null,
          number_of_uses: numUses ? Math.trunc(parseSwedishNumber(numUses)) : null,
          from_date: parseDate(get("from_date")),
          to_date: parseDate(get("to_date")),
          composers: get("composers") ?? null,
        });
      }

      if (rows.length === 0) {
        const isPayoutSummary = headers.some((h) =>
          ["utbetalningsdatum", "relationstyp", "belopp stim"].includes(h.replace(/^\ufeff/, ""))
        );
        toast.error(
          isPayoutSummary
            ? "Det här är STIM:s utbetalningsspecifikation (summering per relationstyp) — den innehåller inga verkrader. Ladda upp verkspecifikationen (kolumner som Work title / Verkets titel)."
            : "Inga rader att importera — kontrollera kolumnrubrikerna."
        );
        return;
      }

      // Duplicate check: warn if a distribution key for the same publisher already exists.
      const keys = Array.from(
        new Set(rows.map((r) => r.distribution_key).filter((k): k is string => !!k))
      );
      const publisher = rows[0]?.publisher ?? "MSCE";
      if (keys.length > 0) {
        const { data: existing } = await supabase
          .from("settlements")
          .select("distribution_key")
          .in("distribution_key", keys)
          .eq("publisher", publisher)
          .limit(1);
        if (existing && existing.length > 0) {
          const dupKey = existing[0].distribution_key;
          const ok = window.confirm(
            `Avräkningsnyckel "${dupKey}" finns redan för ${publisher}. ` +
              `Vill du ändå ladda upp filen? (Detta kan skapa dubbletter.)`
          );
          if (!ok) {
            toast.info("Uppladdning avbruten.");
            return;
          }
        }
      }

      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        setProgress(`Laddar upp ${inserted + batch.length} / ${rows.length}…`);
        const { error } = await supabase.from("settlements").insert(batch);
        if (error) {
          throw new Error(error.message);
        }
        inserted += batch.length;
      }

      const total = rows.reduce((sum, r) => sum + r.amount, 0);
      toast.success(
        `Importerade ${inserted} rader för ${publisher} (${total.toLocaleString("sv-SE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} kr)`
      );

      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["settlement-stats"] });
      queryClient.invalidateQueries({ queryKey: ["unmatched-settlement-works"] });
      queryClient.invalidateQueries({ queryKey: ["work-settlements"] });
    } catch (err) {
      console.error(err);
      toast.error("Uppladdning misslyckades: " + (err as Error).message);
    } finally {
      setUploading(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium">Ladda upp avräkning</div>
            <div className="text-xs text-muted-foreground truncate">
              {uploading
                ? progress
                : "STIM (semikolon, svenska decimaler) eller Warner/Chappell-statement (komma, engelska rubriker)"}

            </div>
          </div>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Laddar upp…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Välj CSV-fil
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
