// apps/web/src/lib/users.ts
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

  // ✅ Forward cookies côté serveur, sans import statique et sans `any`
  if (isServer) {
    try {
      type NextHeadersModule = { cookies: () => { toString(): string } };
      const mod = (await import("next/headers")) as unknown as NextHeadersModule;
      const cookieStr = mod?.cookies?.().toString?.() ?? "";
      if (cookieStr) (headers as Record<string, string>).cookie = cookieStr;
    } catch {
      // noop
    }
  }

  const r = await fetch(url, { cache: "no-store", headers, ...init });
  if (!r.ok) {
    let body = "";
    try { body = await r.text(); } catch {}
    console.error("[users.ts] request failed:", r.status, url, body.slice(0, 200));
    throw new Error(`Request failed: ${r.status} ${r.statusText}`);
  }
  return r.json() as Promise<T>;
}

/* ===============================
   Types
   =============================== */
export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
};

/* ===============================
   API
   =============================== */

// Récupérer le profil courant
export function getMe() {
  return request<CurrentUser>("/users-api/me");
}

// PATCH /users-api/me  (actuellement on n’autorise que le "name")
export function patchMe(patch: { name?: string }) {
  return request<{ ok: true }>("/users-api/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// Helper pratique : mettre à jour uniquement le nom
export function updateMyName(name: string) {
  return patchMe({ name });
}

// PATCH /users-api/me/password
export function changeMyPassword(currentPassword: string, newPassword: string) {
  return request<{ ok: true }>("/users-api/me/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
