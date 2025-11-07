// src/lib/communication.ts
const BASE = "/api/proxy";

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function extractApiError(d: unknown): string | null {
  if (isRecord(d)) {
    const err = d["error"];
    const msg = d["message"];
    if (typeof err === "string" && err.trim()) return err;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (typeof d === "string" && d.trim()) return d;
  return null;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });

  const text = await r.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!r.ok) throw new Error(extractApiError(data) ?? `API ${r.status}`);
  return data as T;
}

/* ===== Types ===== */
export type CommChannel =
  | "instagram_post" | "instagram_story" | "instagram_reel"
  | "facebook_post" | "tiktok" | "linkedin" | "email" | "site_page" | "press";

export type CommStatus = "idea" | "draft" | "approved" | "scheduled" | "published" | "canceled";

export type CommAsset = { kind: "image" | "video"; url: string; alt?: string };

export type CommEvent = {
  id: string;
  title: string;
  channels: CommChannel[];            // ✅ plural
  status: CommStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  body: string | null;
  hashtags: string | null;
  linkUrl: string | null;
  assets: CommAsset[];
  tags: string[] | null;
  extra: Record<string, unknown>;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommPublication = {
  id: string;
  title: string;
  channels: CommChannel[];            // ✅ plural
  body: string;
  hashtags: string | null;
  linkUrl: string | null;
  assets: CommAsset[];
  tags: string[] | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ===== Helpers ===== */
function joinIfAny(arr?: string[] | null) {
  return arr && arr.length ? arr.join(",") : "";
}

/* ===== Events (timeline) ===== */
export const listEvents = (params?: {
  from?: string; to?: string;
  channels?: CommChannel[];            // ✅ plural filter
  status?: CommStatus; tags?: string[];
  includePast?: boolean; q?: string;
}) => {
  const usp = new URLSearchParams();
  if (params?.from) usp.set("from", params.from);
  if (params?.to) usp.set("to", params.to);
  if (params?.channels?.length) usp.set("channels", joinIfAny(params.channels));
  if (params?.status) usp.set("status", params.status);
  if (params?.tags?.length) usp.set("tags", params.tags.join(","));
  if (params?.includePast) usp.set("includePast", "1");
  if (params?.q) usp.set("q", params.q);
  const qs = usp.toString() ? `?${usp.toString()}` : "";
  return api<{ data: CommEvent[] }>(`/communication/events${qs}`);
};

export const createEvent = (p: {
  title: string;
  channels: CommChannel[];             // ✅ plural payload
  status?: CommStatus;
  scheduled_at?: string;
  body?: string; hashtags?: string; link_url?: string;
  assets?: CommAsset[]; tags?: string[];
  extra?: Record<string, unknown>;
}) => api<{ data: CommEvent }>(`/communication/events`, {
  method: "POST", body: JSON.stringify(p),
});

export const patchEvent = (id: string, p: Partial<{
  title: string;
  channels: CommChannel[];             // ✅ plural
  status: CommStatus;
  scheduled_at: string | null;
  body: string | null; hashtags: string | null; link_url: string | null;
  assets: CommAsset[]; tags: string[] | null; extra: Record<string, unknown>;
}>) => api<{ data: CommEvent }>(`/communication/events/${id}`, {
  method: "PATCH", body: JSON.stringify(p),
});

export const removeEvent = (id: string) =>
  api<{ ok: true }>(`/communication/events/${id}`, { method: "DELETE" });

/* ===== Publications (library) ===== */
export const listPublications = (params?: {
  channels?: CommChannel[];            // ✅ plural filter
  tags?: string[]; q?: string;
}) => {
  const usp = new URLSearchParams();
  if (params?.channels?.length) usp.set("channels", joinIfAny(params.channels));
  if (params?.tags?.length) usp.set("tags", params.tags.join(","));
  if (params?.q) usp.set("q", params.q);
  const qs = usp.toString() ? `?${usp.toString()}` : "";
  return api<{ data: CommPublication[] }>(`/communication/publications${qs}`);
};

export const createPublication = (p: {
  title: string;
  channels: CommChannel[];             // ✅ plural payload
  body: string; hashtags?: string; link_url?: string;
  assets?: CommAsset[]; tags?: string[];
}) => api<{ data: CommPublication }>(`/communication/publications`, {
  method: "POST", body: JSON.stringify(p),
});

export const patchPublication = (id: string, p: Partial<{
  title: string;
  channels: CommChannel[];             // ✅ plural
  body: string; hashtags: string | null; link_url: string | null;
  assets: CommAsset[]; tags: string[] | null;
}>) => api<{ data: CommPublication }>(`/communication/publications/${id}`, {
  method: "PATCH", body: JSON.stringify(p),
});

export const removePublication = (id: string) =>
  api<{ ok: true }>(`/communication/publications/${id}`, { method: "DELETE" });

/* ===== Labels ===== */
export const CHANNEL_LABELS: Record<CommChannel, string> = {
  instagram_post: "Instagram (post)",
  instagram_story: "Instagram (story)",
  instagram_reel: "Instagram (reel)",
  facebook_post: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  email: "Email",
  site_page: "Page site",
  press: "Presse",
};

export const STATUS_LABELS: Record<CommStatus, string> = {
  idea: "Idée",
  draft: "Brouillon",
  approved: "Validé",
  scheduled: "Programmé",
  published: "Publié",
  canceled: "Annulé",
};
