"use client";

import Link from "next/link";
import { useState } from "react";
import { useSWRConfig } from "swr";
import type { Loan } from "@/lib/types";
import { forceClose, updateLoan, deleteLoan } from "@/lib/api";
import {
  CalendarClock,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  Trash2,
  Check,
  CircleSlash2,
} from "lucide-react";
import { toast } from "sonner";
import { confirmWithSonner } from "@/components/confirmWithSonner";

// shadcn/ui
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Erreur";
}

export default function LoansGrid({
  loans,
  query = "",
  showClosed = false,
}: {
  loans: (Loan & { matchedItems?: string[] })[];
  query?: string;
  showClosed?: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ borrowerName: string; note: string }>({
    borrowerName: "",
    note: "",
  });

  const highlight = (txt: string) => {
    if (!query) return txt;
    const re = new RegExp(`(${escapeRegex(query)})`, "ig");
    return txt.split(re).map((p, i) =>
      re.test(p) ? (
        <mark key={i} className="mark-neon">
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      )
    );
  };

  const onEdit = (l: Loan) => {
    setEditingId(l.id);
    setEdit({ borrowerName: l.borrowerName, note: l.note ?? "" });
  };

  const saveEdit = async (l: Loan) => {
    const t = toast.loading("Sauvegarde…");
    try {
      await updateLoan(l.id, {
        borrowerName: edit.borrowerName.trim(),
        note: edit.note || null,
      });
      toast.success("Fiche mise à jour", { id: t });
      setEditingId(null);
      await Promise.all([mutate(["loans", "open"]), mutate(["loans", "all"])]);
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  const closeLoan = async (l: Loan) => {
    const t = toast.loading("Clôture…");
    try {
      await forceClose(l.id);
      toast.success("Fiche clôturée", { id: t });
      await Promise.all([mutate(["loans", "open"]), mutate(["loans", "all"])]);
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  const removeLoan = async (l: Loan) => {
    const ok = await confirmWithSonner(
      `Supprimer la fiche de ${l.borrowerName} ?`,
      "Tous ses objets liés seront également supprimés.",
      "Supprimer",
      "Annuler"
    );
    if (!ok) return;

    const p = toast.promise(deleteLoan(l.id), {
      loading: "Suppression…",
      success: "Fiche supprimée",
      error: "Erreur lors de la suppression",
    });
    try {
      await p;
      await Promise.all([mutate(["loans", "open"]), mutate(["loans", "all"])]);
    } catch {}
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {loans.map((l) => {
        const isEditing = editingId === l.id;
        const opened =
          typeof l.openedAt === "string" && l.openedAt
            ? new Date(l.openedAt)
            : null;

        return (
          <div
            key={l.id}
            className="
              group relative overflow-hidden isolate
              rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md
              shadow-[0_10px_35px_-15px_rgba(0,0,0,.6)]
              transition-[transform,box-shadow,border-color,background] duration-300 will-change-transform
              hover:scale-[1.015] hover:bg-white/[0.07]
              hover:[border-color:color-mix(in_srgb,var(--accent)_35%,transparent)]
              focus-within:ring-2 focus-within:ring-[var(--accent)]/40
              p-4 sm:p-5
            "
          >
            {/* halo conique au survol (mêmes couleurs que les autres pages) */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span
                className="absolute -inset-32 blur-3xl animate-[spin_24s_linear_infinite]"
                style={{
                  background:
                    "conic-gradient(at top left, color-mix(in srgb, var(--cyan) 28%, transparent), color-mix(in srgb, var(--vio) 28%, transparent), color-mix(in srgb, var(--flame) 22%, transparent), color-mix(in srgb, var(--cyan) 28%, transparent))",
                }}
              />
            </span>

            {/* anneau discret selon status (juste un hint) */}
            <div
              aria-hidden
              className={`absolute inset-0 rounded-2xl ring-1 ring-inset opacity-40 transition-opacity pointer-events-none ${
                l.status === "open"
                  ? "ring-[color-mix(in_srgb,var(--cyan)_25%,transparent)]"
                  : "ring-[color-mix(in_srgb,var(--vio)_20%,transparent)]"
              } group-hover:opacity-60`}
            />

            {/* CONTENU */}
            <div className="relative z-10 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/loans/${l.id}`}
                  className="flex items-center gap-3 min-w-0"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/10 grid place-items-center ring-1 ring-white/15 shrink-0">
                    <CalendarClock size={18} />
                  </div>

                  <div className="leading-tight min-w-0">
                    <div className="font-semibold truncate">
                      {isEditing ? (
                        <input
                          className="input !py-1 !px-2"
                          value={edit.borrowerName}
                          onChange={(e) =>
                            setEdit((s) => ({
                              ...s,
                              borrowerName: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        highlight(l.borrowerName)
                      )}
                    </div>

                    <div className="text-xs opacity-70">
                      {(opened
                        ? opened.toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "—") +
                        " • " +
                        (l.status === "open" ? "Ouverte" : "Clôturée")}
                    </div>
                  </div>
                </Link>

                {/* Menu actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="btn-ghost p-2" aria-label="Actions">
                      <MoreHorizontal size={18} />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="min-w-56 bg-[rgba(255,255,255,0.03)] border border-white/10 rounded-xl text-foreground shadow-lg backdrop-blur"
                  >
                    <DropdownMenuLabel className="opacity-70">
                      Actions
                    </DropdownMenuLabel>

                    <DropdownMenuItem
                      asChild
                      className="hover:bg-white/10 focus:bg-white/10 rounded-lg cursor-pointer"
                    >
                      <Link href={`/loans/${l.id}`} className="flex w-full items-center">
                        <ExternalLink size={16} className="mr-2" />
                        Ouvrir
                      </Link>
                    </DropdownMenuItem>

                    {l.status === "open" ? (
                      <>
                        <DropdownMenuItem
                          onClick={() => onEdit(l)}
                          className="hover:bg-white/10 focus:bg-white/10 rounded-lg cursor-pointer"
                        >
                          <Pencil size={16} className="mr-2" />
                          Modifier (nom / note)
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => closeLoan(l)}
                          className="hover:bg-white/10 focus:bg-white/10 rounded-lg cursor-pointer"
                        >
                          <CircleSlash2 size={16} className="mr-2" />
                          Clôturer la fiche
                        </DropdownMenuItem>
                      </>
                    ) : null}

                    <DropdownMenuSeparator className="bg-white/10" />

                    <DropdownMenuItem
                      onClick={() => removeLoan(l)}
                      className="text-red-500 focus:text-red-500 hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Note + matched items */}
              <div className="text-sm opacity-80 space-y-2">
                {isEditing ? (
                  <textarea
                    className="input h-20"
                    placeholder="Note…"
                    value={edit.note}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, note: e.target.value }))
                    }
                  />
                ) : (
                  <div className="min-h-5">
                    {l.note ? (
                      highlight(l.note)
                    ) : (
                      <span className="opacity-60">—</span>
                    )}
                  </div>
                )}

                {l.matchedItems && l.matchedItems.length > 0 && (
                  <div className="text-xs opacity-70">
                    Obj. correspondants : {l.matchedItems.join(" • ")}
                  </div>
                )}
              </div>

              {/* Footer edition actions */}
              {isEditing && (
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    className="btn-ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Annuler
                  </button>
                  <button className="btn" onClick={() => saveEdit(l)}>
                    <Check size={16} className="mr-1" />
                    Enregistrer
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
