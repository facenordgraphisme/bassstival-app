"use client";
import { useState } from "react";
import { createLoan } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

type Row = { itemName: string; qtyOut: number };

export default function NewLoan() {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([{ itemName: "", qtyOut: 1 }]);
  const [loading, setLoading] = useState(false);

  const addRow = () => setRows((r) => [...r, { itemName: "", qtyOut: 1 }]);
  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = async () => {
    if (!name.trim()) { toast.error("Nom requis"); return; }
    setLoading(true);
    const t = toast.loading("Création de la fiche…");
    try {
      const items = rows
        .filter((r) => r.itemName.trim())
        .map((r) => ({ itemName: r.itemName, qtyOut: Number(r.qtyOut) || 1 }));
      const { id } = await createLoan({ borrowerName: name, note, items });
      toast.success("Fiche créée ✨", { id: t });
      location.href = `/loans/${id}`;
    } catch (e: any) {
      toast.error(e?.message || "Erreur création fiche", { id: t });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .3 }}
    >
      <h1 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-title)" }}>Nouvelle fiche</h1>
      <div className="card space-y-4">
        <input className="input" placeholder="Nom de l'emprunteur" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="input h-24" placeholder="Note (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="space-y-3">
          {rows.map((r, i) => (
            <motion.div
              key={i}
              className="flex gap-3"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <input className="input" placeholder="Objet (ex: Disqueuse)" value={r.itemName} onChange={(e) => setRow(i, { itemName: e.target.value })} />
              <input className="input w-28" type="number" min={1} value={r.qtyOut} onChange={(e) => setRow(i, { qtyOut: Number(e.target.value) })} />
            </motion.div>
          ))}
          <button className="btn" onClick={addRow} type="button">+ Ajouter un objet</button>
        </div>
        <div className="flex justify-end">
          <button className="btn" onClick={submit} disabled={loading}>
            {loading ? "Création…" : "Créer la fiche"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
