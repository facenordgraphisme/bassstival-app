"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
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
import type { Stage } from "@/lib/artists";
import { getArtist, type ArtistWithContacts } from "@/lib/artists";
import BackButton from "@/components/BackButton";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Erreur";
}

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function BookingDetailsClient({
  initial,
  initialArtist,
}: {
  initial: Booking & { costs: BookingCost[] };
  initialArtist?: ArtistWithContacts | null;
}) {
  const bookingId = initial.id;
  const artistId = initial.artistId;

  const [tab, setTab] =
    useState<"timing" | "log" | "finance" | "artist">("timing");

  // ---- ARTISTE (source de vérité pour log & cachet)
  const {
    data: artist,
    error: artistError,
    isLoading: artistLoading,
  } = useSWR<ArtistWithContacts>(
    artistId ? ["booking-artist", artistId] : null, // pas d'appel si pas d'ID
    () => getArtist(artistId),
    { revalidateOnFocus: false, fallbackData: initialArtist ?? undefined }
  );

  // (petit bandeau debug facultatif)
  const Debug =
    process.env.NODE_ENV !== "production" ? (
      <div className="text-xs opacity-60">
        bookingId={bookingId} • artistId={artistId || "—"} • artistLoading=
        {String(artistLoading)} • artistError={artistError?.message || "—"}
      </div>
    ) : null;

  // ---- COÛTS booking
  const { data: costs, mutate: mutateCosts } = useSWR<BookingCost[]>(
    ["booking-costs", bookingId],
    () => listBookingCosts(bookingId),
    { fallbackData: initial.costs }
  );

  // ---- TIMING
  const [formTiming, setFormTiming] = useState<{
  stage: Stage;
  status: BookingStatus;
  startAt: string;
  endAt: string;
}>({
  stage: (initial.stage ?? "main") as Stage,
  status: initial.status,
  startAt: toLocalInput(initial.startAt),
  endAt: toLocalInput(initial.endAt),
});

const saveTiming = async () => {
  const t = toast.loading("Sauvegarde…");
  try {
    await updateBooking(bookingId, {
      stage: formTiming.stage,
      status: formTiming.status,
      startAt: formTiming.startAt ? new Date(formTiming.startAt).toISOString() : undefined,
      endAt: formTiming.endAt ? new Date(formTiming.endAt).toISOString() : undefined,
    });
    toast.success("Timing mis à jour", { id: t });
  } catch (e) {
    toast.error(errMsg(e), { id: t });
  }
};

  // ---- COÛTS booking (create/toggle/delete)
  const [newCost, setNewCost] = useState({ label: "", amount: "" });
  const addCost = async () => {
    if (!newCost.label || !newCost.amount) return;
    const cents = Math.round((Number(newCost.amount.replace(",", ".")) || 0) * 100);
    const t = toast.loading("Ajout…");
    try {
      await createBookingCost(bookingId, {
        label: newCost.label,
        amount: cents,
        currency: "EUR",
        paid: false,
      });
      setNewCost({ label: "", amount: "" });
      toast.success("Coût ajouté", { id: t });
      mutateCosts();
    } catch (e) {
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
        {artist ? (
        <div className="text-center space-y-2 mt-4">
          <div className="flex items-center gap-3">
            <BackButton className="!px-2.5 !py-1.5 mt-2 mr-2" />
            <h1 className="lg:text-3xl text-xl font-extrabold title-underline"
          style={{ fontFamily: "var(--font-title)" }}>
              {artist.name}
            </h1>
          </div>
          <div className="flex justify-center items-center gap-2 text-sm text-white/70 pt-2">
            {artist.genre && <span>{artist.genre}</span>}
            {artist.agency && <span>• {artist.agency}</span>}
            <span
              className={`badge ${
                artist.status === "confirmed"
                  ? "badge-green"
                  : artist.status === "pending"
                  ? "badge-yellow"
                  : artist.status === "canceled"
                  ? "badge-red"
                  : ""
              }`}
            >
              {artist.status === "confirmed"
                ? "Confirmé"
                : artist.status === "pending"
                ? "En discussion"
                : artist.status === "canceled"
                ? "Annulé"
                : "Prospect"}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center text-sm opacity-70">Chargement de l’artiste…</div>
      )}
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
          <Link href="/bookings/planning" className="btn-ghost">Voir planning</Link>
        </div>
      </div>
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
        placeholder="Début"
      />
      <input
        className="input"
        type="datetime-local"
        value={formTiming.endAt}
        onChange={(e) => setFormTiming((f) => ({ ...f, endAt: e.target.value }))}
        placeholder="Fin"
      />
    </div>
    <div className="flex justify-end">
      <button className="btn" onClick={saveTiming}>
        Enregistrer
      </button>
    </div>
  </div>
)}

      {/* LOGISTIQUE (lecture seule depuis l’artiste) */}
      {tab === "log" && (
        <div className="card space-y-3">
          {!artist ? (
            <div className="text-sm opacity-70">
              {artistError ? `Erreur chargement artiste: ${artistError.message}` : "Chargement de l’artiste…"}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs opacity-70 mb-1 block">Hébergement, défrayement…</label>
                  <div className="input min-h-24 whitespace-pre-wrap">{artist.hospitalityNotes || "—"}</div>
                </div>
                <div>
                  <label className="text-xs opacity-70 mb-1 block">Personne gérant la prise en charge</label>
                  <div className="input min-h-24 whitespace-pre-wrap">{artist.techRider || "—"}</div>
                </div>
                <div>
                  <label className="text-xs opacity-70 mb-1 block">Voyage / transport</label>
                  <div className="input min-h-24 whitespace-pre-wrap">{artist.travelNotes || "—"}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs opacity-70 mb-1 block">Date / heure de pickup</label>
                    <div className="input">{artist.pickupAt ? artist.pickupAt.slice(0, 16) : "—"}</div>
                  </div>
                  <div>
                    <label className="text-xs opacity-70 mb-1 block">Lieu de récupération</label>
                    <div className="input">{artist.pickupLocation || "—"}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs opacity-70">
                <span>Informations générales</span>
                <Link href={`/artists/${artist.id}`} className="btn btn-sm">Modifier sur la fiche artiste</Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* FINANCES — cachet depuis l’artiste + coûts du booking */}
      {tab === "finance" && (
        <div className="space-y-4">
          <div className="card space-y-2">
            {!artist ? (
              <div className="text-sm opacity-70">
                {artistError ? `Erreur chargement artiste: ${artistError.message}` : "Chargement de l’artiste…"}
              </div>
            ) : (
              <>
                <div className="font-semibold text-lg mb-1">Cachet artiste</div>
                <div className="text-sm opacity-80">
                  {(artist?.feeAmount ?? 0) > 0 ? `${((artist.feeAmount ?? 0) / 100).toFixed(2)} €` : "—"}
                </div>
                <div className="flex justify-end">
                  <Link href={`/artists/${artist.id}`} className="btn-ghost">Modifier sur la fiche artiste</Link>
                </div>
              </>
            )}
          </div>

          {/* Coûts du booking */}
          <div className="card space-y-3">
            <div className="font-semibold">Autres coûts (spécifiques au booking)</div>
            <div className="grid gap-2">
              {(costs ?? []).length === 0 && <div className="text-sm opacity-70">Aucun coût pour ce booking.</div>}
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
                    <button className="btn-ghost" onClick={() => delCost(c)}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-2">
              <input className="input" placeholder="Libellé"
                value={newCost.label} onChange={(e) => setNewCost((s) => ({ ...s, label: e.target.value }))} />
              <input className="input" placeholder="Montant (EUR)"
                value={newCost.amount} onChange={(e) => setNewCost((s) => ({ ...s, amount: e.target.value }))} />
              <button className="btn" onClick={addCost}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* ARTISTE — résumé */}
      {tab === "artist" && (
        <div className="space-y-4">
          {!artist ? (
            <div className="text-sm opacity-70">
              {artistError ? `Erreur chargement artiste: ${artistError.message}` : "Chargement…"}
            </div>
          ) : (
            <>
              <div className="card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-lg">{artist.name}</div>
                  <Link className="btn-ghost" href={`/artists/${artist.id}`}>Ouvrir la fiche artiste</Link>
                </div>
                <div className="text-sm opacity-80">Statut: {artist.status}</div>
                <div className="text-sm opacity-80">Genre: {artist.genre || "—"}</div>
                <div className="text-sm opacity-80">Agence: {artist.agency || "—"}</div>
                <div className="text-sm opacity-80">Notes: {artist.notes || "—"}</div>
              </div>

              <div className="card space-y-2">
                <div className="font-semibold">Contacts</div>
                {(artist.contacts ?? []).length === 0 && (
                  <div className="text-sm opacity-70">Aucun contact.</div>
                )}
                <div className="grid gap-2">
                  {(artist.contacts ?? []).map((c) => (
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
