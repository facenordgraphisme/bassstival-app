// src/lib/api.ts
import type { Shift, Team } from "./volunteers";

const isServer = typeof window === "undefined";

// Prefer a public, deploy-safe origin (set this in .env.local and on Vercel)
const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ||     // e.g. http://localhost:3000 in dev, https://yourapp.vercel.app in prod
  process.env.NEXTAUTH_URL ||            // fallback (already required by next-auth)
  "http://localhost:3000";               // last resort for local dev

// Always go through our proxy (it injects the JWT).
const PROXY_BASE = isServer ? `${APP_ORIGIN}/api/proxy` : "/api/proxy";

// --- Types ---
export type Loan = {
  id: string;
  borrowerName: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string | null;
  note?: string | null;
};

export type LoanItem = {
  id: string;
  loanId: string;
  itemName: string;
  qtyOut: number;
  qtyIn: number;
  status: "open" | "returned";
  note?: string | null;
};

// --- Helper générique pour typer les fetch via proxy ---
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${PROXY_BASE}${path.replace(/^\/+/, "/")}`;
  const r = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  if (!r.ok) {
    let msg = `Request failed: ${r.status} ${r.statusText} @ ${url}`;
    try {
      const body = await r.json();
      if (body?.error) msg += ` – ${body.error}`;
    } catch {}
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

// --- API typée (Loans) ---
export function listLoans(status?: "open" | "closed"): Promise<Loan[]> {
  const q = status ? `?status=${status}` : "";
  return request<Loan[]>(`/loans${q}`);
}

export function createLoan(payload: {
  borrowerName: string;
  note?: string;
  items?: { itemName: string; qtyOut: number; note?: string }[];
}): Promise<{ id: string }> {
  return request<{ id: string }>(`/loans`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getLoan(id: string): Promise<Loan & { items: LoanItem[] }> {
  return request<Loan & { items: LoanItem[] }>(`/loans/${id}`);
}

export function addItem(
  loanId: string,
  payload: { itemName: string; qtyOut: number; note?: string }
): Promise<LoanItem> {
  return request<LoanItem>(`/loans/${loanId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function returnItem(
  loanId: string,
  itemId: string,
  qtyIn: number
): Promise<{ ok: true; autoClosed: boolean }> {
  return request<{ ok: true; autoClosed: boolean }>(
    `/loans/${loanId}/items/${itemId}/return`,
    { method: "PATCH", body: JSON.stringify({ qtyIn }) }
  );
}

export function forceClose(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/loans/${id}/close`, { method: "PATCH" });
}

export function deleteItem(loanId: string, itemId: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/loans/${loanId}/items/${itemId}`, {
    method: "DELETE",
  });
}

export function updateLoan(
  id: string,
  patch: Partial<Pick<Loan, "borrowerName" | "note">>
): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/loans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteLoan(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/loans/${id}`, { method: "DELETE" });
}

export function searchLoans(
  q: string,
  status?: "open" | "closed"
): Promise<(Loan & { matchedItems?: string[] })[]> {
  const params = new URLSearchParams({ q });
  if (status) params.set("status", status);
  return request<(Loan & { matchedItems?: string[] })[]>(
    `/loans/search?${params.toString()}`
  );
}

// --------- SHIFTS (BÉNÉVOLES) ----------
// ✅ Passe aussi par le proxy
export async function listShifts(params?: {
  team?: Team;
  from?: string;
  to?: string;
}): Promise<Shift[]> {
  const sp = new URLSearchParams();
  if (params?.team) sp.set("team", params.team);
  if (params?.from) sp.set("from", params.from);
  if (params?.to) sp.set("to", params.to);
  const qs = sp.toString();
  return request<Shift[]>(`/volunteers/shifts${qs ? `?${qs}` : ""}`);
}

export async function createShift(payload: {
  team: Team;
  title: string;
  startAt: string; // ISO
  endAt: string; // ISO
  capacity?: number;
  location?: string | null;
  notes?: string | null;
}): Promise<Shift> {
  return request<Shift>(`/volunteers/shifts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateShift(
  id: string,
  patch: Partial<{
    team: Team;
    title: string;
    startAt: string;
    endAt: string;
    capacity: number;
    location: string | null;
    notes: string | null;
  }>
): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/volunteers/shifts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteShift(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/volunteers/shifts/${id}`, { method: "DELETE" });
}
