import { listLoans } from "@/lib/api";
import { FadeUp } from "@/components/FX";
import HomeClient from "./HomeClient";

export default async function ToolsPage() {
  const open = await listLoans("open");
  const all = await listLoans();
  return (
    <FadeUp className="space-y-6">
      <HomeClient initialOpen={open} initialAll={all} />
    </FadeUp>
  );
}
