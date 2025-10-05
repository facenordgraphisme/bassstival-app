export const TEAM_KEYS = [
  "bar",
  "billetterie",
  "parking",
  "bassspatrouille",
  "tech",
  "autre",
] as const;

export type Team = typeof TEAM_KEYS[number];

export const TEAM_LABEL: Record<Team, string> = {
  bar: "Bar",
  billetterie: "Billetterie",
  parking: "Parking",
  bassspatrouille: "Bassspatrouille",
  tech: "Tech",
  autre: "Autre",
};
