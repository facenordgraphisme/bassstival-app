const isServer = typeof window === "undefined";
const PROXY_BASE = "/api/proxy";

/* ===============================
   Generic fetch helper
   =============================== */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const clean = path.replace(/^\/+/, "/");
  const url = `${PROXY_BASE}${clean.startsWith("/") ? "" : "/"}${clean}`;

  // Base headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };

  // ✅ On the server: forward cookies to proxy
  if (isServer) {
    try {
      // Typage propre du dynamic import
      const mod = (await import("next/headers")) as {
        cookies: () => { toString(): string };
      };

      const ck = mod.cookies();
      const cookieStr = ck?.toString?.() ?? "";
      if (cookieStr) {
        // On ajoute le header cookie proprement
        (headers as Record<string, string>).cookie = cookieStr;
      }
    } catch {
      // noop — en cas d’erreur d’import, le proxy rejettera
    }
  }

  const r = await fetch(url, {
    cache: "no-store",
    headers,
    ...init,
  });

  if (!r.ok) {
    let body = "";
    try {
      body = await r.text();
    } catch {
      // ignore
    }
    console.error(
      "[artists.ts] request failed:",
      r.status,
      url,
      body.slice(0, 200)
    );
    throw new Error(`Request failed: ${r.status} ${r.statusText} @ ${url}`);
  }

  return (await r.json()) as T;
}
/* ===============================
   Types
   =============================== */
export type ArtistStatus = "prospect" | "pending" | "confirmed" | "canceled";
export type Stage = "main" | "second";

export type Artist = {
  id: string;
  name: string;
  genre?: string | null;
  agency?: string | null;
  status: ArtistStatus;
  notes?: string | null;
  feeAmount?: number | null;
  feeCurrency?: "EUR";
  hospitalityNotes?: string | null;
  techRider?: string | null;
  travelNotes?: string | null;
  pickupAt?: string | null;
  pickupLocation?: string | null;
  createdAt?: string | null;
};

export type Contact = {
  id: string;
  artistId: string;
  name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
};

export type ArtistWithContacts = Artist & { contacts: Contact[] };

export const ARTIST_STATUS: ArtistStatus[] = ["prospect", "pending", "confirmed", "canceled"];

export const ARTIST_STATUS_LABEL: Record<ArtistStatus, string> = {
  prospect: "Prospect",
  pending: "En discussion",
  confirmed: "Confirmé",
  canceled: "Annulé",
};

/* ===============================
   API
   =============================== */
export async function listArtists(params?: { q?: string; status?: ArtistStatus }) {
  const usp = new URLSearchParams();
  if (params?.q) usp.set("q", params.q);
  if (params?.status) usp.set("status", params.status);
  const qs = usp.toString();
  return request<Artist[]>(`/artists-api/artists${qs ? `?${qs}` : ""}`);
}

export async function createArtist(payload: Partial<Artist>) {
  return request<Artist>(`/artists-api/artists`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateArtist(id: string, patch: Partial<Artist>) {
  return request(`/artists-api/artists/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function getArtist(id: string) {
  return request<ArtistWithContacts>(`/artists-api/artists/${id}`);
}

export async function deleteArtist(id: string) {
  return request(`/artists-api/artists/${id}`, { method: "DELETE" });
}

/* ===============================
   Artist Costs
   =============================== */
export type ArtistCost = {
  id: string;
  artistId: string;
  label: string;
  amount: number; // cents
  currency: "EUR";
  paid: boolean;
  notes?: string | null;
};

export async function listArtistCosts(artistId: string) {
  return request<ArtistCost[]>(`/artists-api/artists/${artistId}/costs`);
}

export async function createArtistCost(artistId: string, payload: Partial<ArtistCost>) {
  return request<ArtistCost>(`/artists-api/artists/${artistId}/costs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateArtistCost(costId: string, patch: Partial<ArtistCost>) {
  // endpoint API: /artists-api/artist-costs/:id
  return request(`/artists-api/artist-costs/${costId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteArtistCost(costId: string) {
  return request(`/artists-api/artist-costs/${costId}`, { method: "DELETE" });
}

/* ===============================
   Contacts
   =============================== */
export async function createContact(artistId: string, payload: Partial<Contact>) {
  return request<Contact>(`/artists-api/artists/${artistId}/contacts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateContact(contactId: string, patch: Partial<Contact>) {
  return request(`/artists-api/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteContact(contactId: string) {
  return request(`/artists-api/contacts/${contactId}`, { method: "DELETE" });
}
