// apps/web/src/auth.config.ts
import type { NextAuthConfig } from "next-auth";
import { hasAnyRole, SECTION_PERMS } from "@/lib/auth-roles";

const authConfig = {
  pages: { signIn: "/login" },

  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Routes publiques
      if (pathname.startsWith("/api/auth")) return true;
      if (pathname.startsWith("/api/proxy")) return true;
      if (pathname === "/login") return true;

      // Pas connecté → refuse
      if (!auth?.user) return false;

      // Contrôle par rôles
      const roles = (auth.user as any).roles ?? [];

      if (pathname === "/")                    return hasAnyRole(roles, SECTION_PERMS.root);
      if (pathname.startsWith("/tools"))       return hasAnyRole(roles, SECTION_PERMS.tools);
      if (pathname.startsWith("/volunteers"))  return hasAnyRole(roles, SECTION_PERMS.volunteers);
      if (pathname.startsWith("/lineup"))      return hasAnyRole(roles, SECTION_PERMS.lineup);
      if (pathname.startsWith("/admin"))       return hasAnyRole(roles, SECTION_PERMS.admin);

      // Par défaut
      return true;
    },
  },
} satisfies Partial<NextAuthConfig>; // <- ✅ PARTIAL

export default authConfig;
