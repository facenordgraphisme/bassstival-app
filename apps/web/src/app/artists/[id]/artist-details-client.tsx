// app/artists/[id]/artist-details-client.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import {
  type ArtistWithContacts,
  type Contact,
  type ArtistCost,
  type ArtistStatus,
  getArtist,
  updateArtist,
  createContact,
  updateContact,
  deleteContact,
  listArtistCosts,
  createArtistCost,
  updateArtistCost,
  deleteArtistCost,
  deleteArtist,
} from "@/lib/artists";
import type { Booking } from "@/lib/bookings";
import { BOOKING_STATUS_BADGE, BOOKING_STATUS_LABEL } from "@/lib/bookings";
import { STAGE_LABEL } from "@/lib/utils-booking";
import { confirmWithSonner } from "@/components/confirmWithSonner";
import { useRouter } from "next/navigation";

// Petit helper pour respecter no-explicit-any
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Erreur";
}

export default function ArtistDetailsClient({
  initialArtist,
  initialBookings,
}: {
  initialArtist: ArtistWithContacts;
  initialBookings: Booking[];
}) {
  const artistId = initialArtist.id;
  const router = useRouter();

  // Onglets
  const [tab, setTab] = useState<"infos" | "contacts" | "bookings" | "log" | "finance" | "notes">("infos");

  // SWR artiste
  const { data: artist, mutate: mutateArtist } = useSWR<ArtistWithContacts>(
    ["artist", artistId],
    () => getArtist(artistId),
    { fallbackData: initialArtist }
  );
  const a = artist ?? initialArtist;

  // SWR bookings (aperçu)
  const { data: bookings } = useSWR<Booking[]>(
    ["artist-bookings", artistId],
    () =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/artists-api/bookings?artistId=${artistId}`).then((r) => r.json()),
    { fallbackData: initialBookings }
  );

  // ------ INFOS ------
  const [formInfos, setFormInfos] = useState<{
    name: string;
    genre: string;
    agency: string;
    status: ArtistStatus;
  }>({
    name: initialArtist.name,
    genre: initialArtist.genre ?? "",
    agency: initialArtist.agency ?? "",
    status: initialArtist.status,
  });

  const saveInfos = async () => {
    const t = toast.loading("Sauvegarde…");
    try {
      await updateArtist(artistId, {
        name: formInfos.name.trim(),
        genre: formInfos.genre || null,
        agency: formInfos.agency || null,
        status: formInfos.status,
      });
      toast.success("Infos mises à jour", { id: t });
      mutateArtist();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  // ------ LOGISTIQUE (niveau ARTISTE) ------
  const [formLog, setFormLog] = useState({
    hospitalityNotes: initialArtist.hospitalityNotes ?? "",
    techRider: initialArtist.techRider ?? "",
    travelNotes: initialArtist.travelNotes ?? "",
    pickupAt: initialArtist.pickupAt ? initialArtist.pickupAt.slice(0, 16) : "",
    pickupLocation: initialArtist.pickupLocation ?? "",
  });

  const saveLog = async () => {
    const t = toast.loading("Sauvegarde…");
    try {
      await updateArtist(artistId, {
        hospitalityNotes: formLog.hospitalityNotes || null,
        techRider: formLog.techRider || null,
        travelNotes: formLog.travelNotes || null,
        pickupAt: formLog.pickupAt ? new Date(formLog.pickupAt).toISOString() : null,
        pickupLocation: formLog.pickupLocation || null,
      });
      toast.success("Logistique mise à jour", { id: t });
      mutateArtist();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  // ------ FINANCES (niveau ARTISTE) ------
  const [fee, setFee] = useState<string>(
    typeof initialArtist.feeAmount === "number" ? (initialArtist.feeAmount / 100).toFixed(2) : ""
  );

  const saveFee = async () => {
    const cents = Math.round((Number(fee.replace(",", ".")) || 0) * 100);
    const t = toast.loading("Sauvegarde…");
    try {
      await updateArtist(artistId, { feeAmount: cents, feeCurrency: "EUR" });
      toast.success("Cachet mis à jour", { id: t });
      mutateArtist();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  const { data: artistCosts, mutate: mutateArtistCosts } = useSWR<ArtistCost[]>(
    ["artist-costs", artistId],
    () => listArtistCosts(artistId),
    { fallbackData: [] }
  );

  const [newCost, setNewCost] = useState({ label: "", amount: "" });

  const addArtistCost = async () => {
    if (!newCost.label || !newCost.amount) return;
    const cents = Math.round((Number(newCost.amount.replace(",", ".")) || 0) * 100);
    const t = toast.loading("Ajout…");
    try {
      await createArtistCost(artistId, { label: newCost.label, amount: cents, currency: "EUR", paid: false });
      setNewCost({ label: "", amount: "" });
      toast.success("Coût ajouté", { id: t });
      mutateArtistCosts();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  const toggleArtistCostPaid = async (c: ArtistCost) => {
    await updateArtistCost(c.id, { paid: !c.paid });
    mutateArtistCosts();
  };

  const delArtistCost = async (c: ArtistCost) => {
    await deleteArtistCost(c.id);
    mutateArtistCosts();
  };

  // ------ NOTES ------
  const [notes, setNotes] = useState<string>(initialArtist.notes ?? "");
  const saveNotes = async () => {
    const t = toast.loading("Sauvegarde…");
    try {
      await updateArtist(artistId, { notes: notes || null });
      toast.success("Notes enregistrées", { id: t });
      mutateArtist();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  // ------ CONTACTS ------
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    name: "",
    role: "",
    email: "",
    phone: "",
    isPrimary: false,
  });

  const addContact = async () => {
    if (!newContact.name && !newContact.email && !newContact.phone) {
      toast.error("Renseigne au moins un nom, email ou téléphone");
      return;
    }
    const t = toast.loading("Ajout contact…");
    try {
      await createContact(artistId, newContact);
      toast.success("Contact ajouté", { id: t });
      setNewContact({ name: "", role: "", email: "", phone: "", isPrimary: false });
      mutateArtist();
    } catch (e: unknown) {
      toast.error(errMsg(e), { id: t });
    }
  };

  const updateC = async (c: Contact, patch: Partial<Contact>) => {
    await updateContact(c.id, patch);
    mutateArtist();
  };

  const removeC = async (c: Contact) => {
    await deleteContact(c.id);
    mutateArtist();
  };

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-2">
        <button className={`btn-ghost ${tab === "infos" ? "!text-white" : ""}`} onClick={() => setTab("infos")}>
          Infos
        </button>
        <button className={`btn-ghost ${tab === "log" ? "!text-white" : ""}`} onClick={() => setTab("log")}>
          Logistique
        </button>
        <button className={`btn-ghost ${tab === "finance" ? "!text-white" : ""}`} onClick={() => setTab("finance")}>
          Finances
        </button>
        <button className={`btn-ghost ${tab === "contacts" ? "!text-white" : ""}`} onClick={() => setTab("contacts")}>
          Contacts
        </button>
        <button className={`btn-ghost ${tab === "bookings" ? "!text-white" : ""}`} onClick={() => setTab("bookings")}>
          Bookings
        </button>
        <button className={`btn-ghost ${tab === "notes" ? "!text-white" : ""}`} onClick={() => setTab("notes")}>
          Notes
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Link className="btn-ghost" href={`/bookings?artistId=${artistId}`}>Nouveau booking</Link>

          <button
            className="btn-ghost text-red-400 hover:text-red-300"
            onClick={async () => {
              const ok = await confirmWithSonner(
                `Supprimer “${a.name}” ?`,
                "Cette action est définitive. Les contacts, coûts et bookings liés seront également supprimés."
              );
              if (!ok) return;

              await toast.promise(
                deleteArtist(artistId),
                {
                  loading: "Suppression…",
                  success: "Artiste supprimé",
                  error: "Erreur lors de la suppression",
                }
              );
              router.push("/artists");
            }}
          >
            Supprimer l’artiste
          </button>
        </div>
      </div>

      {/* INFOS */}
      {tab === "infos" && (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <input
              className="input"
              placeholder="Nom"
              value={formInfos.name}
              onChange={(e) => setFormInfos((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Genre"
              value={formInfos.genre}
              onChange={(e) => setFormInfos((f) => ({ ...f, genre: e.target.value }))}
            />
            <input
              className="input"
              placeholder="Agence / Label"
              value={formInfos.agency}
              onChange={(e) => setFormInfos((f) => ({ ...f, agency: e.target.value }))}
            />
            <select
              className="input"
              value={formInfos.status}
              onChange={(e) => setFormInfos((f) => ({ ...f, status: e.target.value as ArtistStatus }))}
            >
              <option value="prospect">Prospect</option>
              <option value="pending">En discussion</option>
              <option value="confirmed">Confirmé</option>
              <option value="canceled">Annulé</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={saveInfos}>
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* LOGISTIQUE */}
      {tab === "log" && (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <textarea
              className="input h-24"
              placeholder="Hébergement, déffraiment..."
              value={formLog.hospitalityNotes}
              onChange={(e) => setFormLog((f) => ({ ...f, hospitalityNotes: e.target.value }))}
            />
            <textarea
              className="input h-24"
              placeholder="Personne gérant la prise en charge"
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
          <div className="flex items-center justify-between text-xs opacity-70">
            <span>Informations générales</span>
            <button className="btn btn-sm" onClick={saveLog}>
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* FINANCES */}
      {tab === "finance" && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs opacity-70 mb-1 block">Cachet (EUR)</label>
                <input className="input" placeholder="0,00" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
              <button className="btn" onClick={saveFee}>
                Enregistrer cachet
              </button>
            </div>
          </div>

          <div className="card space-y-3">
            <div className="font-semibold">Autres coûts (artiste)</div>
            <div className="grid gap-2">
              {(artistCosts ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                  <div className="text-sm">
                    <div className="font-medium">{c.label}</div>
                    <div className="text-xs opacity-70">{(c.amount / 100).toFixed(2)} €</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className={`badge ${c.paid ? "badge-green" : ""}`} onClick={() => toggleArtistCostPaid(c)}>
                      {c.paid ? "Payé" : "À payer"}
                    </button>
                    <button className="btn-ghost" onClick={() => delArtistCost(c)}>
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
              <button className="btn" onClick={addArtistCost}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTACTS */}
      {tab === "contacts" && (
        <div className="space-y-4">
          {/* Ajout */}
          <div className="card space-y-3">
            <div className="font-semibold">Ajouter un contact</div>
            <div className="grid md:grid-cols-5 gap-2">
              <input
                className="input"
                placeholder="Nom"
                value={newContact.name ?? ""}
                onChange={(e) => setNewContact((s) => ({ ...s, name: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Rôle (manager, agent…)"
                value={newContact.role ?? ""}
                onChange={(e) => setNewContact((s) => ({ ...s, role: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Email"
                value={newContact.email ?? ""}
                onChange={(e) => setNewContact((s) => ({ ...s, email: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Téléphone"
                value={newContact.phone ?? ""}
                onChange={(e) => setNewContact((s) => ({ ...s, phone: e.target.value }))}
              />
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!newContact.isPrimary}
                  onChange={(e) => setNewContact((s) => ({ ...s, isPrimary: e.target.checked }))}
                />
                Principal ?
              </label>
            </div>
            <div className="flex justify-end">
              <button className="btn" onClick={addContact}>
                Ajouter
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="space-y-2">
            {(a.contacts ?? []).length === 0 && <div className="text-sm opacity-70">Aucun contact.</div>}
            {(a.contacts ?? []).map((c) => (
              <div key={c.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <div className="font-medium">
                    {c.name || "—"} {c.isPrimary && <span className="badge ml-2">Principal</span>}
                  </div>
                  <div className="opacity-80">{[c.role, c.email, c.phone].filter(Boolean).join(" • ") || "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost" onClick={() => updateC(c, { isPrimary: !c.isPrimary })}>
                    {c.isPrimary ? "Retirer principal" : "Définir principal"}
                  </button>
                  <button className="btn-ghost" onClick={() => removeC(c)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOOKINGS (aperçu) */}
      {tab === "bookings" && (
        <div className="space-y-2">
          {(bookings ?? []).length === 0 && <div className="text-sm opacity-70">Aucun booking pour cet artiste.</div>}
          {(bookings ?? []).map((b) => (
            <Link key={b.id} href={`/bookings/${b.id}`} className="card neon block p-3 hover:scale-[1.01] transition">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  {STAGE_LABEL[b.stage ?? "main"]} •{" "}
                  {new Date(b.startAt).toLocaleString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                  {" → "}
                  {new Date(b.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <span className={BOOKING_STATUS_BADGE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* NOTES */}
      {tab === "notes" && (
        <div className="card space-y-3">
          <textarea
            className="input h-40"
            placeholder="Notes / exigences particulières, liens, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end">
            <button className="btn" onClick={saveNotes}>
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
