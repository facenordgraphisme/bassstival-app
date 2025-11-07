// apps/web/src/auth.config.ts
import type { NextAuthConfig } from "next-auth";
import { hasAnyRole, SECTION_PERMS } from "@/lib/auth-roles";

const authConfig = {
  pages: { signIn: "/login" },

  callbacks: {
  authorized({ auth, request }) {
    const { pathname } = request.nextUrl;
    const roles = (auth?.user as any)?.roles ?? [];

    if (pathname.startsWith("/api/auth")) return true;
    if (pathname.startsWith("/api/proxy")) return true;
    if (pathname === "/login") return true;

    if (!auth?.user) return false;

    if (pathname === "/")                   return hasAnyRole(roles, SECTION_PERMS.root);
    if (pathname.startsWith("/tools"))      return hasAnyRole(roles, SECTION_PERMS.tools);
    if (pathname.startsWith("/volunteers")) return hasAnyRole(roles, SECTION_PERMS.volunteers);
    if (pathname.startsWith("/lineup"))     return hasAnyRole(roles, SECTION_PERMS.lineup);
    if (pathname.startsWith("/admin"))      return hasAnyRole(roles, SECTION_PERMS.admin);
    if (pathname.startsWith("/communication")) return hasAnyRole(roles, SECTION_PERMS.communication); // <— AJOUT

    return true;
  },
},
} satisfies Partial<NextAuthConfig>; // <- ✅ PARTIAL

export default authConfig;
