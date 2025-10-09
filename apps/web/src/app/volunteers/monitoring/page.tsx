import { FadeUp } from "@/components/FX";
import MonitoringClient from "./monitoring-client";
import { listMonitoring } from "@/lib/volunteers";
import BackButton from "@/components/BackButton";
import BackButtonNeon from "@/components/BackButtonNeon";
import BackButtonGold from "@/components/BackButtonGold";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  let initial: Awaited<ReturnType<typeof listMonitoring>> = [];
  try {
    initial = await listMonitoring();
  } catch {
    initial = [];
  }

  return (
    <FadeUp className="space-y-6">
      <div className="flex items-center gap-3">
              <BackButtonGold/>
                <h1
                  className="text-3xl font-extrabold title-underline"
                  style={{ fontFamily: "var(--font-title)" }}
                >
              Monitoring bénévoles
              </h1>
            </div>
      <MonitoringClient initial={initial} />
    </FadeUp>
  );
}
