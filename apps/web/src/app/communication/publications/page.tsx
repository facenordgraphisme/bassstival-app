// apps/web/src/app/communication/publications/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { FadeUp } from "@/components/FX";
import BackButton from "@/components/BackButton";
import PublicationsClient from "./publications-client";

export const dynamic = "force-dynamic";

export default async function PublicationsPage() {
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  const can =
    roles.includes("communication") || roles.includes("admin") || roles.includes("staff");
  if (!can) redirect("/403");

  return (
    <FadeUp className="space-y-6">
      <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
      <h1
        className="text-2xl md:text-3xl font-extrabold title-underline"
        style={{ fontFamily: "var(--font-title)" }}
      >
        Publications — Communication
      </h1>
      <PublicationsClient />
    </FadeUp>
  );
}
