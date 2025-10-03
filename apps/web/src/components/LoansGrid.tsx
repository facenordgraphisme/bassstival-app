// apps/web/src/components/LoansGrid.tsx
"use client";
import { useEffect, useState } from "react";
import Highlight from "@/components/Highlight";

type Loan = {
  id: string;
  borrowerName: string;
  openedAt?: string | null;
  closedAt?: string | null;
  status?: "open" | "closed";
  matchedItems?: string[]; // ⬅️ NEW: items matchés (optionnel)
};

export default function LoansGrid({
  loans,
  showClosed = false,
  query = "",
}: {
  loans: Loan[];
  showClosed?: boolean;
  query?: string;
}) {
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    const last = sessionStorage.getItem("lastLoanId");
    if (last) {
      setFlashId(last);
      sessionStorage.removeItem("lastLoanId");
      const t = setTimeout(() => setFlashId(null), 900);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {loans.map((l) => (
        <a
          key={l.id}
          href={`/loans/${l.id}${query ? `?q=${encodeURIComponent(query)}` : ""}`} // ⬅️ on propage q (optionnel)
          className={`card neon lift block ${flashId === l.id ? "flash-accent" : ""}`}
          onClick={() => sessionStorage.setItem("lastLoanId", l.id)}
        >
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold">
              <Highlight text={l.borrowerName} query={query} />
            </div>
            {!showClosed && <span className="badge">Ouverte</span>}
          </div>

          {/* ⬅️ Aperçu des items qui matchent la recherche (max 3) */}
          {query && l.matchedItems && l.matchedItems.length > 0 && (
            <div className="text-xs mt-1 space-x-2 opacity-80">
              {l.matchedItems.slice(0, 3).map((item, i) => (
                <span key={i}>
                  <Highlight text={item} query={query} />
                </span>
              ))}
            </div>
          )}

          <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {showClosed
              ? `Clôturée le ${l.closedAt ? new Date(l.closedAt).toLocaleString() : "—"}`
              : `Créée le ${l.openedAt ? new Date(l.openedAt).toLocaleString() : "—"}`}
          </div>
        </a>
      ))}
    </div>
  );
}
