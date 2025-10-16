import { listLoans } from "@/lib/api";
import { FadeUp } from "@/components/FX";
import HomeClient from "./HomeClient";
import type { Loan } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  let open: Loan[] = [];
  let all: Loan[] = [];
  let errorMsg = "";

  // Prefetch, but do not crash the page if API returns an error
  try {
    open = await listLoans("open");
  } catch (e) {
    errorMsg = "Impossible de charger les fiches ouvertes.";
    console.error("[tools] listLoans('open') failed:", e);
  }

  try {
    all = await listLoans();
  } catch (e) {
    errorMsg = errorMsg || "Impossible de charger la liste complète des fiches.";
    console.error("[tools] listLoans() failed:", e);
  }

  return (
    <FadeUp className="space-y-6">
      {errorMsg && (
        <div className="card neon">
          <div className="text-sm">
            {errorMsg} Vérifie la variable <code>NEXT_PUBLIC_API_URL</code> et que l’API
            expose bien <code>/loans</code>. La page reste utilisable : les données
            se rechargeront côté client si l’API répond.
          </div>
        </div>
      )}
      <HomeClient initialOpen={open} initialAll={all} />
    </FadeUp>
  );
}
