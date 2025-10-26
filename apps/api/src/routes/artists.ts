import { Router } from "express";
import { z } from "zod";
import { db } from "../drizzle/db";
import {
  artists, artistContacts, bookings, bookingCosts, artistCosts
} from "../drizzle/schema";
import { and, eq, ilike, gte, lte, asc, not, or, lt, gt } from "drizzle-orm";
import { validateBody, validateQuery } from "../utils/validate";

const router = Router();

const ArtistStatus = z.enum(["prospect","pending","confirmed","canceled"]);
const BookingStatus = z.enum(["draft","confirmed","played","canceled"]);
const StageEnum     = z.enum(["main","second","vip"]).nullable().optional();

const zCreateArtist = z.object({
  name: z.string().min(1),
  genre: z.string().trim().optional().nullable(),
  agency: z.string().trim().optional().nullable(),
  status: ArtistStatus.optional(),
  notes: z.string().optional().nullable(),
  feeAmount: z.number().int().nonnegative().optional().nullable(),
  feeCurrency: z.literal("EUR").optional(),
  hospitalityNotes: z.string().optional().nullable(),
  techRider: z.string().optional().nullable(),
  travelNotes: z.string().optional().nullable(),
  pickupAt: z.coerce.date().optional().nullable(),
  pickupLocation: z.string().optional().nullable(),
});

const zPatchArtist = zCreateArtist.partial();

const zListArtistsQuery = z.object({
  q: z.string().optional(),
  status: ArtistStatus.optional(),
});

const zCreateCost = z.object({
  label: z.string().min(1),
  amount: z.number().int().nonnegative(),
  currency: z.literal("EUR").optional(),
  paid: z.coerce.boolean().optional(),
  notes: z.string().optional().nullable(),
});

const zPatchCost = zCreateCost.partial();

const zCreateContact = z.object({
  name: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  isPrimary: z.coerce.boolean().optional(),
});

const zPatchContact = zCreateContact.partial();

