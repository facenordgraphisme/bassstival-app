import { FadeUp } from "@/components/FX";
import { listShifts } from "@/lib/api";
import ShiftsClient from "./ShiftsClient";
import type { Shift } from "@/lib/volunteers";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  let initial: Shift[] = [];
  try {
    initial = await listShifts();
  } catch {
    initial = [];
  }

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
