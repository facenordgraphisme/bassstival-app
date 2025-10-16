import { Router } from "express";
import { db } from "../drizzle/db";
import {
  artists, artistContacts, bookings, bookingCosts,artistCosts 
} from "../drizzle/schema";
import { and, eq, ilike, gte, lte, asc, desc, not, or, lt, gt } from "drizzle-orm";

const router = Router();

// -------- Helpers --------
function parseDate(v: unknown): Date | null {
  try {
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

// -------- Artists --------
router.get("/artists", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const status = req.query.status as undefined | "prospect" | "pending" | "confirmed" | "canceled";

    const parts = [];
    if (q) {
      const p = `%${q}%`;
      parts.push(ilike(artists.name, p));
    }
    if (status) parts.push(eq(artists.status, status));

    const rows = await db
      .select()
      .from(artists)
      .where(parts.length ? and(...parts) : undefined)
      .orderBy(asc(artists.name));

    res.json(rows);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.post("/artists", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: "name requis" });
    const [row] = await db.insert(artists).values({
      name: b.name,
      genre: b.genre ?? null,
      agency: b.agency ?? null,
      status: b.status ?? "prospect",
      notes: b.notes ?? null,

      feeAmount: typeof b.feeAmount === "number" ? b.feeAmount : null,
      feeCurrency: b.feeCurrency ?? "EUR",
      hospitalityNotes: b.hospitalityNotes ?? null,
      techRider: b.techRider ?? null,
      travelNotes: b.travelNotes ?? null,
      pickupAt: b.pickupAt ? parseDate(b.pickupAt) : null,
      pickupLocation: b.pickupLocation ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

// PATCH /artists/:id  (ajouter mapping des nouveaux champs)
router.patch("/artists/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body || {};
    const patch:any = {};
    if ("name" in b) patch.name = b.name;
    if ("genre" in b) patch.genre = b.genre ?? null;
    if ("agency" in b) patch.agency = b.agency ?? null;
    if ("status" in b) patch.status = b.status;
    if ("notes" in b) patch.notes = b.notes ?? null;

    if ("feeAmount" in b) patch.feeAmount = typeof b.feeAmount === "number" ? b.feeAmount : null;
    if ("feeCurrency" in b) patch.feeCurrency = b.feeCurrency ?? "EUR";
    if ("hospitalityNotes" in b) patch.hospitalityNotes = b.hospitalityNotes ?? null;
    if ("techRider" in b) patch.techRider = b.techRider ?? null;
    if ("travelNotes" in b) patch.travelNotes = b.travelNotes ?? null;
    if ("pickupAt" in b) patch.pickupAt = b.pickupAt ? parseDate(b.pickupAt) : null;
    if ("pickupLocation" in b) patch.pickupLocation = b.pickupLocation ?? null;

    if (!Object.keys(patch).length) return res.json({ ok: true });
    await db.update(artists).set(patch).where(eq(artists.id, id));
    res.json({ ok: true });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

// ---- Coûts ARTISTE (nouveaux endpoints) ----
router.get("/artists/:id/costs", async (req, res) => {
  try {
    const rows = await db.select().from(artistCosts).where(eq(artistCosts.artistId, req.params.id));
    res.json(rows);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.get("/artists/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // 1) Récup artiste
    const [row] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Artist not found" });

    // 2) Contacts liés (principal d'abord)
    const contacts = await db
      .select()
      .from(artistContacts)
      .where(eq(artistContacts.artistId, id));

    // (optionnel) si tu veux trier : principal en premier
    // import { desc, asc } au besoin
    // .orderBy(desc(artistContacts.isPrimary), asc(artistContacts.name))

    // 3) Retourne le shape attendu par le front (ArtistWithContacts)
    res.json({ ...row, contacts });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

router.delete("/artists/:id", async (req, res) => {
  try {
    const id = req.params.id;
    // Optionnel: vérifier l’existence
    // const [row] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);
    // if (!row) return res.status(404).json({ error: "Artist not found" });

    await db.delete(artists).where(eq(artists.id, id));
    // Grâce aux FK `onDelete: "cascade"`, les contacts, costs,
    // bookings et booking_costs rattachés seront supprimés aussi.
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

router.post("/artists/:id/costs", async (req, res) => {
  try {
    const b = req.body || {};
    const [row] = await db.insert(artistCosts).values({
      artistId: req.params.id,
      label: b.label,
      amount: b.amount,
      currency: b.currency ?? "EUR",
      paid: !!b.paid,
      notes: b.notes ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.patch("/artist-costs/:costId", async (req, res) => {
  try {
    const b = req.body || {};
    const patch:any = {};
    if ("label" in b) patch.label = b.label;
    if ("amount" in b) patch.amount = b.amount;
    if ("currency" in b) patch.currency = b.currency ?? "EUR";
    if ("paid" in b) patch.paid = !!b.paid;
    if ("notes" in b) patch.notes = b.notes ?? null;
    await db.update(artistCosts).set(patch).where(eq(artistCosts.id, req.params.costId));
    res.json({ ok: true });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.delete("/artist-costs/:costId", async (req, res) => {
  try {
    await db.delete(artistCosts).where(eq(artistCosts.id, req.params.costId));
    res.json({ ok: true });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

// Contacts
router.post("/artists/:id/contacts", async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body || {};
    const [row] = await db.insert(artistContacts).values({
      artistId: id,
      name: b.name ?? null,
      role: b.role ?? null,
      email: b.email ?? null,
      phone: b.phone ?? null,
      isPrimary: !!b.isPrimary,
    }).returning();
    res.status(201).json(row);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.patch("/contacts/:contactId", async (req, res) => {
  try {
    const id = req.params.contactId;
    const b = req.body || {};
    const patch:any = {};
    if ("name" in b) patch.name = b.name ?? null;
    if ("role" in b) patch.role = b.role ?? null;
    if ("email" in b) patch.email = b.email ?? null;
    if ("phone" in b) patch.phone = b.phone ?? null;
    if ("isPrimary" in b) patch.isPrimary = !!b.isPrimary;
    await db.update(artistContacts).set(patch).where(eq(artistContacts.id, id));
    res.json({ ok: true });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.delete("/contacts/:contactId", async (req, res) => {
  try {
    await db.delete(artistContacts).where(eq(artistContacts.id, req.params.contactId));
    res.json({ ok: true });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

// -------- Bookings --------
router.get("/bookings", async (req, res) => {
  try {
    const artistId = req.query.artistId as string | undefined;
    const stage = req.query.stage as ("main"|"second"|"vip") | undefined;
    const status = req.query.status as ("draft"|"confirmed"|"played"|"canceled") | undefined;
    const from = parseDate(req.query.from);
    const to   = parseDate(req.query.to);

    const parts: any[] = [];
    if (artistId) parts.push(eq(bookings.artistId, artistId));
    if (stage)    parts.push(eq(bookings.stage, stage));
    if (status)   parts.push(eq(bookings.status, status));

    if (from && to) {
      // Overlap correct : NOT (end < from OR start > to)
      const endBeforeFrom  = lt(bookings.endAt, from!);
      const startAfterTo   = gt(bookings.startAt, to!);
      parts.push(not(or(endBeforeFrom, startAfterTo)!));
    } else if (from) {
      parts.push(gte(bookings.endAt, from));
    } else if (to) {
      parts.push(lte(bookings.startAt, to));
    }

    const rows = await db
      .select()
      .from(bookings)
      .where(parts.length ? and(...parts) : undefined)
      .orderBy(asc(bookings.startAt));

    res.json(rows);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const b = req.body || {};
    const sa = parseDate(b.startAt);
    const ea = parseDate(b.endAt);
    if (!b.artistId) return res.status(400).json({ error: "artistId requis" });
    if (!sa || !ea || ea <= sa) return res.status(400).json({ error: "startAt/endAt invalides" });

    const [row] = await db.insert(bookings).values({
      artistId: b.artistId,
      stage: b.stage ?? null,
      startAt: sa, endAt: ea,
      status: b.status ?? "draft",
      feeAmount: typeof b.feeAmount === "number" ? b.feeAmount : null,
      feeCurrency: b.feeCurrency ?? "EUR",
      hospitalityNotes: b.hospitalityNotes ?? null,
      techRider: b.techRider ?? null,
      travelNotes: b.travelNotes ?? null,
      pickupAt: b.pickupAt ? parseDate(b.pickupAt) : null,
      pickupLocation: b.pickupLocation ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.get("/bookings/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Booking not found" });
    const costs = await db.select().from(bookingCosts).where(eq(bookingCosts.bookingId, id));
    res.json({ ...row, costs });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.patch("/bookings/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body || {};
    const patch:any = {};
    if ("artistId" in b) patch.artistId = b.artistId;
    if ("stage" in b) patch.stage = b.stage ?? null;
    if ("status" in b) patch.status = b.status;
    if ("feeAmount" in b) patch.feeAmount = typeof b.feeAmount === "number" ? b.feeAmount : null;
    if ("feeCurrency" in b) patch.feeCurrency = b.feeCurrency ?? "EUR";
    if ("hospitalityNotes" in b) patch.hospitalityNotes = b.hospitalityNotes ?? null;
    if ("techRider" in b) patch.techRider = b.techRider ?? null;
    if ("travelNotes" in b) patch.travelNotes = b.travelNotes ?? null;
    if ("pickupAt" in b) patch.pickupAt = b.pickupAt ? parseDate(b.pickupAt) : null;
    if ("pickupLocation" in b) patch.pickupLocation = b.pickupLocation ?? null;
    if ("startAt" in b) { const d = parseDate(b.startAt); if (!d) return res.status(400).json({ error: "startAt invalide" }); patch.startAt = d; }
    if ("endAt" in b)   { const d = parseDate(b.endAt);   if (!d) return res.status(400).json({ error: "endAt invalide" });   patch.endAt = d; }

    await db.update(bookings).set(patch).where(eq(bookings.id, id));
    res.json({ ok: true });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.delete("/bookings/:id", async (req, res) => {
  try {
    await db.delete(bookings).where(eq(bookings.id, req.params.id));
    res.json({ ok: true });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

// Costs
router.get("/bookings/:id/costs", async (req, res) => {
  try {
    const rows = await db.select().from(bookingCosts).where(eq(bookingCosts.bookingId, req.params.id));
    res.json(rows);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.post("/bookings/:id/costs", async (req, res) => {
  try {
    const b = req.body || {};
    const [row] = await db.insert(bookingCosts).values({
      bookingId: req.params.id,
      label: b.label,
      amount: b.amount,
      currency: b.currency ?? "EUR",
      paid: !!b.paid,
      notes: b.notes ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.patch("/costs/:costId", async (req, res) => {
  try {
    const b = req.body || {};
    const patch:any = {};
    if ("label" in b) patch.label = b.label;
    if ("amount" in b) patch.amount = b.amount;
    if ("currency" in b) patch.currency = b.currency ?? "EUR";
    if ("paid" in b) patch.paid = !!b.paid;
    if ("notes" in b) patch.notes = b.notes ?? null;
    await db.update(bookingCosts).set(patch).where(eq(bookingCosts.id, req.params.costId));
    res.json({ ok: true });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.delete("/costs/:costId", async (req, res) => {
  try {
    await db.delete(bookingCosts).where(eq(bookingCosts.id, req.params.costId));
    res.json({ ok: true });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});



export default router;
