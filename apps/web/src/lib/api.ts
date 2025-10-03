// apps/web/src/lib/api.ts

// ↘️ Base URL robuste avec fallback local en dev + safe en prod
const RAW_BASE =
  (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "").replace(/\/+$/, "");

function getBaseUrl() {
  if (RAW_BASE) return RAW_BASE;
  if (process.env.NODE_ENV === "production") {
    // Évite de crasher le rendu serveur : on renvoie une URL invalide, et on catch côté fetch
    return "http://invalid-base-url";
  }
  // Dev local
  return "http://localhost:8000";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${msg || res.statusText} (${url})`);
  }
  return res.json() as Promise<T>;
}

export type Loan = {
  id: string;
  borrowerName: string;
  status: "open" | "closed";
  openedAt: string | null;
  closedAt?: string | null;
  note?: string | null;
  matchedItems?: string[]; // si /loans/search renvoie des items qui matchent
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

export function listLoans(status?: "open" | "closed"): Promise<Loan[]> {
  const q = status ? `?status=${status}` : "";
  return request(`/loans${q}`);
}

export function createLoan(payload: {
  borrowerName: string;
  note?: string;
  items?: { itemName: string; qtyOut: number; note?: string }[];
}) {
  return request(`/loans`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getLoan(id: string) {
  return request(`/loans/${id}`);
}

export function addItem(
  loanId: string,
  payload: { itemName: string; qtyOut: number; note?: string }
) {
  return request(`/loans/${loanId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function returnItem(loanId: string, itemId: string, qtyIn: number) {
  return request(`/loans/${loanId}/items/${itemId}/return`, {
    method: "PATCH",
    body: JSON.stringify({ qtyIn }),
  });
}

export function forceClose(id: string) {
  return request(`/loans/${id}/close`, { method: "PATCH" });
}

export function deleteItem(loanId: string, itemId: string) {
  return request(`/loans/${loanId}/items/${itemId}`, { method: "DELETE" });
}

export function searchLoans(q: string, status?: "open" | "closed") {
  const params = new URLSearchParams({ q });
  if (status) params.set("status", status);
  return request(`/loans/search?${params.toString()}`);
}
