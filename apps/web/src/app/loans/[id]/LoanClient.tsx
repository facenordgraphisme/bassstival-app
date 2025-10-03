"use client";

import useSWR from "swr";
import { getLoan, returnItem, addItem, forceClose, deleteItem } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { StaggerList } from "@/components/FX";
import { useState } from "react";

/* ----------------------------- Types locaux ----------------------------- */

export type LoanItem = {
  id: string;
  loanId: string;
  itemName: string;
  qtyOut: number;
  qtyIn: number;
  status: "open" | "returned";
  note: string | null;
};

export type Loan = {
  id: string;
  borrowerName: string;
  note: string | null;
  status: "open" | "closed";
  openedAt: string | null;
  closedAt: string | null;
  items: LoanItem[];
};

type Props = {
  id: string;
  initial: Loan;
};

/* ------------------------------ SWR fetcher ----------------------------- */

const fetcher = (id: string) => getLoan(id);

/* --------------------------------- UI ---------------------------------- */

export default function LoanClient({ id, initial }: Props) {
  const { data, mutate, isLoading } = useSWR<Loan>(id, fetcher, {
    fallbackData: initial,
  });
  const [flashId, setFlashId] = useState<string | null>(null);

  const onReturn = async (itemId: string, qty: number = 1) => {
    const t = toast.loading("Enregistrement du retour…");
    try {
      await returnItem(id, itemId, qty);
      setFlashId(itemId);
      toast.success(`Retour de ${qty} enregistré`, { id: t });
      mutate();
      setTimeout(() => setFlashId(null), 800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur retour";
      toast.error(msg, { id: t });
    }
  };

  const onAdd = async (formData: FormData) => {
    const name = String(formData.get("name") ?? "").trim();
    const qtyRaw = formData.get("qty");
    const qty = Number(qtyRaw ?? 1) || 1;

    if (!name) {
      toast.error("Nom d’objet requis");
      return;
    }

    const t = toast.loading("Ajout de l’objet…");
    try {
      const newItem = (await addItem(id, { itemName: name, qtyOut: qty })) as LoanItem;
      setFlashId(newItem.id);
      toast.success("Objet ajouté 👍", { id: t });
      mutate();
      setTimeout(() => setFlashId(null), 800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur ajout";
      toast.error(msg, { id: t });
    }
  };

  const onDelete = async (itemId: string) => {
    const t = toast.loading("Suppression…");
    try {
      await deleteItem(id, itemId);
      toast.success("Objet supprimé", { id: t });
      mutate();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur suppression";
      toast.error(msg, { id: t });
    }
  };

  const onClose = async () => {
    const t = toast.loading("Clôture de la fiche…");
    try {
      await forceClose(id);
      toast.success("Fiche clôturée 🎉", { id: t });
      mutate();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur clôture";
      toast.error(msg, { id: t });
    }
  };

  if (isLoading || !data) return <div>Chargement…</div>;

  const remaining =
    data.items?.filter((i: LoanItem) => i.status !== "returned").length ?? 0;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-title)" }}>
          {data.borrowerName}
        </h1>
        <button className="btn pulse" onClick={onClose}>
          Clore la fiche
        </button>
      </div>

      <div className="card neon space-y-3">
        <div className="text-sm opacity-70">
          Ouverte le{" "}
          {data.openedAt ? new Date(data.openedAt).toLocaleString() : "—"} •{" "}
          <span className={`badge ${remaining === 0 ? "badge-green" : ""} ml-2`}>
            {remaining === 0 ? "Tout rendu" : `Restant: ${remaining}`}
          </span>
        </div>

        <StaggerList className="space-y-2">
          {data.items?.map((it: LoanItem) => (
            <div
              key={it.id}
              className={`flex items-center justify-between border-b border-white/10 pb-2 rounded ${
                flashId === it.id ? "flash" : ""
              }`}
            >
              <div>
                <div className="font-semibold">{it.itemName}</div>
                <div className="text-sm opacity-70">
                  {it.qtyIn}/{it.qtyOut} rendu
                </div>
              </div>
              <div className="flex gap-2">
                {it.status !== "returned" && (
                  <div className="flex items-center gap-2">
                    <input
                      className="input w-20"
                      type="number"
                      min={1}
                      defaultValue={1}
                      id={`qty-${it.id}`}
                      aria-label={`Quantité à rendre pour ${it.itemName}`}
                    />
                    <button
                      className="btn"
                      onClick={() => {
                        const input = document.getElementById(
                          `qty-${it.id}`
                        ) as HTMLInputElement | null;
                        const q = Number(input?.value ?? 1) || 1;
                        onReturn(it.id, q);
                      }}
                    >
                      Rendre
                    </button>
                  </div>
                )}
                <button
                  className="btn-ghost"
                  onClick={() => onDelete(it.id)}
                  aria-label={`Supprimer ${it.itemName}`}
                >
                  Suppr
                </button>
              </div>
            </div>
          ))}
        </StaggerList>

        <div className="pt-4">
          <form action={onAdd} className="flex gap-3">
            <input className="input" name="name" placeholder="Ajouter un objet" />
            <input
              className="input w-28"
              name="qty"
              type="number"
              min={1}
              defaultValue={1}
            />
            <button className="btn" type="submit">
              + Ajouter
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
