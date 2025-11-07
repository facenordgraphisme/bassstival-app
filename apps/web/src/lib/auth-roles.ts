export const ROLES = [
  "admin", "staff", "tools", "volunteers", "lineup", "polls", "communication"
] as const;

export type Role = typeof ROLES[number];

export const SECTION_PERMS: Record<
  "root" | "tools" | "volunteers" | "lineup" | "admin" | "communication",
  Role[]
> = {
  root: ["admin", "staff", "tools", "volunteers", "lineup", "communication"],
  tools: ["admin", "staff", "tools"],
  volunteers: ["admin", "staff", "volunteers"],
  lineup: ["admin", "staff", "lineup"],
  admin: ["admin"],
  communication: ["admin", "staff", "communication"],
};

export function hasAnyRole(
  userRoles: string[] | undefined | null,
  allowed: Role[]
) {
  if (!userRoles || userRoles.length === 0) return false;
  const set = new Set(userRoles);
  return allowed.some((r) => set.has(r));
}
