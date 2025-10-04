import { Router, Request, Response } from "express";
import { db } from "../drizzle/db";
import {
  volunteers,
  shifts,
  assignments,
  checkins,
  teamEnum,
} from "../drizzle/schema";
import {
  and,
  or,
  eq,
  ilike,
  gte,
  lte,
  desc,
  asc,
} from "drizzle-orm";

const router = Router();

/* ============ Types ============ */

type Team = (typeof teamEnum)["enumValues"][number];

type CreateVolunteerBody = {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  team?: Team; // si non fourni => default "autre"
};

type UpdateVolunteerBody = Partial<CreateVolunteerBody>;

type CreateShiftBody = {
  team: Team;
  title: string;
  startAt: string; // ISO
  endAt: string;   // ISO
  capacity?: number;
  location?: string | null;
  notes?: string | null;
};

type UpdateShiftBody = Partial<CreateShiftBody>;

type AssignBody = {
  shiftId: string;
  volunteerId: string;
};

type CheckBody =
  | { action: "in" | "out" | "no_show"; assignmentId: string }
  | { action: "in" | "out" | "no_show"; shiftId: string; volunteerId: string };

/* ============ Helpers ============ */

function parseDate(value: unknown): Date | null {
  try {
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

async function getAssignmentIdFromShiftAndVolunteer(
  shiftId: string,
  volunteerId: string
): Promise<string | null> {
  const row = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.shiftId, shiftId), eq(assignments.volunteerId, volunteerId)))
    .limit(1);
  return row[0]?.id ?? null;
}

/* ============ VOLUNTEERS ============ */

/** Créer un bénévole */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, email, notes, team } =
      (req.body as CreateVolunteerBody) || {};

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "firstName et lastName requis" });
    }

    // Ne jamais écrire null dans team (NOT NULL + default "autre")
    const insertValues: {
      firstName: string;
      lastName: string;
      phone?: string | null;
      email?: string | null;
      notes?: string | null;
      team?: Team; // si omis => default "autre"
    } = {
      firstName,
      lastName,
    };
    if (phone !== undefined) insertValues.phone = phone ?? null;
    if (email !== undefined) insertValues.email = email ?? null;
    if (notes !== undefined) insertValues.notes = notes ?? null;
    if (team !== undefined) insertValues.team = team; // sinon default

    const [v] = await db.insert(volunteers).values(insertValues).returning();
    return res.status(201).json(v);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Lister les bénévoles (+ recherche + filtre team) */
