// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { hasAnyRole, SECTION_PERMS } from "@/lib/auth-roles";

type AuthenticatedRequest = NextRequest & { auth?: Session | null };

export default auth((req: AuthenticatedRequest) => {
  const { pathname, search } = req.nextUrl;

  // ✅ Routes publiques
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/proxy") ||
    pathname === "/login" ||
    pathname === "/403"             // <— AJOUT
  ) {
    return NextResponse.next();
  }

  // Fichiers statiques
  if (/\.[\w]+$/.test(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/static")) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  const roles: string[] = session.user.roles ?? [];

  const allow =
    (pathname === "/" && hasAnyRole(roles, SECTION_PERMS.root)) ||
    (pathname.startsWith("/tools") && hasAnyRole(roles, SECTION_PERMS.tools)) ||
    (pathname.startsWith("/volunteers") && hasAnyRole(roles, SECTION_PERMS.volunteers)) ||
    (pathname.startsWith("/lineup") && hasAnyRole(roles, SECTION_PERMS.lineup)) ||
    (pathname.startsWith("/admin") && hasAnyRole(roles, SECTION_PERMS.admin)) ||
    (pathname.startsWith("/communication") && hasAnyRole(roles, SECTION_PERMS.communication)) || // <— AJOUT
    (
      // par défaut, on autorise *seulement* si ce n’est pas une section privée
      !pathname.startsWith("/tools") &&
      !pathname.startsWith("/volunteers") &&
      !pathname.startsWith("/lineup") &&
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/communication") // <— AJOUT pour éviter le contournement
    );

  if (!allow) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/proxy|api/auth|_next|static|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map)).*)",
  ],
};
