const BASE = process.env.NEXT_PUBLIC_API_URL!;

export type Loan = { id:string; borrowerName:string; status:"open"|"closed"; openedAt:string; closedAt?:string|null; note?:string|null };
export type LoanItem = { id:string; loanId:string; itemName:string; qtyOut:number; qtyIn:number; status:"open"|"returned"; note?:string|null };

export async function listLoans(status?: "open" | "closed"): Promise<Loan[]> {
  const q = status ? `?status=${status}` : "";
  const r = await fetch(`${BASE}/loans${q}`, { cache: "no-store" });
  if (!r.ok) throw new Error("listLoans failed");
  return r.json();
}

export async function createLoan(payload: { borrowerName: string; note?: string; items?: { itemName: string; qtyOut: number; note?: string }[] }) {
  const r = await fetch(`${BASE}/loans`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error("createLoan failed");
  return r.json();
}

export async function getLoan(id: string) {
  const r = await fetch(`${BASE}/loans/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error("getLoan failed");
  return r.json();
}

export async function addItem(loanId: string, payload: { itemName: string; qtyOut: number; note?: string }) {
  const r = await fetch(`${BASE}/loans/${loanId}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error("addItem failed");
  return r.json();
}

export async function returnItem(loanId: string, itemId: string, qtyIn: number) {
  const r = await fetch(`${BASE}/loans/${loanId}/items/${itemId}/return`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qtyIn }) });
  if (!r.ok) throw new Error("returnItem failed");
  return r.json();
}

export async function forceClose(id: string) {
  const r = await fetch(`${BASE}/loans/${id}/close`, { method: "PATCH" });
  if (!r.ok) throw new Error("forceClose failed");
  return r.json();
}

export async function deleteItem(loanId: string, itemId: string) {
  const r = await fetch(`${BASE}/loans/${loanId}/items/${itemId}`, { method: "DELETE" });
  if (!r.ok) throw new Error("deleteItem failed");
  return r.json();
}

export async function searchLoans(q: string, status?: "open" | "closed") {
  const params = new URLSearchParams({ q });
  if (status) params.set("status", status);
  const r = await fetch(`${BASE}/loans/search?${params.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error("searchLoans failed");
  return r.json();
}
