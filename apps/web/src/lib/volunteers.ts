const BASE = process.env.NEXT_PUBLIC_API_URL!;

// ---- Bénévoles ----
export type Team = "bar" | "billetterie" | "parking" | "bassspatrouille" | "tech" | "autre";

// --- Check-in ---
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
  startAt: string;      // ISO
  endAt: string;        // ISO
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
  status: "pending" | "in" | "done" | "no_show";
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

export async function listVolunteers(params?: { q?: string; team?: Team; order?: "asc" | "desc" }) {
  const usp = new URLSearchParams();
  if (params?.q) usp.set("q", params.q);
  if (params?.team) usp.set("team", params.team);
  if (params?.order) usp.set("order", params.order);
  const r = await fetch(`${BASE}/volunteers?${usp.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error("listVolunteers failed");
  return r.json() as Promise<Volunteer[]>;
}

export async function createVolunteer(payload: {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  team?: Team;
}) {
  const r = await fetch(`${BASE}/volunteers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("createVolunteer failed");
  return r.json() as Promise<Volunteer>;
}

export async function updateVolunteer(id: string, patch: Partial<Omit<Volunteer, "id">>) {
  const r = await fetch(`${BASE}/volunteers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("updateVolunteer failed");
  return r.json();
}

export async function deleteVolunteer(id: string) {
  const r = await fetch(`${BASE}/volunteers/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("deleteVolunteer failed");
  return r.json();
}

// lire les assignations (avec détails bénévoles) pour un shift
export async function getShiftAssignments(shiftId: string): Promise<ShiftAssignments> {
  const r = await fetch(`${BASE}/volunteers/shifts/${shiftId}/assignments`, { cache: "no-store" });
  if (!r.ok) throw new Error("getShiftAssignments failed");
  return r.json();
}

// assigner
export async function assignVolunteer(shiftId: string, volunteerId: string) {
  const r = await fetch(`${BASE}/volunteers/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shiftId, volunteerId }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || "assignVolunteer failed");
  return r.json();
}

// désassigner
export async function unassignVolunteer(assignmentId: string) {
  const r = await fetch(`${BASE}/volunteers/assignments/${assignmentId}`, { method: "DELETE" });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || "unassignVolunteer failed");
  return r.json();
}

// pointer "in"
export async function checkInByAssignment(assignmentId: string) {
  const r = await fetch(`${BASE}/volunteers/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "in", assignmentId }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || "check-in failed");
  return r.json();
}

// pointer "out"
export async function checkOutByAssignment(assignmentId: string) {
  const r = await fetch(`${BASE}/volunteers/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "out", assignmentId }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || "check-out failed");
  return r.json();
}

// marquer no-show
export async function markNoShowByAssignment(assignmentId: string) {
  const r = await fetch(`${BASE}/volunteers/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "no_show", assignmentId }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || "no-show failed");
  return r.json();
}

export async function listMonitoring(params?: { team?: Team; from?: string; to?: string }) {
  const usp = new URLSearchParams();
  if (params?.team) usp.set("team", params.team);
  if (params?.from) usp.set("from", params.from);
  if (params?.to)   usp.set("to",   params.to);
  const r = await fetch(`${BASE}/volunteers/monitoring${usp.toString() ? `?${usp.toString()}` : ""}`, { cache: "no-store" });
  if (!r.ok) throw new Error("listMonitoring failed");
  return r.json() as Promise<MonitoringRow[]>;
}