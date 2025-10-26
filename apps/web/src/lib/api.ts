import type { Shift, Team } from "./volunteers";

const BASE = process.env.NEXT_PUBLIC_API_URL!;
if (!BASE || !/^https?:\/\//i.test(BASE)) {
  if (process.env.NODE_ENV !== "production") {
    throw new Error("[lib/api] NEXT_PUBLIC_API_URL invalide: " + String(BASE));
  } else {
    console.error("[lib/api] NEXT_PUBLIC_API_URL invalide:", BASE);
  }
}

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

// --- Helper générique pour typer les fetch ---
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
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
// --- API typée ---
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

// returnItem : le back renvoie { ok, autoClosed }
export function returnItem(
  loanId: string,
  itemId: string,
  qtyIn: number
): Promise<{ ok: true; autoClosed: boolean }> {
  return request<{ ok: true; autoClosed: boolean }>(`/loans/${loanId}/items/${itemId}/return`, {
    method: "PATCH",
    body: JSON.stringify({ qtyIn }),
  });
}

// forceClose : le back renvoie { ok: true }
export function forceClose(id: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/loans/${id}/close`, { method: "PATCH" });
}

export function deleteItem(loanId: string, itemId: string): Promise<{ ok: true }> {
  // adapte si besoin
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

// Pour la recherche: mêmes champs qu’un Loan + matchedItems éventuels
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
export function listShifts(params?: { team?: Team; from?: string; to?: string }): Promise<Shift[]> {
  const sp = new URLSearchParams();
  if (params?.team) sp.set("team", params.team);
  if (params?.from) sp.set("from", params.from);
  if (params?.to)   sp.set("to", params.to);
  const qs = sp.toString();
  return request<Shift[]>(`/volunteers/shifts${qs ? `?${qs}` : ""}`);
}

export async function createShift(payload: {
  team: Team;
  title: string;
  startAt: string;  // ISO
  endAt: string;    // ISO
  capacity?: number;
  location?: string | null;
  notes?: string | null;
}): Promise<Shift> {
  const r = await fetch(`${BASE}/volunteers/shifts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || "createShift failed");
  return r.json();
}

export async function updateShift(id: string, patch: Partial<{
  team: Team;
  title: string;
  startAt: string;  // ISO
  endAt: string;    // ISO
  capacity: number;
  location: string | null;
  notes: string | null;
}>): Promise<{ ok: true }> {
  const r = await fetch(`${BASE}/volunteers/shifts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("updateShift failed");
  return r.json();
}

export async function deleteShift(id: string): Promise<{ ok: true }> {
  const r = await fetch(`${BASE}/volunteers/shifts/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("deleteShift failed");
  return r.json();
}
