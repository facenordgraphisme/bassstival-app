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
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });


  // Essaie de parser du JSON dans tous les cas (utile pour extraire une erreur lisible)
  const text = await res.text();

  // On garde le résultat en "unknown" pour éviter any
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text; // du texte brut
  }

  if (!res.ok) {
    let msg = `Erreur API (${res.status})`;

    if (typeof parsed === "object" && parsed !== null) {
      const maybe = parsed as { error?: string; message?: string };
      msg = maybe.error || maybe.message || msg;
    } else if (typeof parsed === "string" && parsed.trim()) {
      msg = parsed;
    }

    throw new Error(msg);
  }

  // Ici on fait confiance au type générique T fourni par l'appelant
  return parsed as T;
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
