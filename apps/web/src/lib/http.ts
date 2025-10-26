// lib/http.ts
export async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
      if (body?.details?.fieldErrors) {
        const fields = Object.entries(body.details.fieldErrors)
          .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
          .join(" | ");
        msg = `${msg} — ${fields}`;
      }
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// lib/normalize.ts
export const toNullable = (v: unknown) => (v === "" || v === undefined ? null : v);
export const toIntOrNull = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
};
export const toISO = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString() : null;
