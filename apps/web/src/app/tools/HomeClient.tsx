"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import LoansGrid from "@/components/LoansGrid";
import NeonSwitch from "@/components/NeonSwitch";
import { listLoans, searchLoans } from "@/lib/api";
import { Search, X, PlusCircle, History } from "lucide-react";
import Link from "next/link";
import type { Loan } from "@/lib/types";
import BackButton from "@/components/BackButton";

export default function HomeClient({
  initialOpen,
  initialAll,
}: {
  initialOpen: Loan[];
  initialAll: Loan[];
}) {
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: openData } = useSWR<Loan[]>(["loans", "open"], () => listLoans("open"), { fallbackData: initialOpen });
  const { data: allData } = useSWR<Loan[]>(["loans", "all"], () => listLoans(), { fallbackData: initialAll });

  const { data: searchOpen } = useSWR<Loan[]>(
    query.length >= 2 && onlyOpen ? ["loans", "search", query, "open"] : null,
    () => searchLoans(query, "open"),
    { keepPreviousData: true }
  );
  const { data: searchAll } = useSWR<Loan[]>(
    query.length >= 2 && !onlyOpen ? ["loans", "search", query, "all"] : null,
    () => searchLoans(query),
    { keepPreviousData: true }
  );

  const dataOpenSelected = useMemo<Loan[]>(() => {
    if (query.length >= 2) {
      return onlyOpen ? (searchOpen ?? []) : (searchAll ?? []).filter((l) => l.status === "open");
    }
    return openData ?? [];
  }, [query.length, onlyOpen, searchOpen, searchAll, openData]);

  const dataAllSelected = useMemo<Loan[]>(() => {
    if (query.length >= 2) return searchAll ?? [];
    return allData ?? [];
  }, [query.length, searchAll, allData]);

  const open = useMemo(() => dataAllSelected.filter((l) => l.status === "open"), [dataAllSelected]);
  const closed = useMemo(() => dataAllSelected.filter((l) => l.status === "closed"), [dataAllSelected]);

  return (
    <>
      {/* Header + filtres dans une “carte” néon comme ailleurs */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md p-4 sm:p-6"
      >
        {/* glow conique très doux, piloté par le thème */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div
            className="absolute -inset-40 blur-3xl animate-[spin_50s_linear_infinite]"
            style={{
              background:
                "conic-gradient(at top left, color-mix(in srgb, var(--cyan) 20%, transparent), color-mix(in srgb, var(--vio) 20%, transparent), color-mix(in srgb, var(--flame) 16%, transparent), color-mix(in srgb, var(--cyan) 20%, transparent))",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-4">
          {/* titre + back */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <BackButton className="!px-2.5 !py-1.5" />
              <h1
                className="lg:text-3xl text-xl font-extrabold title-underline"
                style={{ fontFamily: "var(--font-title)" }}
              >
                Outils — Fiches de prêt
              </h1>
            </div>

            {/* Actions (desktop) */}
            <div className="hidden sm:flex items-center gap-2">
              <Link className="btn" href="/loans/new">
                <PlusCircle size={16} className="mr-1" aria-hidden />
                Créer
              </Link>
              <Link className="btn" href="/history">
                <History size={16} className="mr-1" aria-hidden />
                Historique
              </Link>
            </div>
          </div>

          {/* recherche + switch */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="input-wrap">
              <input
                className="input input-icon w-72 sm:w-80"
                placeholder="Rechercher…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Search className="icon-left" size={18} aria-hidden />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                  aria-label="Effacer la recherche"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <NeonSwitch
              size="sm"
              checked={onlyOpen}
              onChange={setOnlyOpen}
              /* le bool s’appelle onlyOpen → libellé explicite */
              label="Uniquement ouvertes"
            />
          </div>

          {/* Actions (mobile) */}
          <div className="sm:hidden flex gap-2">
            <Link className="btn w-full justify-center" href="/loans/new">
              <PlusCircle size={16} className="mr-2" />
              Créer
            </Link>
            <Link className="btn w-full justify-center" href="/history">
              <History size={16} className="mr-2" />
              Historique
            </Link>
          </div>
        </div>
      </div>

      {/* Liste / grilles */}
      {onlyOpen ? (
        dataOpenSelected.length === 0 ? (
          <div className="text-sm opacity-70 mt-2">Aucun résultat.</div>
        ) : (
          <LoansGrid loans={dataOpenSelected} query={query} />
        )
      ) : (
        <div className="space-y-10">
          <section className="space-y-4">
            <h2 className="text-xl font-bold">En cours</h2>
            {open.length === 0 ? (
              <div className="text-sm opacity-70">Aucun résultat.</div>
            ) : (
              <LoansGrid loans={open} query={query} />
            )}
          </section>

          <div className="hr-neon" />

          <section className="space-y-4">
            <h2 className="text-xl font-bold">Clôturées</h2>
            {closed.length === 0 ? (
              <div className="text-sm opacity-70">Aucun résultat.</div>
            ) : (
              <LoansGrid loans={closed} showClosed query={query} />
            )}
          </section>
        </div>
      )}
    </>
  );
}
