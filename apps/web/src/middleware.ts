// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { hasAnyRole, SECTION_PERMS } from "@/lib/auth-roles";

export default auth((req: NextRequest & { auth?: any }) => {
  const { pathname } = req.nextUrl;

  // Public
  if (pathname.startsWith("/api/auth") || pathname === "/login") {
    return NextResponse.next();
  }
  // Assets / fichiers avec extension
  if (/\.[\w]+$/.test(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const session = req.auth;

  // Non connecté → login
  if (!session?.user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const roles: string[] = session.user.roles ?? [];

  // Règles d’accès
  const allow =
    (pathname === "/" && hasAnyRole(roles, SECTION_PERMS.root)) ||
    (pathname.startsWith("/tools") && hasAnyRole(roles, SECTION_PERMS.tools)) ||
    (pathname.startsWith("/volunteers") && hasAnyRole(roles, SECTION_PERMS.volunteers)) ||
    (pathname.startsWith("/lineup") && hasAnyRole(roles, SECTION_PERMS.lineup)) ||
    (pathname.startsWith("/admin") && hasAnyRole(roles, SECTION_PERMS.admin)) ||
    // autres routes → OK par défaut
    (!pathname.startsWith("/tools") &&
      !pathname.startsWith("/volunteers") &&
      !pathname.startsWith("/lineup") &&
      !pathname.startsWith("/admin"));

  if (!allow) {
    // Connecté mais pas autorisé → 403
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // protège tout sauf _next/** et fichiers statiques
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/"],
};
