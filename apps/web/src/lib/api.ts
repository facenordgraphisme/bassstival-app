const BASE = process.env.NEXT_PUBLIC_API_URL!;

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
  const r = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!r.ok) {
    // tu peux améliorer le message si besoin
    throw new Error(`Request failed: ${r.status} ${r.statusText}`);
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

export function returnItem(
  loanId: string,
  itemId: string,
  qtyIn: number
): Promise<LoanItem> {
  // adapte le type si ton API renvoie autre chose
  return request<LoanItem>(`/loans/${loanId}/items/${itemId}/return`, {
    method: "PATCH",
    body: JSON.stringify({ qtyIn }),
  });
}

export function forceClose(id: string): Promise<Loan> {
  return request<Loan>(`/loans/${id}/close`, { method: "PATCH" });
}

export function deleteItem(loanId: string, itemId: string): Promise<{ ok: true }> {
  // adapte si besoin
  return request<{ ok: true }>(`/loans/${loanId}/items/${itemId}`, {
    method: "DELETE",
  });
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
