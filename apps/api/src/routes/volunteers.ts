import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../drizzle/db";
import {
  volunteers,
  shifts,
  assignments,
  checkins,
  teamEnum,
} from "../drizzle/schema";
import {
  and, or, eq, ilike, gte, lte, desc, asc, sql
} from "drizzle-orm";
import { validateBody, validateQuery } from "../utils/validate";

const router = Router();

/* ========= Typage enum Team (Drizzle <-> Zod) ========= */
type TeamValue = (typeof teamEnum.enumValues)[number];
const TEAM_VALUES = teamEnum.enumValues as [TeamValue, ...TeamValue[]];
const Team = z.enum(TEAM_VALUES);

/* ========= Schemas ========= */

const zCreateVolunteer = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  team: Team.optional(), // default handled by DB
});
const zPatchVolunteer = zCreateVolunteer.partial();

const zListVolunteersQuery = z.object({
  q: z.string().optional(),
  team: Team.optional(),
  order: z.enum(["asc","desc"]).optional().default("asc"),
});

const zCreateShift = z.object({
  team: Team,
  title: z.string().min(1),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  capacity: z.number().int().positive().optional().default(1),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(b => b.endAt > b.startAt, { message: "endAt must be after startAt" });

const zPatchShift = zCreateShift.partial().refine(b => {
  if (b.startAt && b.endAt) return b.endAt > b.startAt;
  return true;
}, { message: "endAt must be after startAt" });

const zListShiftsQuery = z.object({
  team: Team.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(q => !q.from || !q.to || q.from <= q.to, { message: "from must be <= to" });

const zAssign = z.object({
  shiftId: z.string().uuid(),
  volunteerId: z.string().uuid(),
});

const zCheck = z.union([
  z.object({ action: z.literal("in"), assignmentId: z.string().uuid().optional(), shiftId: z.string().uuid().optional(), volunteerId: z.string().uuid().optional() }),
  z.object({ action: z.literal("out"), assignmentId: z.string().uuid().optional(), shiftId: z.string().uuid().optional(), volunteerId: z.string().uuid().optional() }),
  z.object({ action: z.literal("no_show"), assignmentId: z.string().uuid().optional(), shiftId: z.string().uuid().optional(), volunteerId: z.string().uuid().optional() }),
]).refine(b => !!b.assignmentId || (!!b.shiftId && !!b.volunteerId), {
  message: "Provide assignmentId OR (shiftId + volunteerId)",
});

const zExportCSVQuery = z.object({
  team: Team.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(q => !q.from || !q.to || q.from <= q.to, { message: "from must be <= to" });

/* ========= Helpers ========= */
function parseDate(value: unknown): Date | null {
  try {
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/* ============ VOLUNTEERS ============ */
router.post("/", validateBody(zCreateVolunteer), async (req: Request, res: Response) => {
  try {
    const b = req.validated as z.infer<typeof zCreateVolunteer>;
    const insertValues: any = {
      firstName: b.firstName,
      lastName: b.lastName,
    };
    if (b.phone !== undefined) insertValues.phone = b.phone ?? null;
    if (b.email !== undefined) insertValues.email = b.email ?? null;
    if (b.notes !== undefined) insertValues.notes = b.notes ?? null;
    if (b.team !== undefined) insertValues.team = b.team as TeamValue; // 👈

    const [v] = await db.insert(volunteers).values(insertValues).returning();
    return res.status(201).json(v);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

router.get("/", validateQuery(zListVolunteersQuery), async (req: Request, res: Response) => {
  try {
    const { q = "", team, order } = req.q as z.infer<typeof zListVolunteersQuery>;

    const whereParts: any[] = [];
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
    if (team) whereParts.push(eq(volunteers.team, team as TeamValue)); // 👈

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

/* ============ SHIFTS ============ */
router.post("/shifts", validateBody(zCreateShift), async (req: Request, res: Response) => {
  try {
    const body = req.validated as z.infer<typeof zCreateShift>;
    const [s] = await db
      .insert(shifts)
      .values({
        team: body.team as TeamValue, // 👈
        title: body.title,
        startAt: body.startAt,
        endAt: body.endAt,
        capacity: body.capacity ?? 1,
        location: body.location ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    return res.status(201).json(s);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

router.get("/shifts", validateQuery(zListShiftsQuery), async (req, res) => {
  try {
    const { team, from, to } = req.q as z.infer<typeof zListShiftsQuery>;

    const parts: any[] = [];
    if (team) parts.push(eq(shifts.team, team as TeamValue)); // 👈
    if (from) parts.push(gte(shifts.startAt, from));
    if (to)   parts.push(lte(shifts.endAt, to));

    const base = db.select().from(shifts);

    const rows = await (
      parts.length > 0
        ? base.where(and(...parts)).orderBy(asc(shifts.startAt))
        : base.orderBy(asc(shifts.startAt))
    );

    return res.json(rows);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/* ============ ASSIGNMENTS ============ */
router.post("/assignments", validateBody(zAssign), async (req: Request, res: Response) => {
  try {
    const { shiftId, volunteerId } = req.validated as z.infer<typeof zAssign>;

    const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
    if (!shift) return res.status(404).json({ error: "Shift introuvable" });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignments)
      .where(eq(assignments.shiftId, shiftId));

    if (Number(count) >= shift.capacity) {
      return res.status(409).json({ error: "Capacité du shift atteinte" });
    }

    try {
      const [a] = await db.insert(assignments).values({ shiftId, volunteerId }).returning();
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

router.get("/assignments", async (req: Request, res: Response) => {
  try {
    const shiftId = (req.query.shiftId as string | undefined) || undefined;
    const volunteerId = (req.query.volunteerId as string | undefined) || undefined;

    const whereParts: any[] = [];
    if (shiftId) whereParts.push(eq(assignments.shiftId, shiftId));
    if (volunteerId) whereParts.push(eq(assignments.volunteerId, volunteerId));
    const where = whereParts.length > 0 ? and(...whereParts) : undefined;

    const rows = await db
      .select({
        id: assignments.id,
        assignedAt: assignments.assignedAt,
        shiftId: assignments.shiftId,
        volunteerId: assignments.volunteerId,
        volunteerFirst: volunteers.firstName,
        volunteerLast: volunteers.lastName,
        volunteerTeam: volunteers.team,
        shiftTitle: shifts.title,
        shiftStart: shifts.startAt,
        shiftEnd: shifts.endAt,
        shiftCapacity: shifts.capacity,
      })
      .from(assignments)
      .leftJoin(volunteers, eq(assignments.volunteerId, volunteers.id))
      .leftJoin(shifts, eq(assignments.shiftId, shifts.id))
      .where(where as any)
      .orderBy(desc(assignments.assignedAt));

    return res.json(rows);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

router.post("/checkins", validateBody(zCheck), async (req: Request, res: Response) => {
  try {
    const body = req.validated as z.infer<typeof zCheck>;

    let assignmentId: string | null = body.assignmentId ?? null;
    if (!assignmentId && body.shiftId && body.volunteerId) {
      const row = await db
        .select({ id: assignments.id })
        .from(assignments)
        .where(and(eq(assignments.shiftId, body.shiftId), eq(assignments.volunteerId, body.volunteerId)))
        .limit(1);
      assignmentId = row[0]?.id ?? null;
      if (!assignmentId) {
        return res.status(404).json({ error: "Affectation introuvable (shiftId/volunteerId)" });
      }
    }

    if (body.action === "in") {
      const [row] = await db
        .insert(checkins)
        .values({ assignmentId: assignmentId!, checkinAt: new Date(), status: "in" })
        .onConflictDoUpdate({ target: [checkins.assignmentId], set: { checkinAt: new Date(), status: "in" } })
        .returning();
      return res.json(row);
    }

    if (body.action === "out") {
      const [row] = await db
        .update(checkins)
        .set({ checkoutAt: new Date(), status: "done" })
        .where(eq(checkins.assignmentId, assignmentId!))
        .returning();
      return res.json(row ?? { ok: true });
    }

    if (body.action === "no_show") {
      const [row] = await db
        .insert(checkins)
        .values({ assignmentId: assignmentId!, status: "no_show" })
        .onConflictDoUpdate({ target: [checkins.assignmentId], set: { status: "no_show" } })
        .returning();
      return res.json(row);
    }

    return res.status(400).json({ error: "action invalide" });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/* ============ MONITORING (avec validateQuery) ============ */
router.get("/monitoring", validateQuery(zListShiftsQuery), async (req, res) => {
  try {
    const { team, from, to } = req.q as z.infer<typeof zListShiftsQuery>;

    const filters: any[] = [];
    if (team) filters.push(eq(shifts.team, team as TeamValue)); // 👈

    if (from && to) {
      filters.push(and(gte(shifts.endAt, from), lte(shifts.startAt, to)));
    } else if (from) {
      filters.push(gte(shifts.endAt, from));
    } else if (to) {
      filters.push(lte(shifts.startAt, to));
    }

    const base = db
      .select({
        id:       shifts.id,
        team:     shifts.team,
        title:    shifts.title,
        startAt:  shifts.startAt,
        endAt:    shifts.endAt,
        capacity: shifts.capacity,
        location: shifts.location,
        notes:    shifts.notes,
        assigned:  sql<number>`coalesce(count(distinct ${assignments.id}), 0)`.as("assigned"),
        inCount:   sql<number>`coalesce(sum(case when ${checkins.status} = 'in' then 1 else 0 end), 0)`.as("inCount"),
        doneCount: sql<number>`coalesce(sum(case when ${checkins.status} = 'done' then 1 else 0 end), 0)`.as("doneCount"),
        noShow:    sql<number>`coalesce(sum(case when ${checkins.status} = 'no_show' then 1 else 0 end), 0)`.as("noShow"),
      })
      .from(shifts)
      .leftJoin(assignments, eq(assignments.shiftId, shifts.id))
      .leftJoin(checkins,   eq(checkins.assignmentId, assignments.id));

    const q = filters.length > 0 ? base.where(and(...filters)) : base;
    const rows = await q
      .groupBy(
        shifts.id,
        shifts.team,
        shifts.title,
        shifts.startAt,
        shifts.endAt,
        shifts.capacity,
        shifts.location,
        shifts.notes
      )
      .orderBy(asc(shifts.startAt));

    return res.json(rows);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/* ============ Détails/patch/delete VOLUNTEER (avec Zod) ============ */
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

router.patch("/:id", validateBody(zPatchVolunteer), async (req: Request, res: Response) => {
  try {
    const id = req.params.id || "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const body = req.validated as z.infer<typeof zPatchVolunteer>;
    const patch: any = {};
    if (body.firstName !== undefined) patch.firstName = body.firstName;
    if (body.lastName !== undefined) patch.lastName = body.lastName;
    if (body.phone !== undefined) patch.phone = body.phone ?? null;
    if (body.email !== undefined) patch.email = body.email ?? null;
    if (body.notes !== undefined) patch.notes = body.notes ?? null;
    if (body.team !== undefined) patch.team = body.team as TeamValue; // 👈

    if (Object.keys(patch).length === 0) return res.json({ ok: true });

    await db.update(volunteers).set(patch).where(eq(volunteers.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

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

/* ============ Shifts: détail/patch/delete ============ */
router.get("/shifts/:id/assignments", async (req: Request, res: Response) => {
  try {
    const shiftId = req.params.id || "";
    if (!shiftId) return res.status(400).json({ error: "id manquant" });

    const [s] = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
    if (!s) return res.status(404).json({ error: "Shift introuvable" });

    const rows = await db
      .select({
        assignmentId: assignments.id,
        volunteerId: assignments.volunteerId,
        firstName: volunteers.firstName,
        lastName: volunteers.lastName,
        email: volunteers.email,
        phone: volunteers.phone,
        status: checkins.status, // "pending" | "in" | "done" | "no_show"
        checkinAt: checkins.checkinAt,
        checkoutAt: checkins.checkoutAt,
      })
      .from(assignments)
      .innerJoin(volunteers, eq(assignments.volunteerId, volunteers.id))
      .leftJoin(checkins, eq(checkins.assignmentId, assignments.id))
      .where(eq(assignments.shiftId, shiftId))
      .orderBy(asc(volunteers.lastName), asc(volunteers.firstName));

    const used = rows.length;
    const capacity = s.capacity ?? 0;
    const remaining = Math.max(0, capacity - used);

    return res.json({
      capacity,
      used,
      remaining,
      assignments: rows.map(r => ({
        assignmentId: r.assignmentId,
        volunteerId: r.volunteerId,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
        status: r.status ?? "pending",
        checkinAt: r.checkinAt ?? null,
        checkoutAt: r.checkoutAt ?? null,
      })),
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

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

router.patch("/shifts/:id", validateBody(zPatchShift), async (req: Request, res: Response) => {
  try {
    const id = req.params.id || "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const body = req.validated as z.infer<typeof zPatchShift>;
    const patch: any = {};

    if (body.team !== undefined) patch.team = body.team as TeamValue; // 👈
    if (body.title !== undefined) patch.title = body.title;
    if (body.capacity !== undefined) patch.capacity = body.capacity;
    if (body.location !== undefined) patch.location = body.location ?? null;
    if (body.notes !== undefined) patch.notes = body.notes ?? null;

    if (body.startAt) patch.startAt = body.startAt;
    if (body.endAt)   patch.endAt   = body.endAt;

    if (Object.keys(patch).length === 0) return res.json({ ok: true });

    await db.update(shifts).set(patch).where(eq(shifts.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

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

/* ============ Désassigner ============ */
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

/* ============ Export CSV (optionnel) ============ */
// Garde-le si tu l’utilises encore ; sinon supprime ce bloc.
router.get("/export/csv", validateQuery(zExportCSVQuery), async (req: Request, res: Response) => {
  try {
    const { team, from, to } = req.q as z.infer<typeof zExportCSVQuery>;

    const whereParts: any[] = [];
    if (team) whereParts.push(eq(shifts.team, team as TeamValue));
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
      "shiftId","team","title","startAt","endAt","capacity","location",
      "volunteerId","fullName","email","phone",
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
