import Papa from "papaparse";

export type ParsedLine = {
  isrc: string | null;
  upc: string | null;
  catalog_number: string | null;
  title: string | null;
  release_title: string | null;
  artist: string | null;
  store: string | null;
  country: string | null;
  sale_type: string | null;
  sale_month: string | null;
  quantity: number;
  amount: number;
};

export type ParsedStatement = {
  source: string;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  lines: ParsedLine[];
  rawRows: number;
};

const s = (v: unknown) => {
  const t = String(v ?? "").trim();
  return t ? t : null;
};
// Leverantörsfilerna använder punkt som decimaltecken (USD)
const n = (v: unknown) => {
  const x = parseFloat(String(v ?? "").replace(/\s/g, ""));
  return isNaN(x) ? 0 : x;
};
const normIsrc = (v: unknown) => s(v)?.replace(/[\s-]/g, "").toUpperCase() ?? null;

const bandcampMonth = (d: string | null) => {
  const m = d?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[1].padStart(2, "0")}`;
};

const parseText = (text: string, delimiter?: string) =>
  Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, delimiter }).data;

export const parseRecordingStatement = async (file: File): Promise<ParsedStatement> => {
  const text = (await file.text()).replace(/^\uFEFF/, "");
  const firstLine = text.slice(0, text.indexOf("\n"));
  let source = "";
  let rows: Record<string, string>[] = [];
  let mapped: ParsedLine[] = [];

  if (firstLine.includes("Earnings (USD)") && firstLine.includes("Sale Month")) {
    source = "DistroKid";
    rows = parseText(text);
    mapped = rows.map((r) => ({
      isrc: normIsrc(r["ISRC"]), upc: s(r["UPC"]), catalog_number: null,
      title: s(r["Title"]), release_title: null, artist: s(r["Artist"]),
      store: s(r["Store"]), country: s(r["Country of Sale"]), sale_type: s(r["Source Type"]),
      sale_month: s(r["Sale Month"]), quantity: Math.round(n(r["Quantity"])), amount: n(r["Earnings (USD)"]),
    }));
  } else if (firstLine.includes("Total Earned") && firstLine.includes("Sales Period")) {
    source = "TuneCore";
    rows = parseText(text);
    mapped = rows.map((r) => ({
      isrc: normIsrc(r["Optional ISRC"]), upc: s(r["UPC"]), catalog_number: null,
      title: s(r["Song Title"]) ?? s(r["Release Title"]), release_title: s(r["Release Title"]), artist: s(r["Artist"]),
      store: s(r["Store Name"]), country: s(r["Country Of Sale"]), sale_type: s(r["Sales Type"]),
      sale_month: s(r["Sales Period"])?.slice(0, 7) ?? null, quantity: Math.round(n(r["# Units Sold"])), amount: n(r["Total Earned"]),
    }));
  } else if (firstLine.includes("bandcamp transaction id")) {
    source = "Bandcamp";
    rows = parseText(text, ";");
    mapped = rows
      .filter((r) => ["album", "track"].includes((r["item type"] ?? "").toLowerCase()))
      .map((r) => {
        const isTrack = r["item type"].toLowerCase() === "track";
        return {
          isrc: normIsrc(r["isrc"]), upc: s(r["upc"]), catalog_number: s(r["catalog number"]),
          title: isTrack ? s(r["item name"]) : null, release_title: isTrack ? null : s(r["item name"]), artist: s(r["artist"]),
          store: "Bandcamp", country: s(r["buyer country code"]), sale_type: isTrack ? "Track download" : "Album download",
          sale_month: bandcampMonth(s(r["Sale date"]) ?? s(r["date"])), quantity: Math.round(n(r["quantity"])), amount: n(r["net amount"]),
        };
      });
  } else {
    throw new Error("Okänt filformat. Just nu stöds DistroKid, TuneCore och Bandcamp.");
  }

  // Slå ihop identiska rader (samma låt, butik, land och månad) för att hålla databasen liten
  const agg = new Map<string, ParsedLine>();
  for (const l of mapped) {
    const k = [l.isrc, l.upc, l.catalog_number, l.title, l.release_title, l.artist, l.store, l.country, l.sale_type, l.sale_month].join("|");
    const cur = agg.get(k);
    if (cur) { cur.quantity += l.quantity; cur.amount += l.amount; }
    else agg.set(k, { ...l });
  }
  const months = mapped.map((l) => l.sale_month).filter(Boolean).sort() as string[];
  return {
    source, currency: "USD", rawRows: rows.length,
    periodStart: months[0] ?? null, periodEnd: months[months.length - 1] ?? null,
    lines: [...agg.values()],
  };
};
