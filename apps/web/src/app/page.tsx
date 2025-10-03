import { listLoans } from "@/lib/api";
import { FadeUp } from "@/components/FX";
import HomeClient from "./HomeClient";

export default async function Page() {
  const open = await listLoans("open"); // préfetch
  const all  = await listLoans();       // préfetch (toutes)
  return (
    <FadeUp className="space-y-6">
      <HomeClient initialOpen={open} initialAll={all} />
    </FadeUp>
  );
}