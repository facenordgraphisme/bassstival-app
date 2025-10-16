// src/lib/bookings.ts
import type { Stage } from "./artists";

const BASE = process.env.NEXT_PUBLIC_API_URL! + "/artists-api";

// ---- Statuts de booking (source unique) ----
export type BookingStatus = "draft" | "confirmed" | "played" | "canceled";

export const BOOKING_STATUS: BookingStatus[] = [
  "draft",
  "confirmed",
  "played",
  "canceled",
];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  draft: "Brouillon",
  confirmed: "Confirmé",
  played: "Joué",
  canceled: "Annulé",
};

// Ajuste si tu crées une classe .badge-blue ; sinon on garde .badge de base
export const BOOKING_STATUS_BADGE: Record<BookingStatus, string> = {
  draft: "badge",
  confirmed: "badge badge-green",
  played: "badge",           // <- pas de .badge-blue dans ton CSS actuel
  canceled: "badge badge-red",
};

// ---- Types ----
export type Booking = {
  id: string;
  artistId: string;
  stage?: Stage | null;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  feeAmount?: number | null;   // cents
  feeCurrency?: "EUR";
  hospitalityNotes?: string | null;
  techRider?: string | null;
  travelNotes?: string | null;
  pickupAt?: string | null;
  pickupLocation?: string | null;
  createdAt?: string | null;
};

// ---- API ----
export async function listBookings(params?: {
  artistId?: string;
  stage?: Stage;
  status?: BookingStatus;
  from?: string;
  to?: string;
}) {
  const usp = new URLSearchParams();
  if (params?.artistId) usp.set("artistId", params.artistId);
  if (params?.stage) usp.set("stage", params.stage);
  if (params?.status) usp.set("status", params.status);
  if (params?.from) usp.set("from", params.from);
  if (params?.to) usp.set("to", params.to);
  const r = await fetch(`${BASE}/bookings${usp.toString() ? `?${usp.toString()}` : ""}`, { cache: "no-store" });
  if (!r.ok) throw new Error("listBookings failed");
  return r.json() as Promise<Booking[]>;
}

export async function createBooking(payload: Partial<Booking>) {
  const r = await fetch(`${BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("createBooking failed");
  return r.json() as Promise<Booking>;
}

export async function getBooking(id: string) {
  const r = await fetch(`${BASE}/bookings/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error("getBooking failed");
  return r.json() as Promise<Booking & { costs: BookingCost[] }>;
}

export async function updateBooking(id: string, patch: Partial<Booking>) {
  const r = await fetch(`${BASE}/bookings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("updateBooking failed");
  return r.json();
}

export async function deleteBooking(id: string) {
  const r = await fetch(`${BASE}/bookings/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("deleteBooking failed");
  return r.json();
}

// ---- Costs ----
export type BookingCost = {
  id: string;
  bookingId: string;
  label: string;
  amount: number;        // cents
  currency: "EUR";
  paid: boolean;
  notes?: string | null;
};

export async function listBookingCosts(bookingId: string) {
  const r = await fetch(`${BASE}/bookings/${bookingId}/costs`, { cache: "no-store" });
  if (!r.ok) throw new Error("listBookingCosts failed");
  return r.json() as Promise<BookingCost[]>;
}

export async function createBookingCost(bookingId: string, payload: Partial<BookingCost>) {
  const r = await fetch(`${BASE}/bookings/${bookingId}/costs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("createBookingCost failed");
  return r.json() as Promise<BookingCost>;
}

export async function updateBookingCost(costId: string, patch: Partial<BookingCost>) {
  // ✅ corrige l’URL (enlève artists-api en double)
  const r = await fetch(`${BASE}/costs/${costId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("updateBookingCost failed");
  return r.json();
}

export async function deleteBookingCost(costId: string) {
  // ✅ corrige l’URL (enlève artists-api en double)
  const r = await fetch(`${BASE}/costs/${costId}`, { method: "DELETE" });
  if (!r.ok) throw new Error("deleteBookingCost failed");
  return r.json();
}
