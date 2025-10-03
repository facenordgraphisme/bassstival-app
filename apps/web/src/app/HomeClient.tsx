"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import LoansGrid from "@/components/LoansGrid";
import NeonSwitch from "@/components/NeonSwitch";
import { listLoans, searchLoans } from "@/lib/api";
import { Search, X } from "lucide-react";
import type { Loan } from "@/lib/types";

export default function HomeClient({
  initialOpen,
  initialAll,
}: {
  initialOpen: Loan[];
  initialAll: Loan[];
}) {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [query, setQuery] = useState("");

  // Données de base (SWR) avec fallback SSR
  const { data: openData } = useSWR<Loan[]>(
    ["loans", "open"],
    () => listLoans("open"),
    { fallbackData: initialOpen }
  );
  const { data: allData } = useSWR<Loan[]>(
    ["loans", "all"],
    () => listLoans(),
    { fallbackData: initialAll }
  );

  // Recherche distante (SWR) — seulement si query >= 2
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

  // Sélections mémoïsées pour éviter les warnings de deps
  const dataOpenSelected = useMemo<Loan[]>(() => {
    if (query.length >= 2) {
      return onlyOpen
        ? (searchOpen ?? [])
        : (searchAll ?? []).filter((l) => l.status === "open");
    }
    return openData ?? [];
  }, [query.length, onlyOpen, searchOpen, searchAll, openData]);

  const dataAllSelected = useMemo<Loan[]>(() => {
    if (query.length >= 2) {
      return searchAll ?? [];
    }
    return allData ?? [];
  }, [query.length, searchAll, allData]);

  const open = useMemo(
    () => dataAllSelected.filter((l) => l.status === "open"),
    [dataAllSelected]
  );
  const closed = useMemo(
    () => dataAllSelected.filter((l) => l.status === "closed"),
    [dataAllSelected]
  );

  return (
    <>
      {/* Header + filtres */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1
          className="text-3xl font-extrabold title-underline"
          style={{ fontFamily: "var(--font-title)" }}
        >
          Fiches
        </h1>

        <div className="flex items-center gap-3">
          {/* Recherche (nom OU item) */}
          <div className="input-wrap">
            <input
              className="input input-icon w-64"
              placeholder="Rechercher… (nom ou objet)"
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
            label="Uniquement ouvertes"
          />
        </div>
      </div>

      {onlyOpen ? (
        // Mode “Uniquement ouvertes”
        dataOpenSelected.length === 0 ? (
          <div className="text-sm opacity-70 mt-2">Aucun résultat.</div>
        ) : (
          <LoansGrid loans={dataOpenSelected} query={query} />
        )
      ) : (
        // Mode “Tout” → deux sections
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
