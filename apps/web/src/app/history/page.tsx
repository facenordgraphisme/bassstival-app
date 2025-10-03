import { listLoans, getLoan } from "@/lib/api";
import { FadeUp } from "@/components/FX";
import HistoryClient from "./HistoryClient";
import type { Loan, LoanDetail } from "@/lib/types";

export default async function History() {
  // 1) Fiches ouvertes
  const open: Loan[] = await listLoans("open");

  // 2) Fiches closes
  const closed: Loan[] = await listLoans("closed");

  // 3) Pour chaque fiche close, on récupère le détail pour savoir s'il reste des items en prêt
  const closedWithRemaining = await Promise.all(
    closed.map(async (l: Loan) => {
      const d = (await getLoan(l.id)) as LoanDetail;
      const remaining = (d.items || []).filter((it) => it.status !== "returned").length;
      return { ...l, remaining };
    })
  );

  // Optionnel: trier fermées avec manquants d'abord
  closedWithRemaining.sort((a, b) => (b.remaining > 0 ? 1 : 0) - (a.remaining > 0 ? 1 : 0));

  return (
    <FadeUp className="space-y-10">
      <HistoryClient open={open} closed={closedWithRemaining} />
    </FadeUp>
  );
}
