import { FadeUp } from "@/components/FX";
import PlanningClient from "./PlanningClient";
import PlanningGridClient from "./PlanningGridClient";

export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  // on laisse tout côté client (filtres), pas de crash SSR si API down
  return (
    <FadeUp className="space-y-6">
      <div className="flex items-center justify-between">
        <h1
          className="text-3xl font-extrabold title-underline"
          style={{ fontFamily: "var(--font-title)" }}
        >
          Planning – Time Grid
        </h1>
      </div>
      <PlanningGridClient />
    </FadeUp>
  );
}
