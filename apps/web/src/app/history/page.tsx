import { listLoans, getLoan } from "@/lib/api";
import { FadeUp, StaggerList } from "@/components/FX";
import HistoryClient from "./HistoryClient";

function RemainingBadge({ remaining }: { remaining: number }) {
  if (remaining <= 0) {
    return <span className="badge badge-green ml-2">Tout rendu</span>;
  }
  return <span className="badge badge-red ml-2">Manque {remaining}</span>;
}

export default async function History() {
  // 1) On charge les fiches ouvertes (pour les afficher en haut)
  const open = await listLoans("open");

  // 2) On charge les fiches closes
  const closed = await listLoans("closed");

  // 3) Pour chaque fiche close, on récupère le détail pour savoir s'il reste des items en prêt
  const closedWithRemaining = await Promise.all(
    closed.map(async (l) => {
      const d = await getLoan(l.id);
      const remaining = (d.items || []).filter((it: any) => it.status !== "returned").length;
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
