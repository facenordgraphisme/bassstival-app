// src/lib/artists.ts
const BASE = process.env.NEXT_PUBLIC_API_URL! + "/artists-api";

export type ArtistStatus = "prospect" | "pending" | "confirmed" | "canceled";
export type Stage = "main" | "second" ;

export type Artist = {
  id: string;
  name: string;
  genre?: string | null;
  agency?: string | null;
  status: ArtistStatus;
  notes?: string | null;
  feeAmount?: number | null;
  feeCurrency?: "EUR";
  hospitalityNotes?: string | null;
  techRider?: string | null;
  travelNotes?: string | null;
  pickupAt?: string | null;
  pickupLocation?: string | null;
  createdAt?: string | null;
};

export type Contact = {
  id: string;
  artistId: string;
  name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
};

export async function listArtists(params?: { q?: string; status?: ArtistStatus }) {
  const usp = new URLSearchParams();
  if (params?.q) usp.set("q", params.q);
  if (params?.status) usp.set("status", params.status);
  const r = await fetch(`${BASE}/artists${usp.toString() ? `?${usp.toString()}` : ""}`, { cache: "no-store" });
  if (!r.ok) throw new Error("listArtists failed");
  return r.json() as Promise<Artist[]>;
}

export async function createArtist(payload: Partial<Artist>) {
  const r = await fetch(`${BASE}/artists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("createArtist failed");
  return r.json() as Promise<Artist>;
}

export async function updateArtist(id: string, patch: Partial<Artist>) {
  const r = await fetch(`${BASE}/artists/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("updateArtist failed");
  return r.json();
}

export const ARTIST_STATUS: ArtistStatus[] = ["prospect", "pending", "confirmed", "canceled"];

export const ARTIST_STATUS_LABEL: Record<ArtistStatus, string> = {
  prospect: "Prospect",
  pending: "En discussion",
  confirmed: "Confirmé",
  canceled: "Annulé",
};

export type ArtistWithContacts = Artist & { contacts: Contact[] };

export async function getArtist(id: string) {
  const r = await fetch(`${BASE}/artists/${id}`, { cache: "no-store" });
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(`getArtist failed (${r.status}): ${msg || r.statusText}`);
  }
  return r.json() as Promise<ArtistWithContacts>;
}

// ---- Coûts artiste ----
export type ArtistCost = {
  id: string;
  artistId: string;
  label: string;
  amount: number; // cents
  currency: "EUR";
  paid: boolean;
  notes?: string | null;
};

export async function listArtistCosts(artistId: string) {
  const r = await fetch(`${BASE}/artists/${artistId}/costs`, { cache: "no-store" });
  if (!r.ok) throw new Error("listArtistCosts failed");
  return r.json() as Promise<ArtistCost[]>;
}

export async function createArtistCost(artistId: string, payload: Partial<ArtistCost>) {
  const r = await fetch(`${BASE}/artists/${artistId}/costs`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("createArtistCost failed");
  return r.json() as Promise<ArtistCost>;
}

export async function updateArtistCost(costId: string, patch: Partial<ArtistCost>) {
  const r = await fetch(`${BASE}/artist-costs/${costId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("updateArtistCost failed");
  return r.json();
}

export async function deleteArtistCost(costId: string) {
  const r = await fetch(`${BASE}/artist-costs/${costId}`, { method: "DELETE" });
  if (!r.ok) throw new Error("deleteArtistCost failed");
  return r.json();
}
// --- contacts ---
export async function createContact(artistId: string, payload: Partial<Contact>) {
  const r = await fetch(`${BASE}/artists/${artistId}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("createContact failed");
  return r.json() as Promise<Contact>;
}

export async function updateContact(contactId: string, patch: Partial<Contact>) {
  const r = await fetch(`${BASE}/contacts/${contactId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("updateContact failed");
  return r.json();
}

export async function deleteContact(contactId: string) {
  const r = await fetch(`${BASE}/contacts/${contactId}`, { method: "DELETE" });
  if (!r.ok) throw new Error("deleteContact failed");
  return r.json();
}

export async function deleteArtist(id: string) {
  const r = await fetch(`${BASE}/artists/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("deleteArtist failed");
  return r.json();
}