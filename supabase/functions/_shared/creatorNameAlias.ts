/** Confirmed name change only; leave every other identity untouched. */
export const canonicalCreatorAlias = (name: string): string => {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  return ["johan hugo harrysson", "harry harrysson"].includes(normalized)
    ? "harry harrysson"
    : name;
};