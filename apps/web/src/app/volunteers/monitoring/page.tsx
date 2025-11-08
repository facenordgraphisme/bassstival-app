import { FadeUp } from "@/components/FX";
import MonitoringClient from "./monitoring-client";
import { listMonitoring } from "@/lib/volunteers";
import BackButton from "@/components/BackButton";

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
        <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
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
