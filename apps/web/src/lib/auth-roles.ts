export const ROLES = [
  "admin",       // accès total + gestion utilisateurs/roles
  "staff",       // accès total hors admin mgmt si tu veux
  "tools",       // Outils (prêts)
  "volunteers",  // Bénévoles
  "lineup",      // Artistes / bookings
  "polls",
] as const;

export type Role = typeof ROLES[number];

export const SECTION_PERMS: Record<
  "root" | "tools" | "volunteers" | "lineup" | "admin",
  Role[]
> = {
  root: ["admin", "staff", "tools", "volunteers", "lineup"],
  tools: ["admin", "staff", "tools"],
  volunteers: ["admin", "staff", "volunteers"],
  lineup: ["admin", "staff", "lineup"],
  admin: ["admin"],
};

export function hasAnyRole(
  userRoles: string[] | undefined | null,
  allowed: Role[]
) {
  if (!userRoles || userRoles.length === 0) return false;
  const set = new Set(userRoles);
  return allowed.some((r) => set.has(r));
}
