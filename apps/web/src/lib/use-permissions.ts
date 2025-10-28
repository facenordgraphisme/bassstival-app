"use client";
import { useSession } from "next-auth/react";
import { hasAnyRole, SECTION_PERMS } from "@/lib/auth-roles";

export function useRoles() {
  const { data, status } = useSession();
  const roles = data?.user?.roles ?? [];
  return { roles, status };
}

export function canAccess(roles: string[] | undefined, section: keyof typeof SECTION_PERMS) {
  return hasAnyRole(roles ?? [], SECTION_PERMS[section]);
}