const zListBookingsQuery = z.object({
  artistId: z.string().uuid().optional(),
  stage: z.enum(["main","second","vip"]).optional(),
  status: BookingStatus.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(q => !q.from || !q.to || q.from <= q.to, { message: "from must be <= to" });

const zCreateBooking = z.object({
  artistId: z.string().uuid(),
  stage: StageEnum,
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  status: BookingStatus.optional(),
  feeAmount: z.number().int().nonnegative().optional().nullable(),
  feeCurrency: z.literal("EUR").optional(),
  hospitalityNotes: z.string().optional().nullable(),
  techRider: z.string().optional().nullable(),
  travelNotes: z.string().optional().nullable(),
  pickupAt: z.coerce.date().optional().nullable(),
  pickupLocation: z.string().optional().nullable(),
}).refine(b => b.endAt > b.startAt, { message: "endAt must be after startAt" });

const zPatchBooking = zCreateBooking.partial().refine(b => {
  if (b.startAt && b.endAt) return b.endAt > b.startAt;
  return true;
}, { message: "endAt must be after startAt" });

// -------- Helpers --------
function parseDate(v: unknown): Date | null {
  try {
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

// -------- Artists --------
router.get("/artists", validateQuery(zListArtistsQuery), async (req, res) => {
  try {
    const { q = "", status } = req.q as z.infer<typeof zListArtistsQuery>;

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

router.post("/artists", validateBody(zCreateArtist), async (req, res) => {
  try {
    const b = req.validated as z.infer<typeof zCreateArtist>;
    const [row] = await db.insert(artists).values({
      name: b.name,
      genre: b.genre ?? null,
      agency: b.agency ?? null,
      status: b.status ?? "prospect",
      notes: b.notes ?? null,
      feeAmount: b.feeAmount ?? null,
      feeCurrency: b.feeCurrency ?? "EUR",
      hospitalityNotes: b.hospitalityNotes ?? null,
      techRider: b.techRider ?? null,
      travelNotes: b.travelNotes ?? null,
      pickupAt: b.pickupAt ?? null,
      pickupLocation: b.pickupLocation ?? null,
    }).returning();
    res.status(201).json(row);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.patch("/artists/:id", validateBody(zPatchArtist), async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.validated as z.infer<typeof zPatchArtist>;
    const patch:any = {};
    if ("name" in b) patch.name = b.name;
    if ("genre" in b) patch.genre = b.genre ?? null;
    if ("agency" in b) patch.agency = b.agency ?? null;
    if ("status" in b) patch.status = b.status;
    if ("notes" in b) patch.notes = b.notes ?? null;

    if ("feeAmount" in b) patch.feeAmount = b.feeAmount ?? null;
    if ("feeCurrency" in b) patch.feeCurrency = b.feeCurrency ?? "EUR";
    if ("hospitalityNotes" in b) patch.hospitalityNotes = b.hospitalityNotes ?? null;
    if ("techRider" in b) patch.techRider = b.techRider ?? null;
    if ("travelNotes" in b) patch.travelNotes = b.travelNotes ?? null;
    if ("pickupAt" in b) patch.pickupAt = b.pickupAt ?? null;
    if ("pickupLocation" in b) patch.pickupLocation = b.pickupLocation ?? null;

    if (!Object.keys(patch).length) return res.json({ ok: true });
    await db.update(artists).set(patch).where(eq(artists.id, id));
    res.json({ ok: true });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

// ---- Coûts ARTISTE ----
router.get("/artists/:id/costs", async (req, res) => {
  try {
    const rows = await db.select().from(artistCosts).where(eq(artistCosts.artistId, req.params.id));
    res.json(rows);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.get("/artists/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const [row] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Artist not found" });

    const contacts = await db.select().from(artistContacts).where(eq(artistContacts.artistId, id));
    res.json({ ...row, contacts });
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.delete("/artists/:id", async (req, res) => {
  try {
    await db.delete(artists).where(eq(artists.id, req.params.id));
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.post("/artists/:id/costs", validateBody(zCreateCost), async (req, res) => {
  try {
    const b = req.validated as z.infer<typeof zCreateCost>;
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

router.patch("/artist-costs/:costId", validateBody(zPatchCost), async (req, res) => {
  try {
    const b = req.validated as z.infer<typeof zPatchCost>;
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
router.post("/artists/:id/contacts", validateBody(zCreateContact), async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.validated as z.infer<typeof zCreateContact>;
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

router.patch("/contacts/:contactId", validateBody(zPatchContact), async (req, res) => {
  try {
    const id = req.params.contactId;
    const b = req.validated as z.infer<typeof zPatchContact>;
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
router.get("/bookings", validateQuery(zListBookingsQuery), async (req, res) => {
  try {
    const { artistId, stage, status, from, to } = req.q as z.infer<typeof zListBookingsQuery>;

    const parts: any[] = [];
    if (artistId) parts.push(eq(bookings.artistId, artistId));
    if (stage)    parts.push(eq(bookings.stage, stage));
    if (status)   parts.push(eq(bookings.status, status));

    if (from && to) {
      const endBeforeFrom  = lt(bookings.endAt, from);
      const startAfterTo   = gt(bookings.startAt, to);
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
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.post("/bookings", validateBody(zCreateBooking), async (req, res) => {
  try {
    const b = req.validated as z.infer<typeof zCreateBooking>;
    const [row] = await db.insert(bookings).values({
      artistId: b.artistId,
      stage: b.stage ?? null,
      startAt: b.startAt, endAt: b.endAt,
      status: b.status ?? "draft",
      feeAmount: b.feeAmount ?? null,
      feeCurrency: b.feeCurrency ?? "EUR",
      hospitalityNotes: b.hospitalityNotes ?? null,
      techRider: b.techRider ?? null,
      travelNotes: b.travelNotes ?? null,
      pickupAt: b.pickupAt ?? null,
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

router.patch("/bookings/:id", validateBody(zPatchBooking), async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.validated as z.infer<typeof zPatchBooking>;
    const patch:any = {};
    if ("artistId" in b) patch.artistId = b.artistId;
    if ("stage" in b) patch.stage = b.stage ?? null;
    if ("status" in b) patch.status = b.status;
    if ("feeAmount" in b) patch.feeAmount = b.feeAmount ?? null;
    if ("feeCurrency" in b) patch.feeCurrency = b.feeCurrency ?? "EUR";
    if ("hospitalityNotes" in b) patch.hospitalityNotes = b.hospitalityNotes ?? null;
    if ("techRider" in b) patch.techRider = b.techRider ?? null;
    if ("travelNotes" in b) patch.travelNotes = b.travelNotes ?? null;
    if ("pickupAt" in b) patch.pickupAt = b.pickupAt ?? null;
    if ("pickupLocation" in b) patch.pickupLocation = b.pickupLocation ?? null;
    if ("startAt" in b) patch.startAt = b.startAt;
    if ("endAt" in b)   patch.endAt   = b.endAt;

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

router.get("/bookings/:id/costs", async (req, res) => {
  try {
    const rows = await db.select().from(bookingCosts).where(eq(bookingCosts.bookingId, req.params.id));
    res.json(rows);
  } catch (e:any) { res.status(500).json({ error: e?.message || "Server error" }); }
});

router.post("/bookings/:id/costs", validateBody(zCreateCost), async (req, res) => {
  try {
    const b = req.validated as z.infer<typeof zCreateCost>;
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

router.patch("/costs/:costId", validateBody(zPatchCost), async (req, res) => {
  try {
    const b = req.validated as z.infer<typeof zPatchCost>;
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
