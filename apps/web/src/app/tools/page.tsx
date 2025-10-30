import { FadeUp } from "@/components/FX";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return (
    <FadeUp className="space-y-6">
      <HomeClient initialOpen={[]} initialAll={[]} />
    </FadeUp>
  );
}