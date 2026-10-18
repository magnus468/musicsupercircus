import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireCaller } from "../_shared/requireCaller.ts";

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

const nameMatches = (catalog: string, stimTokens: Set<string>) => {
  let c = tokens(catalog);
  const alias = ALIASES[catalog.trim().toLowerCase()];
  if (alias) c = alias;
  const sig = c.filter((t) => !STOP.has(t) || alias);
  if (!sig.length) return false;
  return sig.every((t) => stimTokens.has(t));
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
type RegEntry = { name: string; tokenSet: Set<string>; ipis: Set<string>; agreements: Set<string> };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await requireCaller(req, corsHeaders);
  if (denied) return denied;
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

    // STIM-kvitton: unika partnamn med samlade IPI/avtalsnummer
    const regByName = new Map<string, RegEntry>();
    const addReg = (p: RegParty) => {
      const key = norm(p.name);
      if (!key) return;
      let e = regByName.get(key);
      if (!e) {
        e = { name: p.name, tokenSet: new Set(tokens(p.name)), ipis: new Set(), agreements: new Set() };
        regByName.set(key, e);
      }
      if (p.ipi) e.ipis.add(p.ipi);
      if (p.agreement) e.agreements.add(p.agreement);
    };
    regs.forEach((r) => {
      ((r.creators as RegParty[]) ?? []).forEach(addReg);
      ((r.publishers as RegParty[]) ?? []).forEach(addReg);
    });

    // Indexera unika kvittonamn på första token + längre token
    const regIndex = new Map<string, RegEntry[]>();
    regByName.forEach((e) => {
      const keys = new Set<string>();
      const t = [...e.tokenSet];
      if (t[0]) keys.add(t[0]);
      t.forEach((x) => { if (x.length > 3) keys.add(x); });
      keys.forEach((k) => {
        const arr = regIndex.get(k) ?? [];
        arr.push(e);
        regIndex.set(k, arr);
      });
    });

    // Cache per partnamn — samma person/förlag återkommer på hundratals verk
    const regInfoCache = new Map<string, { ipis: Set<string>; agreements: Set<string> }>();
    const regInfoFor = (partyName: string) => {
      const cacheKey = norm(partyName);
      const cached = regInfoCache.get(cacheKey);
      if (cached) return cached;

      const result = { ipis: new Set<string>(), agreements: new Set<string>() };
      const exact = regByName.get(cacheKey);
      if (exact) {
        exact.ipis.forEach((i) => result.ipis.add(i));
        exact.agreements.forEach((a) => result.agreements.add(a));
      } else {
        const t = tokens(partyName);
        const candidates = new Set<RegEntry>();
        const idxKeys = new Set<string>();
        if (t[0]) idxKeys.add(t[0]);
        t.forEach((x) => { if (x.length > 3) idxKeys.add(x); });
        idxKeys.forEach((k) => (regIndex.get(k) ?? []).forEach((e) => candidates.add(e)));
        candidates.forEach((e) => {
          if (!nameMatches(partyName, e.tokenSet) && !nameMatches(e.name, new Set(tokens(partyName)))) return;
          e.ipis.forEach((i) => result.ipis.add(i));
          e.agreements.forEach((a) => result.agreements.add(a));
        });
      }
      regInfoCache.set(cacheKey, result);
      return result;
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
        const reg = regInfoFor(p.name);
        const regIpi = reg.ipis.size === 1 ? [...reg.ipis][0] : null;
        const regAgr = reg.agreements.size === 1 ? [...reg.agreements][0] : null;

        const ipi: string | null = cIpi ?? regIpi;
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
