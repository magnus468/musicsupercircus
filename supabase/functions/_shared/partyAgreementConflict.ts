type PartyContext = { name: string; role: string };

const normalizedName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Both numbers identify MSCP, but their use with NDQ still needs review.
export function hasAgreementConflict(
  partyName: string,
  agreements: Set<string>,
  workParties: PartyContext[],
  receiptPublishers: { name: string }[],
): boolean {
  if (agreements.size <= 1) return false;
  const name = normalizedName(partyName);
  const isMscp = name === "mscp" || /^music super circus publishing(?: ab)?$/.test(name);
  const knownMscpPair = agreements.size === 2 && agreements.has("13995144") && agreements.has("14016020");
  if (!isMscp || !knownMscpPair) return true;

  const isNdq = (name: string) => /^(?:nordic drama queens(?: ab)?|ndq)$/.test(normalizedName(name));
  return workParties.some((party) => party.role.toUpperCase() === "E" && isNdq(party.name))
    || receiptPublishers.some((party) => isNdq(party.name));
}