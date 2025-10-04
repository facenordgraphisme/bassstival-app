const BASE = process.env.NEXT_PUBLIC_API_URL!;

// ---- Volunteers ----
export type Team = "bar" | "billetterie" | "parking" | "bassspatrouille" | "tech" | "autre";

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
