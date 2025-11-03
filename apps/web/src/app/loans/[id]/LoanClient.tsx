"use client";
import useSWR from "swr";
import {
  getLoan,
  returnItem,
  addItem,
  forceClose,
  deleteItem,
  type Loan,
  type LoanItem,
} from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { StaggerList } from "@/components/FX";
import { useState } from "react";
import { Trash2 } from "lucide-react";

type LoanWithItems = Loan & { items: LoanItem[] };
type Props = { id: string; initial?: LoanWithItems };

const fetcher = (id: string) => getLoan(id);

export default function LoanClient({ id, initial }: Props) {
  const { data, mutate, isLoading } = useSWR<LoanWithItems>(id, fetcher, {
    fallbackData: initial,
  });
  const [flashId, setFlashId] = useState<string | null>(null);

  const onReturn = async (itemId: string, qty = 1) => {
    const t = toast.loading("Enregistrement du retour…");
    try {
      await returnItem(id, itemId, qty);
      setFlashId(itemId);
      toast.success(`Retour de ${qty} enregistré`, { id: t });
      mutate();
      setTimeout(() => setFlashId(null), 800);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur retour", { id: t });
    }
  };

  const onAdd = async (formData: FormData): Promise<void> => {
    const name = String(formData.get("name") || "");
    const qty = Math.max(1, Number(formData.get("qty") || 1) || 1);
    if (!name) {
      toast.error("Nom d’objet requis");
      return;
    }
    const t = toast.loading("Ajout de l’objet…");
    try {
      const newItem = await addItem(id, { itemName: name, qtyOut: qty });
      setFlashId(newItem.id);
      toast.success("Objet ajouté 👍", { id: t });
      mutate();
      setTimeout(() => setFlashId(null), 800);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur ajout", { id: t });
    }
  };

  const onDelete = async (itemId: string) => {
    const t = toast.loading("Suppression…");
    try {
      await deleteItem(id, itemId);
      toast.success("Objet supprimé", { id: t });
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur suppression", { id: t });
    }
  };

  const onClose = async () => {
    const t = toast.loading("Clôture de la fiche…");
    try {
      await forceClose(id);
      toast.success("Fiche clôturée 🎉", { id: t });
      mutate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur clôture", { id: t });
    }
  };

  if (isLoading || !data) return <div>Chargement…</div>;
  const remaining = data.items?.filter((i) => i.status !== "returned").length || 0;

  return (
    <motion.div
      className="space-y-6 pb-24 sm:pb-0"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header responsive */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="text-2xl sm:text-3xl font-extrabold break-words"
          style={{ fontFamily: "var(--font-title)" }}
        >
          {data.borrowerName}
        </h1>
        <div className="hidden sm:block">
          <button className="btn" onClick={onClose}>
            Clore la fiche
          </button>
        </div>
      </div>

      {/* Carte principale avec hover glow (cohérente avec les autres pages) */}
      <div
        className="
          group relative isolate overflow-hidden rounded-2xl
          border border-white/10 bg-white/5 backdrop-blur-md
          shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
          transition-[transform,background,border-color] duration-300 will-change-transform
          hover:-translate-y-0.5 hover:bg-white/[0.07]
          hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]
          before:content-[''] before:absolute before:inset-0 before:-z-0
          before:opacity-0 before:transition-opacity before:duration-300
          before:bg-[radial-gradient(36rem_36rem_at_30%_50%,var(--accent)/26,transparent_60%)]
          after:content-[''] after:absolute after:inset-0 after:-z-0
          after:opacity-0 after:transition-opacity after:duration-300 after:delay-75
          after:bg-[radial-gradient(30rem_30rem_at_80%_50%,var(--vio)/18,transparent_60%)]
          group-hover:before:opacity-100 group-hover:after:opacity-100
        "
      >
        <div className="relative z-10 p-5 space-y-4">
          {/* Méta */}
          <div className="text-xs sm:text-sm opacity-70 flex flex-wrap items-center gap-2">
            <span className="truncate">
              Ouverte le {new Date(data.openedAt).toLocaleString()}
            </span>
            <span
              className={`badge ml-0 sm:ml-2 ${
                remaining === 0 ? "badge-returned-neon" : "badge"
              }`}
            >
              {remaining === 0 ? "Tout rendu ✅" : `Restant: ${remaining}`}
            </span>
          </div>

          {/* Items */}
          <StaggerList className="space-y-3">
            {data.items?.map((it) => {
              const isReturned = it.qtyIn >= it.qtyOut;
              return (
                <div
                  key={it.id}
                  className={`
                    rounded border p-3 sm:p-3 transition-colors duration-300
                    ${flashId === it.id ? "flash" : ""}
                    ${isReturned ? "neon-green-soft" : "border-white/10 bg-black/20 hover:bg-white/[0.06] hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]"}
                  `}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:gap-4 items-center">
                    {/* Infos objet */}
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{it.itemName}</div>
                      <div
                        className={`text-xs sm:text-sm transition-all duration-300 ${
                          isReturned
                            ? "text-neon-green font-semibold glow-green"
                            : "opacity-70"
                        }`}
                      >
                        {it.qtyIn}/{it.qtyOut} rendu
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:justify-end">
                      {it.status !== "returned" && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            className="input w-full sm:w-24 !py-1.5"
                            type="number"
                            min={1}
                            defaultValue={1}
                            id={`qty-${it.id}`}
                          />
                          <button
                            className="btn-outline w-full sm:w-auto !py-1.5"
                            onClick={() => {
                              const input = document.getElementById(
                                `qty-${it.id}`
                              ) as HTMLInputElement | null;
                              const qty = Number(input?.value || 1);
                              onReturn(it.id, qty);
                            }}
                          >
                            Rendre
                          </button>
                        </div>
                      )}

                      <button
                        className="btn-ghost w-full sm:w-auto !py-1.5"
                        onClick={() => onDelete(it.id)}
                        title="Supprimer l’objet"
                      >
                        <Trash2 size={16} className="mr-1 hidden sm:inline" />
                        Suppr
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </StaggerList>

          {/* Ajout d’un objet */}
          <div className="pt-2">
            <form action={onAdd} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input className="input w-full" name="name" placeholder="Ajouter un objet" />
              <div className="flex gap-2 sm:gap-3">
                <input className="input w-24" name="qty" type="number" min={1} defaultValue={1} />
                <button className="btn w-full sm:w-auto" type="submit">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Barre d’action sticky — mobile */}
      <div className="fixed bottom-3 left-3 right-3 sm:hidden">
        <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-2 shadow-lg">
          <button className="btn w-full" onClick={onClose}>
            Clore la fiche
          </button>
        </div>
      </div>
    </motion.div>
  );
}
