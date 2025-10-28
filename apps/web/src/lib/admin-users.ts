// src/lib/admin-users.ts
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export const ALL_ROLES = ["admin", "staff", "tools", "volunteers", "lineup"] as const;

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  roles: string[];
};
type UpdateUserInput = {
  name?: string;
  email?: string;
  password?: string;    // optionnel
  roles?: string[];
};

// Helper générique: passe par le proxy Next (/api/proxy/**)
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy/${path}`, {
    // NOTE: pas besoin d’ajouter Authorization ici, le proxy s’en charge
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  // Essaie de parser du JSON dans tous les cas (utile pour extraire une erreur lisible)
  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Erreur API (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

/** -------- CRUD -------- **/

export async function listUsers(): Promise<AdminUser[]> {
  return api<AdminUser[]>("auth/users", { method: "GET" });
}

export async function createUser(payload: CreateUserInput): Promise<AdminUser> {
  return api<AdminUser>("auth/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: string, payload: UpdateUserInput): Promise<AdminUser> {
  return api<AdminUser>(`auth/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: string): Promise<{ ok: true }> {
  return api<{ ok: true }>(`auth/users/${id}`, { method: "DELETE" });
}
