"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  type Booking,
  type BookingCost,
  type BookingStatus,
  updateBooking,
  listBookingCosts,
  createBookingCost,
  updateBookingCost,
  deleteBookingCost,
  BOOKING_STATUS,
  BOOKING_STATUS_LABEL,
} from "@/lib/bookings";
import { STAGE_LABEL } from "@/lib/utils-booking";
import type { Stage, } from "@/lib/artists";
import Link from "next/link";
import { getArtist, type ArtistWithContacts } from "@/lib/artists";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Erreur";
}

export default function BookingDetailsClient({ initial }: { initial: Booking & { costs: BookingCost[] } }) {
  const bookingId = initial.id;

  // Onglets (+ "artist")
  const [tab, setTab] = useState<"timing" | "log" | "finance" | "artist">("timing");

  // SWR artiste lié (pour import + onglet Artist)
  const { data: artist } = useSWR<ArtistWithContacts>(
    ["booking-artist", initial.artistId],
    () => getArtist(initial.artistId),
    { revalidateOnFocus: false }
  );

  // SWR coûts booking
  const { data: costs, mutate: mutateCosts } = useSWR<BookingCost[]>(
    ["booking-costs", bookingId],
    () => listBookingCosts(bookingId),
    { fallbackData: initial.costs }
  );

  // --- Timing
  const [formTiming, setFormTiming] = useState<{
    stage: Stage;
    status: BookingStatus;
    startAt: string;
    endAt: string;
  }>({
    stage: (initial.stage ?? "main") as Stage,
    status: initial.status,
    startAt: initial.startAt.slice(0, 16),
    endAt: initial.endAt.slice(0, 16),
  });

  const saveTiming = async () => {
    const t = toast.loading("Sauvegarde…");
    try {
      await updateBooking(bookingId, {
        stage: formTiming.stage as any,
        status: formTiming.status,
        startAt: new Date(formTiming.startAt).toISOString(),
        endAt: new Date(formTiming.endAt).toISOString(),
      });
      toast.success("Timing mis à jour", { id: t });
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  // --- Logistique (booking)
  const [formLog, setFormLog] = useState({
    hospitalityNotes: initial.hospitalityNotes ?? "",
    techRider: initial.techRider ?? "",
    travelNotes: initial.travelNotes ?? "",
    pickupAt: initial.pickupAt ? initial.pickupAt.slice(0, 16) : "",
    pickupLocation: initial.pickupLocation ?? "",
  });

  const saveLog = async () => {
    const t = toast.loading("Sauvegarde…");
    try {
      await updateBooking(bookingId, {
        hospitalityNotes: formLog.hospitalityNotes || null,
        techRider: formLog.techRider || null,
        travelNotes: formLog.travelNotes || null,
        pickupAt: formLog.pickupAt ? new Date(formLog.pickupAt).toISOString() : null,
        pickupLocation: formLog.pickupLocation || null,
      });
      toast.success("Logistique mise à jour", { id: t });
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  // 👉 Import logistique depuis l’artiste
  const importLogFromArtist = async () => {
    if (!artist) {
      toast.error("Artiste introuvable");
      return;
    }
    const t = toast.loading("Import depuis l’artiste…");
    try {
      // maj UI
      setFormLog({
        hospitalityNotes: artist.hospitalityNotes ?? "",
        techRider: artist.techRider ?? "",
        travelNotes: artist.travelNotes ?? "",
        pickupAt: artist.pickupAt ? artist.pickupAt.slice(0, 16) : "",
        pickupLocation: artist.pickupLocation ?? "",
      });
      // maj DB (booking)
      await updateBooking(bookingId, {
        hospitalityNotes: artist.hospitalityNotes ?? null,
        techRider: artist.techRider ?? null,
        travelNotes: artist.travelNotes ?? null,
        pickupAt: artist.pickupAt ?? null,
        pickupLocation: artist.pickupLocation ?? null,
      });
      toast.success("Logistique importée depuis l’artiste", { id: t });
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  // --- Finances (booking)
  const [fee, setFee] = useState<string>(initial.feeAmount ? (initial.feeAmount / 100).toFixed(2) : "");
  const saveFee = async () => {
    const cents = Math.round((Number(fee.replace(",", ".")) || 0) * 100);
    const t = toast.loading("Sauvegarde…");
    try {
      await updateBooking(bookingId, { feeAmount: cents, feeCurrency: "EUR" });
      toast.success("Cachet mis à jour", { id: t });
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  // 👉 Import finances depuis l’artiste
  const importFinanceFromArtist = async () => {
    if (!artist) {
      toast.error("Artiste introuvable");
      return;
    }
    const t = toast.loading("Import depuis l’artiste…");
    try {
      const cents = artist.feeAmount ?? null;
      setFee(artist.feeAmount ? (artist.feeAmount / 100).toFixed(2) : "");
      await updateBooking(bookingId, { feeAmount: cents, feeCurrency: artist.feeCurrency ?? "EUR" });
      toast.success("Finances importées depuis l’artiste", { id: t });
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  const [newCost, setNewCost] = useState({ label: "", amount: "" });
  const addCost = async () => {
    if (!newCost.label || !newCost.amount) return;
    const cents = Math.round((Number(newCost.amount.replace(",", ".")) || 0) * 100);
    const t = toast.loading("Ajout…");
    try {
      await createBookingCost(bookingId, { label: newCost.label, amount: cents, currency: "EUR", paid: false });
      setNewCost({ label: "", amount: "" });
      toast.success("Coût ajouté", { id: t });
      mutateCosts();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  const togglePaid = async (c: BookingCost) => {
    await updateBookingCost(c.id, { paid: !c.paid });
    mutateCosts();
  };

  const delCost = async (c: BookingCost) => {
    await deleteBookingCost(c.id);
    mutateCosts();
  };

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-2">
        <button className={`btn-ghost ${tab === "timing" ? "!text-white" : ""}`} onClick={() => setTab("timing")}>
          Timing
        </button>
        <button className={`btn-ghost ${tab === "log" ? "!text-white" : ""}`} onClick={() => setTab("log")}>
          Logistique
        </button>
        <button className={`btn-ghost ${tab === "finance" ? "!text-white" : ""}`} onClick={() => setTab("finance")}>
          Finances
        </button>
        <button className={`btn-ghost ${tab === "artist" ? "!text-white" : ""}`} onClick={() => setTab("artist")}>
          Artiste
        </button>
        <div className="ml-auto">
          <Link href="/bookings/planning" className="btn-ghost">
            Voir planning
          </Link>
        </div>
      </div>

      {/* TIMING */}
      {tab === "timing" && (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <select
              className="input"
              value={formTiming.stage}
              onChange={(e) => setFormTiming((f) => ({ ...f, stage: e.target.value as Stage }))}
            >
              <option value="main">{STAGE_LABEL.main}</option>
              <option value="second">{STAGE_LABEL.second}</option>
              
            </select>

            <select
              className="input"
              value={formTiming.status}
              onChange={(e) => setFormTiming((f) => ({ ...f, status: e.target.value as BookingStatus }))}
            >
              {BOOKING_STATUS.map((s) => (
                <option key={s} value={s}>
                  {BOOKING_STATUS_LABEL[s]}
                </option>
              ))}
            </select>

            <input
              className="input"
              type="datetime-local"
              value={formTiming.startAt}
              onChange={(e) => setFormTiming((f) => ({ ...f, startAt: e.target.value }))}
            />
            <input
              className="input"
              type="datetime-local"
              value={formTiming.endAt}
              onChange={(e) => setFormTiming((f) => ({ ...f, endAt: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={saveTiming}>
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* LOGISTIQUE (booking) */}
      {tab === "log" && (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <textarea
              className="input h-24"
              placeholder="Hospitality / catering / loge"
              value={formLog.hospitalityNotes}
              onChange={(e) => setFormLog((f) => ({ ...f, hospitalityNotes: e.target.value }))}
            />
            <textarea
              className="input h-24"
              placeholder="Tech rider"
              value={formLog.techRider}
              onChange={(e) => setFormLog((f) => ({ ...f, techRider: e.target.value }))}
            />
            <textarea
              className="input h-24"
              placeholder="Voyage / transport"
              value={formLog.travelNotes}
              onChange={(e) => setFormLog((f) => ({ ...f, travelNotes: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input"
                type="datetime-local"
                value={formLog.pickupAt}
                onChange={(e) => setFormLog((f) => ({ ...f, pickupAt: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Lieu de récupération"
                value={formLog.pickupLocation}
                onChange={(e) => setFormLog((f) => ({ ...f, pickupLocation: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button className="btn-ghost" onClick={importLogFromArtist}>
              Importer depuis l’artiste
            </button>
            <button className="btn" onClick={saveLog}>
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* FINANCES (booking) */}
      {tab === "finance" && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs opacity-70 mb-1 block">Cachet (EUR)</label>
                <input className="input" placeholder="0,00" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-ghost" onClick={importFinanceFromArtist}>
                  Importer depuis l’artiste
                </button>
                <button className="btn" onClick={saveFee}>
                  Enregistrer cachet
                </button>
              </div>
            </div>
          </div>

          <div className="card space-y-3">
            <div className="font-semibold">Autres coûts</div>
            <div className="grid gap-2">
              {(costs ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                  <div className="text-sm">
                    <div className="font-medium">{c.label}</div>
                    <div className="text-xs opacity-70">{(c.amount / 100).toFixed(2)} €</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={`badge ${c.paid ? "badge-green" : ""}`} onClick={() => togglePaid(c)}>
                      {c.paid ? "Payé" : "À payer"}
                    </button>
                    <button className="btn-ghost" onClick={() => delCost(c)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-2">
              <input
                className="input"
                placeholder="Libellé"
                value={newCost.label}
                onChange={(e) => setNewCost((s) => ({ ...s, label: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Montant (EUR)"
                value={newCost.amount}
                onChange={(e) => setNewCost((s) => ({ ...s, amount: e.target.value }))}
              />
              <button className="btn" onClick={addCost}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARTISTE (lecture + lien vers fiche) */}
      {tab === "artist" && (
        <div className="space-y-4">
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-lg">{artist?.name ?? "Artiste"}</div>
              {artist && (
                <Link className="btn-ghost" href={`/artists/${artist.id}`}>
                  Ouvrir la fiche artiste
                </Link>
              )}
            </div>
            <div className="text-sm opacity-80">
              Statut: <span className="opacity-100">{artist?.status ?? "—"}</span>
            </div>
            <div className="text-sm opacity-80">Genre: {artist?.genre || "—"}</div>
            <div className="text-sm opacity-80">Agence: {artist?.agency || "—"}</div>
            <div className="text-sm opacity-80">Notes: {artist?.notes || "—"}</div>
          </div>

          <div className="card space-y-2">
            <div className="font-semibold">Logistique (artiste)</div>
            <div className="text-sm opacity-80">Hospitality: {artist?.hospitalityNotes || "—"}</div>
            <div className="text-sm opacity-80">Tech rider: {artist?.techRider || "—"}</div>
            <div className="text-sm opacity-80">Voyage: {artist?.travelNotes || "—"}</div>
            <div className="text-sm opacity-80">
              Pickup:{" "}
              {artist?.pickupAt
                ? `${new Date(artist.pickupAt).toLocaleString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}${artist.pickupLocation ? ` • ${artist.pickupLocation}` : ""}`
                : artist?.pickupLocation || "—"}
            </div>
          </div>

          <div className="card space-y-2">
            <div className="font-semibold">Contacts (artiste)</div>
            {(artist?.contacts ?? []).length === 0 && <div className="text-sm opacity-70">Aucun contact.</div>}
            <div className="grid gap-2">
              {(artist?.contacts ?? []).map((c) => (
                <div key={c.id} className="rounded bg-white/5 px-3 py-2">
                  <div className="text-sm font-medium">
                    {c.name || "—"} {c.isPrimary && <span className="badge ml-2">Principal</span>}
                  </div>
                  <div className="text-xs opacity-80">
                    {[c.role, c.email, c.phone].filter(Boolean).join(" • ") || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