router.get("/", async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    const team = (req.query.team as Team | undefined) || undefined;
    const order = (req.query.order as "asc" | "desc") || "asc";

    const whereParts = [];
    if (q) {
      const pattern = `%${q}%`;
      whereParts.push(
        or(
          ilike(volunteers.firstName, pattern),
          ilike(volunteers.lastName, pattern),
          ilike(volunteers.email, pattern),
          ilike(volunteers.phone, pattern)
        )
      );
    }
    if (team) whereParts.push(eq(volunteers.team, team));

    const where = whereParts.length > 0 ? and(...whereParts) : undefined;

    const rows = await db
      .select()
      .from(volunteers)
      .where(where as any)
      .orderBy(order === "asc" ? asc(volunteers.lastName) : desc(volunteers.lastName));

    return res.json(rows);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Détail bénévole */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id || "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const [v] = await db.select().from(volunteers).where(eq(volunteers.id, id)).limit(1);
    if (!v) return res.status(404).json({ error: "Bénévole introuvable" });
    return res.json(v);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Modifier bénévole */
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id || "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const body = (req.body as UpdateVolunteerBody) || {};

    // Construire un patch propre (ne pas écrire null sur team, et omettre undefined)
    const patch: any = {};
    if (body.firstName !== undefined) patch.firstName = body.firstName;
    if (body.lastName !== undefined) patch.lastName = body.lastName;
    if (body.phone !== undefined) patch.phone = body.phone ?? null;
    if (body.email !== undefined) patch.email = body.email ?? null;
    if (body.notes !== undefined) patch.notes = body.notes ?? null;
    if (body.team !== undefined) patch.team = body.team; // jamais null

    if (Object.keys(patch).length === 0) return res.json({ ok: true });

    await db.update(volunteers).set(patch).where(eq(volunteers.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Supprimer bénévole */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id || "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    await db.delete(volunteers).where(eq(volunteers.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/* ============ SHIFTS ============ */

/** Créer un shift */
router.post("/shifts", async (req: Request, res: Response) => {
  try {
    const body = (req.body as CreateShiftBody) || {};
    const startAt = parseDate(body.startAt);
    const endAt = parseDate(body.endAt);

    if (!body.team) return res.status(400).json({ error: "team requis" });
    if (!body.title) return res.status(400).json({ error: "title requis" });
    if (!startAt || !endAt || endAt <= startAt) {
      return res.status(400).json({ error: "startAt/endAt invalides" });
    }

    const [s] = await db
      .insert(shifts)
      .values({
        team: body.team,
        title: body.title,
        startAt,
        endAt,
        capacity: typeof body.capacity === "number" ? body.capacity : 1,
        location: body.location ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    return res.status(201).json(s);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Lister les shifts (filtres team/période) */
router.get("/shifts", async (req: Request, res: Response) => {
  try {
    const team = (req.query.team as Team | undefined) || undefined;
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    const whereParts = [];
    if (team) whereParts.push(eq(shifts.team, team));
    if (from) whereParts.push(gte(shifts.startAt, from));
    if (to) whereParts.push(lte(shifts.endAt, to));

    const where = whereParts.length > 0 ? and(...whereParts) : undefined;

    const rows = await db
      .select()
      .from(shifts)
      .where(where as any)
      .orderBy(asc(shifts.startAt));

    return res.json(rows);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Détail shift */
router.get("/shifts/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id || "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const [s] = await db.select().from(shifts).where(eq(shifts.id, id)).limit(1);
    if (!s) return res.status(404).json({ error: "Shift introuvable" });
    return res.json(s);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Modifier shift */
router.patch("/shifts/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id || "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const body = (req.body as UpdateShiftBody) || {};
    const patch: any = {};

    if (body.team !== undefined) patch.team = body.team;
    if (body.title !== undefined) patch.title = body.title;
    if (body.capacity !== undefined) patch.capacity = body.capacity;
    if (body.location !== undefined) patch.location = body.location ?? null;
    if (body.notes !== undefined) patch.notes = body.notes ?? null;

    if (typeof body.startAt === "string") {
      const d = parseDate(body.startAt);
      if (!d) return res.status(400).json({ error: "startAt invalide" });
      patch.startAt = d;
    }
    if (typeof body.endAt === "string") {
      const d = parseDate(body.endAt);
      if (!d) return res.status(400).json({ error: "endAt invalide" });
      patch.endAt = d;
    }

    if (Object.keys(patch).length === 0) return res.json({ ok: true });

    await db.update(shifts).set(patch).where(eq(shifts.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Supprimer shift */
router.delete("/shifts/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id || "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    await db.delete(shifts).where(eq(shifts.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/* ============ ASSIGNMENTS ============ */

/** Assigner un bénévole à un shift */
router.post("/assignments", async (req: Request, res: Response) => {
  try {
    const { shiftId, volunteerId } = (req.body as AssignBody) || {};
    if (!shiftId || !volunteerId) {
      return res.status(400).json({ error: "shiftId et volunteerId requis" });
    }

    try {
      const [a] = await db
        .insert(assignments)
        .values({ shiftId, volunteerId })
        .returning();

      return res.status(201).json(a);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("uq_assignment")) {
        return res.status(409).json({ error: "Déjà assigné à ce shift" });
      }
      throw err;
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Lister les assignments (filtre par shiftId / volunteerId) */
router.get("/assignments", async (req: Request, res: Response) => {
  try {
    const shiftId = (req.query.shiftId as string | undefined) || undefined;
    const volunteerId = (req.query.volunteerId as string | undefined) || undefined;

    const whereParts = [];
    if (shiftId) whereParts.push(eq(assignments.shiftId, shiftId));
    if (volunteerId) whereParts.push(eq(assignments.volunteerId, volunteerId));
    const where = whereParts.length > 0 ? and(...whereParts) : undefined;

    const rows = await db
      .select()
      .from(assignments)
      .where(where as any)
      .orderBy(desc(assignments.assignedAt));

    return res.json(rows);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Désassigner (par id d’affectation) */
router.delete("/assignments/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id || "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    await db.delete(assignments).where(eq(assignments.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/* ============ CHECK-INS (pointage) ============ */

/**
 * Pointer un bénévole (in / out / no_show)
 * - Accepte soit { assignmentId }, soit { shiftId, volunteerId } et résout l'affectation.
 */
router.post("/checkins", async (req: Request, res: Response) => {
  try {
    const body = (req.body as CheckBody) || {};
    if (!("action" in body) || !body.action) {
      return res.status(400).json({ error: "action requis" });
    }

    let assignmentId: string | null = null;

    if ("assignmentId" in body && body.assignmentId) {
      assignmentId = body.assignmentId;
    } else if ("shiftId" in body && "volunteerId" in body && body.shiftId && body.volunteerId) {
      assignmentId = await getAssignmentIdFromShiftAndVolunteer(body.shiftId, body.volunteerId);
      if (!assignmentId) {
        return res.status(404).json({ error: "Affectation introuvable (shiftId/volunteerId)" });
      }
    } else {
      return res.status(400).json({ error: "assignmentId ou (shiftId+volunteerId) requis" });
    }

    if (body.action === "in") {
      const [row] = await db
        .insert(checkins)
        .values({
          assignmentId,
          checkinAt: new Date(),
          status: "in",
        })
        .onConflictDoUpdate({
          target: [checkins.assignmentId],
          set: { checkinAt: new Date(), status: "in" },
        })
        .returning();
      return res.json(row);
    }

    if (body.action === "out") {
      const [row] = await db
        .update(checkins)
        .set({ checkoutAt: new Date(), status: "done" })
        .where(eq(checkins.assignmentId, assignmentId))
        .returning();
      return res.json(row ?? { ok: true });
    }

    if (body.action === "no_show") {
      const [row] = await db
        .insert(checkins)
        .values({
          assignmentId,
          status: "no_show",
        })
        .onConflictDoUpdate({
          target: [checkins.assignmentId],
          set: { status: "no_show" },
        })
        .returning();
      return res.json(row);
    }

    return res.status(400).json({ error: "action invalide" });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/* ============ EXPORT CSV (planning) ============ */
/**
 * GET /volunteers/export/csv?from=...&to=...&team=bar
 * Colonnes : shiftId;team;title;startAt;endAt;capacity;location;volunteerId;fullName;email;phone
 */
router.get("/export/csv", async (req: Request, res: Response) => {
  try {
    const team = (req.query.team as Team | undefined) || undefined;
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    const whereParts = [];
    if (team) whereParts.push(eq(shifts.team, team));
    if (from) whereParts.push(gte(shifts.startAt, from));
    if (to) whereParts.push(lte(shifts.endAt, to));
    const where = whereParts.length ? and(...whereParts) : undefined;

    const rows = await db
      .select({
        shiftId: shifts.id,
        team: shifts.team,
        title: shifts.title,
        startAt: shifts.startAt,
        endAt: shifts.endAt,
        capacity: shifts.capacity,
        location: shifts.location,
        volunteerId: volunteers.id,
        firstName: volunteers.firstName,
        lastName: volunteers.lastName,
        email: volunteers.email,
        phone: volunteers.phone,
      })
      .from(shifts)
      .leftJoin(assignments, eq(assignments.shiftId, shifts.id))
      .leftJoin(volunteers, eq(assignments.volunteerId, volunteers.id))
      .where(where as any)
      .orderBy(asc(shifts.startAt));

    const header = [
      "shiftId",
      "team",
      "title",
      "startAt",
      "endAt",
      "capacity",
      "location",
      "volunteerId",
      "fullName",
      "email",
      "phone",
    ];

    const safe = (v: unknown) => String(v ?? "").split(";").join(",");

    const csv = [
      header.join(";"),
      ...rows.map((r) =>
        [
          r.shiftId,
          r.team ?? "",
          r.title ?? "",
          r.startAt?.toISOString() ?? "",
          r.endAt?.toISOString() ?? "",
          r.capacity ?? "",
          r.location ?? "",
          r.volunteerId ?? "",
          [r.firstName, r.lastName].filter(Boolean).join(" "),
          r.email ?? "",
          r.phone ?? "",
        ].map(safe).join(";")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="planning.csv"`);
    return res.send(csv);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

export default router;
