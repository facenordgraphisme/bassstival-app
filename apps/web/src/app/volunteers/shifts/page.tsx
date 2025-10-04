import { FadeUp } from "@/components/FX";
import { listShifts } from "@/lib/api";
import ShiftsClient from "./ShiftsClient";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  // Préfetch sans filtres (tu pourras ajouter searchParams et passer team/from/to)
  const initial = await listShifts();

  return (
    <FadeUp className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold title-underline" style={{ fontFamily: "var(--font-title)" }}>
          Shifts bénévoles
        </h1>
      </div>

      <ShiftsClient initial={initial} />
    </FadeUp>
  );
}
