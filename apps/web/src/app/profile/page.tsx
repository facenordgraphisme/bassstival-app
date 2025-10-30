// apps/web/src/app/profile/page.tsx
import { cookies } from "next/headers";
import ProfileClient from "./profile-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  // on peut passer un initial très light si tu veux SSR
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  const ck = cookies().toString();

  const r = await fetch(`${base}/api/proxy/users-api/me`, {
    cache: "no-store",
    headers: { cookie: ck },
  });

  // si non connecté => NextAuth redirigera déjà ailleurs, sinon 401 ici
  const initial = r.ok ? await r.json() : null;

  return <ProfileClient initial={null} />;
}
