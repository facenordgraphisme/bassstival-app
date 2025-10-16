import { FadeUp } from "@/components/FX";
import PlanningClient from "./planning-client";
import Link from "next/link";
import BackButton from "@/components/BackButton";

  function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}

export default function Page() {
  return (
    <FadeUp className="space-y-6">
      <div className="flex items-center gap-3">
      <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
        <h1
          className="text-3xl font-extrabold title-underline"
          style={{ fontFamily: "var(--font-title)" }}
        >
          Planning des bookings
        </h1>
        <Link className="btn-ghost" href={`/bookings/print?date=${todayISODate()}`}>Imprimer</Link>
      </div>
      <PlanningClient />
    </FadeUp>
  );
}
