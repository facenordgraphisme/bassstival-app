"use client";
import { useState } from "react";
import { StaggerList } from "@/components/FX";
import NeonSwitch from "@/components/NeonSwitch";
import type { Loan } from "@/lib/types";

function RemainingBadge({ remaining }: { remaining: number }) {
  if (remaining <= 0) return <span className="badge badge-green ml-2">Tout rendu</span>;
  return <span className="badge badge-red ml-2">Manque {remaining}</span>;
}

type LoanWithRemaining = Loan & { remaining: number };

export default function HistoryClient({
  open,
  closed,
}: { open: Loan[]; closed: LoanWithRemaining[] }) {
  const [onlyMissing, setOnlyMissing] = useState(false);
  const filteredClosed = onlyMissing ? closed.filter((l) => l.remaining > 0) : closed;

  return (
    <>
      {/* EN COURS */}
      <section className="space-y-4">
        <h1 className="lg:text-3xl text-xl font-extrabold title-underline mb-6" style={{ fontFamily: "var(--font-title)" }}>
          En cours
        </h1>
        {open.length === 0 ? (
          <div className="text-sm opacity-70">Aucune fiche en cours.</div>
        ) : (
          <StaggerList className="grid md:grid-cols-2 gap-4">
            {open.map((l) => (
              <a key={l.id} href={`/loans/${l.id}`} className="card neon lift block">
                <div className="flex items-center justify-between">
                  <div className="lg:text-lg text-sm font-bold">{l.borrowerName}</div>
                  <span className="badge">Ouverte</span>
                </div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  Créée le {l.openedAt ? new Date(l.openedAt).toLocaleString() : "—"}
                </div>
              </a>
            ))}
          </StaggerList>
        )}
      </section>

      <div className="hr-neon" />

      {/* CLÔTURÉES + SWITCH */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="lg:text-3xl text-xl font-extrabold title-underline mr-4" style={{ fontFamily: "var(--font-title)" }}>
            Clôturées
          </h2>
          <NeonSwitch
            checked={onlyMissing}
            onChange={setOnlyMissing}
            label="Uniquement avec manquants"
          />
        </div>

        {filteredClosed.length === 0 ? (
          <div className="text-sm opacity-70">
            {onlyMissing ? "Aucune fiche avec manquants." : "Aucune fiche clôturée."}
          </div>
        ) : (
          <StaggerList className="grid md:grid-cols-2 gap-4">
            {filteredClosed.map((l) => (
              <a key={l.id} href={`/loans/${l.id}`} className="card neon lift block">
                <div className="flex items-center justify-between">
                  <div className="lg:text-lg text-sm font-bold">{l.borrowerName}</div>
                  <RemainingBadge remaining={l.remaining} />
                </div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  Clôturée le {l.closedAt ? new Date(l.closedAt).toLocaleString() : "—"}
                </div>
              </a>
            ))}
          </StaggerList>
        )}
      </section>
    </>
  );
}
