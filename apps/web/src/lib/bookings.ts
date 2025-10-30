// src/lib/bookings.ts
import type { Stage } from "./artists";

/* ===============================
   Env & base URL
   =============================== */
const isServer = typeof window === "undefined";
const PROXY_BASE = "/api/proxy";

/* ===============================
   Generic fetch helper
   =============================== */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const clean = path.replace(/^\/+/, "/");
  const url = `${PROXY_BASE}${clean.startsWith("/") ? "" : "/"}${clean}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers || {}),
  };

  // ✅ Forward cookies only on the server via dynamic import
  if (isServer) {
    try {
      const mod: any = await import("next/headers");
      const ck = mod?.cookies?.();
      const cookieStr = ck?.toString?.() || "";
      if (cookieStr) (headers as any).cookie = cookieStr;
    } catch {}
  }

  const r = await fetch(url, {
    cache: "no-store",
    headers,
    ...init,
  });

  if (!r.ok) {
    let body = "";
    try { body = await r.text(); } catch {}
    console.error("[bookings.ts] request failed:", r.status, url, body.slice(0, 200));
    throw new Error(`Request failed: ${r.status} ${r.statusText} @ ${url}`);
  }
  return r.json() as Promise<T>;
}

/* ===============================
   Types + Status
   =============================== */
export type BookingStatus = "draft" | "confirmed" | "played" | "canceled";

export const BOOKING_STATUS: BookingStatus[] = ["draft", "confirmed", "played", "canceled"];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  draft: "Brouillon",
  confirmed: "Confirmé",
  played: "Joué",
  canceled: "Annulé",
};

export const BOOKING_STATUS_BADGE: Record<BookingStatus, string> = {
  draft: "badge",
  confirmed: "badge badge-green",
  played: "badge",
  canceled: "badge badge-red",
};

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

/* ===============================
   API
   =============================== */
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
  const qs = usp.toString();
  return request<Booking[]>(`/artists-api/bookings${qs ? `?${qs}` : ""}`);
}

export async function createBooking(payload: Partial<Booking>) {
  return request<Booking>(`/artists-api/bookings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getBooking(id: string) {
  return request<Booking & { costs: BookingCost[] }>(`/artists-api/bookings/${id}`);
}

export async function updateBooking(id: string, patch: Partial<Booking>) {
  return request(`/artists-api/bookings/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteBooking(id: string) {
  return request(`/artists-api/bookings/${id}`, { method: "DELETE" });
}

/* ===============================
   Costs
   =============================== */
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
  return request<BookingCost[]>(`/artists-api/bookings/${bookingId}/costs`);
}

export async function createBookingCost(bookingId: string, payload: Partial<BookingCost>) {
  return request<BookingCost>(`/artists-api/bookings/${bookingId}/costs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBookingCost(costId: string, patch: Partial<BookingCost>) {
  // endpoint côté API: /artists-api/costs/:id
  return request(`/artists-api/costs/${costId}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteBookingCost(costId: string) {
  return request(`/artists-api/costs/${costId}`, { method: "DELETE" });
}
