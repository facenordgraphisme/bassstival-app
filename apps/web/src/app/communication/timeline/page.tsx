import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { FadeUp } from "@/components/FX";
import BackButton from "@/components/BackButton";
import TimelineClient from "./timeline-client";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const session = await auth();
  const roles = session?.user?.roles ?? [];
  const can =
    roles.includes("communication") || roles.includes("admin") || roles.includes("staff");
  if (!can) redirect("/403");

  return (
    <FadeUp className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
        <h1
          className="text-2xl md:text-3xl font-extrabold title-underline"
          style={{ fontFamily: "var(--font-title)" }}
        >
          Timeline — Communication
        </h1>
      </div>
      <TimelineClient />
    </FadeUp>
  );
}