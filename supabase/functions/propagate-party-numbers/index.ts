import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Sprider IPI-nummer (från klientkort och STIM-kvitton) och avtalsnummer (från STIM-kvitton)
// till samtliga verk där parten förekommer. Konflikter flaggas, aldrig skrivs något över tyst.

const STOP = new Set(["ab", "the", "and", "of", "music", "publishing", "förlag", "forlag", "ltd", "inc"]);

const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

const ALIASES: Record<string, string[]> = {
  msce: ["super", "circus", "extravaganza"],
  mscp: ["super", "circus", "publishing"],
};

const nameMatches = (catalog: string, stim: string) => {
  const s = new Set(tokens(stim));
  let c = tokens(catalog);
  const alias = ALIASES[catalog.trim().toLowerCase()];
  if (alias) c = alias;
  const sig = c.filter((t) => !STOP.has(t) || alias);
  if (!sig.length) return false;
  return sig.every((t) => s.has(t));
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

type Party = { name: string; role: string };

// "Namn (CA, 33.34%, row:25%, repr), Namn2 (E, 16.67%, ...)" -> [{name, role}]
const parseParties = (creators: string): Party[] => {
  const parts = creators.split(/\),\s*/).map((p, i, arr) => (i < arr.length - 1 ? p + ")" : p));
  return parts
    .map((part) => {
      const m = part.trim().match(/^(.+?)\s*\((\w+)(?:,.*?)?\)$/s);
      return m ? { name: m[1].trim(), role: m[2] } : null;
    })
    .filter(Boolean) as Party[];
};

type RegParty = { role: string; name: string; ipi: string | null; agreement?: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const fetchAll = async (table: string, cols: string) => {
      const out: Record<string, unknown>[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from(table).select(cols).range(from, from + 999);
        if (error) throw error;
        out.push(...data);
        if (data.length < 1000) break;
      }
      return out;
    };

    const [works, clients, regs] = await Promise.all([
      fetchAll("works", "id, title, creators"),
      fetchAll("clients", "id, first_name, last_name, organization, ipi_number"),
      fetchAll("work_registrations", "id, creators, publishers"),
    ]);

    // Klientkort: normaliserat namn -> IPI
    const clientIpi = new Map<string, string>();
    clients.forEach((c) => {
      const ipi = c.ipi_number as string | null;
      if (!ipi) return;
      const full = norm(`${c.first_name ?? ""} ${c.last_name ?? ""}`);
      if (full) clientIpi.set(full, ipi);
      const org = c.organization ? norm(c.organization as string) : null;
      if (org) clientIpi.set(org, ipi);
    });

    // STIM-kvitton: samlade IPI/avtalsnummer per kvittopart
    const regParties: RegParty[] = [];
    regs.forEach((r) => {
      ((r.creators as RegParty[]) ?? []).forEach((p) => regParties.push(p));
      ((r.publishers as RegParty[]) ?? []).forEach((p) => regParties.push(p));
    });
    // Indexera på första token för att slippa jämföra alla mot alla
    const regByFirstToken = new Map<string, RegParty[]>();
    regParties.forEach((p) => {
      const t = tokens(p.name);
      const keys = new Set([t[0], ...t.filter((x) => x.length > 3)]);
      keys.forEach((k) => {
        if (!k) return;
        const arr = regByFirstToken.get(k) ?? [];
        arr.push(p);
        regByFirstToken.set(k, arr);
      });
    });

    const regInfoFor = (partyName: string, publisher: boolean) => {
      const ipis = new Set<string>();
      const agreements = new Set<string>();
      const t = tokens(partyName);
      const candidates = new Set<RegParty>();
      [t[0], ...t.filter((x) => x.length > 3)].forEach((k) => {
        (regByFirstToken.get(k ?? "") ?? []).forEach((p) => candidates.add(p));
      });
      candidates.forEach((p) => {
        if (!nameMatches(partyName, p.name) && !nameMatches(p.name, partyName)) return;
        if (p.ipi) ipis.add(p.ipi);
        if (publisher && p.agreement) agreements.add(p.agreement);
      });
      return { ipis, agreements };
    };

    const rows: Record<string, unknown>[] = [];
    let conflictCount = 0;

    works.forEach((w) => {
      const parties = parseParties((w.creators as string) ?? "");
      const seen = new Set<string>();
      parties.forEach((p) => {
        const key = norm(p.name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        const isPublisher = p.role.toUpperCase() === "E";

        const cIpi = clientIpi.get(key) ?? null;
        const reg = regInfoFor(p.name, isPublisher);
        const regIpi = reg.ipis.size === 1 ? [...reg.ipis][0] : null;
        const regAgr = reg.agreements.size === 1 ? [...reg.agreements][0] : null;

        let ipi: string | null = cIpi ?? regIpi;
        let conflict = false;
        const notes: string[] = [];

        if (cIpi && regIpi && cIpi !== regIpi) {
          conflict = true;
          notes.push(`IPI enligt klientkort: ${cIpi}, enligt STIM-kvitto: ${regIpi}`);
        }
        if (reg.ipis.size > 1) {
          conflict = true;
          notes.push(`Olika IPI i STIM-kvitton: ${[...reg.ipis].join(", ")}`);
        }
        if (isPublisher && reg.agreements.size > 1) {
          conflict = true;
          notes.push(`Olika avtalsnummer i STIM-kvitton: ${[...reg.agreements].join(", ")}`);
        }
        if (conflict) conflictCount++;

        const source = cIpi && regIpi ? "both" : cIpi ? "client" : regIpi || regAgr ? "receipt" : "none";
        if (!ipi && !regAgr && !conflict) return; // inget att lagra

        rows.push({
          work_id: w.id,
          party_name: p.name,
          is_publisher: isPublisher,
          ipi_number: ipi,
          agreement_number: isPublisher ? regAgr : null,
          source,
          conflict,
          conflict_note: notes.length ? notes.join(". ") : null,
        });
      });
    });

    // Full omgång: radera och skriv om (billigt, undviker föräldralösa rader)
    const { error: delErr } = await supabase.from("work_party_numbers").delete().not("id", "is", null);
    if (delErr) throw delErr;
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("work_party_numbers").insert(rows.slice(i, i + 500));
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ ok: true, works: works.length, parties: rows.length, conflicts: conflictCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
