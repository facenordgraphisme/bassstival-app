// apps/web/src/app/surveys/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { FadeUp } from "@/components/FX";
import SurveysClient from "./surveys-client";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function SurveysPage() {
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  if (!roles.includes("polls")) {
    redirect("/403");
  }

  const can = roles.includes("polls") || roles.includes("admin");
    if (!can) redirect("/403");

  return (
    <FadeUp className="space-y-6">
      <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
      <h1
        className="text-3xl font-extrabold title-underline"
        style={{ fontFamily: "var(--font-title)" }}
      >
        Sondages
      </h1>
      <SurveysClient />
    </FadeUp>
  );
}
