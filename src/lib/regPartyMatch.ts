import type { RegParty, WorkRegistration } from "@/hooks/useWorkRegistrations";

const STOP = new Set(["ab", "the", "and", "of", "music", "publishing", "förlag", "forlag", "ltd", "inc"]);

const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

const ALIASES: Record<string, string[]> = {
  msce: ["super", "circus", "extravaganza"],
  mscp: ["super", "circus", "publishing"],
};

export const normalizeCreatorName = (name: string) => {
  const normalized = tokens(name).join(" ");
  if (["adam norden", "adam isaac erik norden"].includes(normalized)) return "adam norden";
  if (["karzan mahmood", "karzan mahmood faqe hussein"].includes(normalized)) return "karzan mahmood";
  return normalized;
};

/** Full surname plus ordered given names; extra middle names may be omitted. */
export const creatorNamesMatch = (left: string, right: string) => {
  const a = normalizeCreatorName(left).split(" ");
  const b = normalizeCreatorName(right).split(" ");
  if (a.length < 2 || b.length < 2) return false;
  if (a.join(" ") === b.join(" ")) return true;
  if (a[a.length - 1] !== b[b.length - 1]) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let position = 0;
  for (const token of long) {
    if (token === short[position]) position++;
  }
  return position === short.length;
};

/** Recheck creator names against current shares, keeping ambiguous identities and other issues. */
export const resolveCreatorNameWarnings = (registration: WorkRegistration, creators: string) => {
  if (!registration.share_mismatch || !registration.mismatch_note) return registration;
  const parties = [...creators.matchAll(/(?:^|\),\s*)([^()]+)\((?:CA|C|A),\s*(\d+(?:[.,]\d+)?)%/gi)];
  const remaining = registration.mismatch_note.split("; ").filter((note) => {
    const warning = note.match(/^(.+?)(?:: STIM (\d+(?:[.,]\d+)?)% \/ (?:katalog \d+(?:[.,]\d+)?%|andel saknas i katalogen)| (\d+(?:[.,]\d+)?)% finns inte på verket i katalogen)$/i);
    if (!warning) return true;
    const receiptParties = registration.creators ?? [];
    if (receiptParties.length && !receiptParties.some((party) => normalizeCreatorName(party.name) === normalizeCreatorName(warning[1]))) return true;
    const matches = parties.filter((match) => creatorNamesMatch(match[1], warning[1]));
    if (matches.length !== 1) return true;
    // A shortened name must not collapse two different people on the same receipt.
    if (receiptParties.filter((party) => creatorNamesMatch(matches[0][1], party.name)).length > 1) return true;
    const actual = Number(matches[0][2].replace(",", "."));
    return Math.abs(actual - Number((warning[2] ?? warning[3]).replace(",", "."))) > 0.00001;
  });
  return { ...registration, share_mismatch: remaining.length > 0, mismatch_note: remaining.join("; ") || null };
};

/** Exact publisher aliases, never a substring match against unrelated publishers. */
export const normalizePublisherName = (name: string) => {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  return /^(brf|brf music publishing)( ab)?$/.test(normalized)
    ? "brf music publishing"
    : normalized;
};

/** Recheck publisher names case-insensitively, preserving ambiguous matches and actual share differences. */
export const resolvePublisherNameWarnings = (registration: WorkRegistration, creators: string) => {
  if (!registration.share_mismatch || !registration.mismatch_note) return registration;
  const parties = [...creators.matchAll(/(?:^|\),\s*)([^()]+)\(E,\s*(\d+(?:[.,]\d+)?)%/gi)];
  const remaining = registration.mismatch_note.split("; ").filter((note) => {
    const warning = note.match(/^(.+?) (\d+(?:[.,]\d+)?)% finns inte på verket i katalogen$/i);
    if (!warning) return true;
    const name = normalizePublisherName(warning[1]);
    const matches = parties.filter((party) => normalizePublisherName(party[1]) === name);
    if (matches.length !== 1) return true;
    if ((registration.publishers ?? []).filter((party) => normalizePublisherName(party.name) === name).length > 1) return true;
    return Math.abs(Number(matches[0][2].replace(",", ".")) - Number(warning[2].replace(",", "."))) > 0.00001;
  });
  return { ...registration, share_mismatch: remaining.length > 0, mismatch_note: remaining.join("; ") || null };
};

/** Legacy single-warning BRF resolver. */
export const resolveBrfNameWarning = (registration: WorkRegistration, creators: string) => {
  const warning = registration.mismatch_note?.match(/^brf(?: music publishing)? (\d+(?:[.,]\d+)?)% finns inte på verket i katalogen$/i);
  if (!registration.share_mismatch || !warning) return registration;
  const expected = Number(warning[1].replace(",", "."));
  const matches = [...creators.matchAll(/(?:^|\),\s*)([^()]+)\(E,\s*(\d+(?:[.,]\d+)?)%/gi)]
    .filter((match) => normalizePublisherName(match[1]) === "brf music publishing");
  if (matches.length !== 1 || Math.abs(Number(matches[0][2].replace(",", ".")) - expected) > 0.00001) return registration;
  return { ...registration, share_mismatch: false, mismatch_note: null };
};

/** True if every significant token of the catalog name appears in the STIM name. */
const nameMatches = (catalog: string, stim: string) => {
  if (["adam norden", "karzan mahmood"].includes(normalizeCreatorName(catalog)) || ["adam norden", "karzan mahmood"].includes(normalizeCreatorName(stim))) {
    return normalizeCreatorName(catalog) === normalizeCreatorName(stim);
  }
  if (normalizePublisherName(catalog) === "brf music publishing" || normalizePublisherName(stim) === "brf music publishing") {
    return normalizePublisherName(catalog) === normalizePublisherName(stim);
  }
  const s = new Set(tokens(stim));
  let c = tokens(catalog);
  const alias = ALIASES[catalog.trim().toLowerCase()];
  if (alias) c = alias;
  const sig = c.filter((t) => !STOP.has(t) || alias);
  if (!sig.length) return false;
  return sig.every((t) => s.has(t));
};

/** Unique IPI / agreement number for a catalog name across all receipts (null if none or conflicting). */
export const lookupRegInfo = (name: string, regs: WorkRegistration[], publisher: boolean) => {
  const ipis = new Set<string>();
  const agreements = new Set<string>();
  regs.forEach((r) => {
    const parties: RegParty[] = publisher ? r.publishers : r.creators;
    parties.forEach((p) => {
      if (publisher ? !nameMatches(name, p.name) : !creatorNamesMatch(name, p.name)) return;
      if (!publisher && parties.filter((party) => creatorNamesMatch(name, party.name)).length !== 1) return;
      if (p.ipi) ipis.add(p.ipi);
      if (publisher && p.agreement) agreements.add(p.agreement);
    });
  });
  return {
    ipi: ipis.size === 1 ? [...ipis][0] : null,
    agreement: agreements.size === 1 ? [...agreements][0] : null,
  };
};
