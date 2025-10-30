// src/lib/volunteers.ts
// --> Passe par le proxy Next pour injecter automatiquement le JWT

// ---- Types partagés ----
export type Team = "bar" | "billetterie" | "parking" | "bassspatrouille" | "tech" | "autre";
export type CheckStatus = "pending" | "in" | "done" | "no_show";

export type Volunteer = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  team: Team;
  notes?: string | null;
  createdAt?: string | null;
};

export type Shift = {
  id: string;
  team: Team;
  title: string;
  startAt: string;  // ISO
  endAt: string;    // ISO
  capacity: number;
  location?: string | null;
  notes?: string | null;
  createdAt?: string | null;
};

export type AssignmentRow = {
  assignmentId: string;
  volunteerId: string;
  assignedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  team: Team;
  status: CheckStatus;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

export type ShiftAssignmentRow = {
  assignmentId: string;
  volunteerId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status: CheckStatus;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

export type ShiftAssignments = {
  capacity: number;
  used: number;
  remaining: number;
  assignments: ShiftAssignmentRow[];
};

export type MonitoringRow = {
  id: string;
  team: Team;
  title: string;
  startAt: string;
  endAt: string;
  capacity: number;
  location?: string | null;
  notes?: string | null;

  assigned: number;
  inCount: number;
  doneCount: number;
  noShow: number;
};

// ---------- Proxy helper (même logique que src/lib/api.ts) ----------
const isServer = typeof window === "undefined";
const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

const PROXY_BASE = isServer ? `${APP_ORIGIN}/api/proxy` : "/api/proxy";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${PROXY_BASE}${path.replace(/^\/+/, "/")}`;
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

// ---------- Endpoints Volunteers via proxy ----------
export async function listVolunteers(params?: { q?: string; team?: Team; order?: "asc" | "desc" }) {
  const usp = new URLSearchParams();
  if (params?.q) usp.set("q", params.q);
  if (params?.team) usp.set("team", params.team);
  if (params?.order) usp.set("order", params.order);
  return request<Volunteer[]>(`/volunteers${usp.toString() ? `?${usp.toString()}` : ""}`);
}

export async function createVolunteer(payload: {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  team?: Team;
}) {
  return request<Volunteer>(`/volunteers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateVolunteer(id: string, patch: Partial<Omit<Volunteer, "id">>) {
  return request<Volunteer>(`/volunteers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteVolunteer(id: string) {
  return request<{ ok: true }>(`/volunteers/${id}`, { method: "DELETE" });
}

export async function getShiftAssignments(shiftId: string): Promise<ShiftAssignments> {
  return request<ShiftAssignments>(`/volunteers/shifts/${shiftId}/assignments`);
}

export async function assignVolunteer(shiftId: string, volunteerId: string) {
  return request(`/volunteers/assignments`, {
    method: "POST",
    body: JSON.stringify({ shiftId, volunteerId }),
  });
}

export async function unassignVolunteer(assignmentId: string) {
  return request(`/volunteers/assignments/${assignmentId}`, { method: "DELETE" });
}

export async function checkInByAssignment(assignmentId: string) {
  return request(`/volunteers/checkins`, {
    method: "POST",
    body: JSON.stringify({ action: "in", assignmentId }),
  });
}

export async function checkOutByAssignment(assignmentId: string) {
  return request(`/volunteers/checkins`, {
    method: "POST",
    body: JSON.stringify({ action: "out", assignmentId }),
  });
}

export async function markNoShowByAssignment(assignmentId: string) {
  return request(`/volunteers/checkins`, {
    method: "POST",
    body: JSON.stringify({ action: "no_show", assignmentId }),
  });
}

export async function listMonitoring(params?: { team?: Team; from?: string; to?: string }) {
  const usp = new URLSearchParams();
  if (params?.team) usp.set("team", params.team);
  if (params?.from) usp.set("from", params.from);
  if (params?.to)   usp.set("to",   params.to);
  return request<MonitoringRow[]>(`/volunteers/monitoring${usp.toString() ? `?${usp.toString()}` : ""}`);
}
