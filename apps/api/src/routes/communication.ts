import { Router } from "express";
import { z } from "zod";
import { db } from "../drizzle/db";
import { users } from "../drizzle/schema";
import { commEvents, commStatusHistory, commPublications, commPublicationHistory  } from "../drizzle/schema";
import { and, asc, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { requireAuth, requireRoles } from "./auth";

const r = Router();
type Claims = { sub?: string } | undefined;

/* =======================
   Zod Schemas
   ======================= */

const CHANNELS = [
  "instagram_post","instagram_story","instagram_reel",
  "facebook_post","tiktok","linkedin","email","site_page","press",
] as const;

const STATUSES = ["idea","draft","approved","scheduled","published","canceled"] as const;

const zAsset = z.object({
  kind: z.enum(["image","video"]),
  url: z.string().url(),
  alt: z.string().optional(),
});

const zEventCreate = z.object({
  title: z.string().min(1),
  channels: z.array(z.enum(CHANNELS)).min(1),
  status: z.enum(STATUSES).default("idea"),
  scheduled_at: z.coerce.date().optional(),
  body: z.string().optional(),
  hashtags: z.string().optional(),
  link_url: z.string().url().optional(),
  assets: z.array(zAsset).default([]),
  tags: z.array(z.string().trim().min(1)).optional(),
  // clé = string, valeur = any
  extra: z.record(z.string(), z.any()).default({}),
});
const zEventPatch = zEventCreate.partial();

const zPublicationCreate = z.object({
  title: z.string().min(1),
  channels: z.array(z.enum(CHANNELS)).min(1), // <= multi-canaux
  body: z.string().min(1),
  hashtags: z.string().optional(),
  link_url: z.string().url().optional(),
  assets: z.array(zAsset).default([]),
  tags: z.array(z.string().trim().min(1)).optional(),
});
const zPublicationPatch = zPublicationCreate.partial();

/* =======================
   Helpers
   ======================= */

async function logStatus(eventId: string, fromStatus: string|null, toStatus: string, userId?: string, note?: string) {
  await db.insert(commStatusHistory).values({
    eventId,
    fromStatus: (fromStatus ?? null) as any,
    toStatus: toStatus as any,
    changedBy: (userId ?? null) as any,
    note: note ?? null,
  } as any);
}

async function logPublicationHistory(params: {
  publicationId: string;
  action: "create" | "update" | "delete";
  changedBy?: string | null;
  changedFields?: string[];
  before?: unknown;
  after?: unknown;
  note?: string;
}) {
  await db.insert(commPublicationHistory).values({
    publicationId: params.publicationId as any,
    action: params.action as any,
    changedBy: (params.changedBy ?? null) as any,
    changedFields: (params.changedFields ?? []) as any,
    before: (params.before ?? null) as any,
    after: (params.after ?? null) as any,
    note: params.note ?? null,
  } as any);
}

/* =======================
   Events (timeline)
   ======================= */

// GET /communication/events?from=&to=&channels=a,b&status=&tags=a,b&includePast=&q=
r.get("/events", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const q = req.query as Record<string, string | undefined>;

  const where = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const includePast = q.includePast === "1" || q.includePast === "true";
  const from = q.from ? new Date(q.from) : (includePast ? undefined : today);
  const to = q.to ? new Date(q.to) : undefined;

  if (from) where.push(gte(commEvents.scheduledAt, from));
  if (to) where.push(lte(commEvents.scheduledAt, to));

  // Supporte channels="a,b" (et aussi channel= pour compat descendante)
  const channelsParam = q.channels || q.channel;
  if (channelsParam) {
    const arr = channelsParam.split(",").map(s => s.trim()).filter(Boolean);
    if (arr.length) {
      // Intersection: EXISTS (unnest(event.channels) = ANY($arr))
      where.push(
        sql`EXISTS (
              SELECT 1
              FROM unnest(${commEvents.channels}) AS c
              WHERE c = ANY(${arr}::comm_channel[])
            )`
      );
    }
  }

  if (q.status) where.push(eq(commEvents.status, q.status as any));
  if (q.q) where.push(ilike(commEvents.title, `%${q.q}%`));

  if (q.tags) {
    const tags = q.tags.split(",").map(s => s.trim()).filter(Boolean);
    if (tags.length) {
      where.push(sql`EXISTS (SELECT 1 FROM unnest(${commEvents.tags}) t WHERE t = ANY(${tags}::text[]))`);
    }
  }

  const rows = await db.select().from(commEvents)
    .where(where.length ? and(...where) : sql`true`)
    .orderBy(asc(commEvents.scheduledAt), desc(commEvents.createdAt));

  res.json({ data: rows });
});

// POST /communication/events
r.post("/events", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const claims = (req as any).user as Claims;
  const userId = String(claims?.sub || "");
  const parsed = zEventCreate.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  if (parsed.data.status === "scheduled" && !parsed.data.scheduled_at) {
    return res.status(400).json({ error: "scheduled_at required for status=scheduled" });
  }

  const [created] = await db.insert(commEvents).values({
    title: parsed.data.title,
    channels: parsed.data.channels as any,   // ✅ multi-canaux
    status: parsed.data.status as any,
    scheduledAt: parsed.data.scheduled_at,
    body: parsed.data.body,
    hashtags: parsed.data.hashtags,
    linkUrl: parsed.data.link_url,
    assets: parsed.data.assets as any,
    tags: parsed.data.tags as any,
    extra: parsed.data.extra as any,
    ownerId: userId as any,
  }).returning();

  await logStatus(created.id, null, created.status, userId, "create");
  return res.status(201).json({ data: created });
});

// GET /communication/events/:id
r.get("/events/:id", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const { id } = req.params;
  const [row] = await db.select().from(commEvents).where(eq(commEvents.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ data: row });
});

// PATCH /communication/events/:id
r.patch("/events/:id", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const { id } = req.params;
  const claims = (req as any).user as Claims;
  const userId = String(claims?.sub || "");

  const [prev] = await db.select().from(commEvents).where(eq(commEvents.id, id)).limit(1);
  if (!prev) return res.status(404).json({ error: "Not found" });

  const parsed = zEventPatch.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  if (parsed.data.status === "scheduled" && parsed.data.scheduled_at === undefined && !prev.scheduledAt) {
    return res.status(400).json({ error: "scheduled_at required for status=scheduled" });
  }

  const patch: any = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.channels !== undefined) patch.channels = parsed.data.channels; // ✅
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.scheduled_at !== undefined) patch.scheduledAt = parsed.data.scheduled_at;
  if (parsed.data.body !== undefined) patch.body = parsed.data.body;
  if (parsed.data.hashtags !== undefined) patch.hashtags = parsed.data.hashtags;
  if (parsed.data.link_url !== undefined) patch.linkUrl = parsed.data.link_url;
  if (parsed.data.assets !== undefined) patch.assets = parsed.data.assets;
  if (parsed.data.tags !== undefined) patch.tags = parsed.data.tags;
  if (parsed.data.extra !== undefined) patch.extra = parsed.data.extra;

  if (parsed.data.status === "published" && !prev.publishedAt) {
    patch.publishedAt = sql`now()`;
  }
  patch.updatedAt = sql`now()`;

  const [updated] = await db.update(commEvents).set(patch).where(eq(commEvents.id, id)).returning();

  if (parsed.data.status && parsed.data.status !== prev.status) {
    await logStatus(id, prev.status, parsed.data.status, userId, "status change");
  }

  res.json({ data: updated });
});

// DELETE /communication/events/:id
r.delete("/events/:id", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const { id } = req.params;
  await db.delete(commEvents).where(eq(commEvents.id, id));
  res.json({ ok: true });
});

// GET /communication/events/:id/history
r.get("/events/:id/history", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const { id } = req.params;
  const rows = await db.select().from(commStatusHistory)
    .where(eq(commStatusHistory.eventId, id))
    .orderBy(asc(commStatusHistory.changedAt));
  res.json({ data: rows });
});

/* =======================
   Publications (library)
   ======================= */

r.get("/publications", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  const where = [];

  const channelsParam = q.channels || q.channel;
  if (channelsParam) {
    const arr = channelsParam.split(",").map(s => s.trim()).filter(Boolean);
    if (arr.length) {
      where.push(
        sql`EXISTS (
              SELECT 1
              FROM unnest(${commPublications.channels}) AS c
              WHERE c = ANY(${arr}::comm_channel[])
            )`
      );
    }
  }

  if (q.q) where.push(ilike(commPublications.title, `%${q.q}%`));

  if (q.tags) {
    const tags = q.tags.split(",").map(s => s.trim()).filter(Boolean);
    if (tags.length) {
      where.push(sql`EXISTS (SELECT 1 FROM unnest(${commPublications.tags}) t WHERE t = ANY(${tags}::text[]))`);
    }
  }

const rows = await db
  .select({
    id: commPublications.id,
    title: commPublications.title,
    channels: commPublications.channels,
    body: commPublications.body,
    hashtags: commPublications.hashtags,
    linkUrl: commPublications.linkUrl,
    assets: commPublications.assets,
    tags: commPublications.tags,
    createdAt: commPublications.createdAt,
    updatedAt: commPublications.updatedAt,
    createdBy: commPublications.createdBy,
    updatedBy: commPublications.updatedBy,
    creator_name: sql<string>`creator.display_name`,
    editor_name: sql<string>`editor.display_name`,
  })
  .from(commPublications)
  // 👇 deux LEFT JOIN “nommés” à la main
  .leftJoin(sql`users as creator`, sql`creator.id = ${commPublications.createdBy}`)
  .leftJoin(sql`users as editor`, sql`editor.id = ${commPublications.updatedBy}`)
  .where(where.length ? and(...where) : sql`true`)
  .orderBy(desc(commPublications.updatedAt));

  res.json({ data: rows });
});


// POST /communication/publications
r.post("/publications", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const claims = (req as any).user as Claims;
  const userId = String(claims?.sub || "");
  const parsed = zPublicationCreate.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const [created] = await db.insert(commPublications).values({
    title: parsed.data.title,
    channels: parsed.data.channels as any, // multi-canaux
    body: parsed.data.body,
    hashtags: parsed.data.hashtags,
    linkUrl: parsed.data.link_url,
    assets: parsed.data.assets as any,
    tags: parsed.data.tags as any,
    createdBy: userId as any,   // ✅ créateur
    updatedBy: userId as any,   // ✅ première édition = créateur
    // updatedAt est géré par la colonne avec defaultNow() si tu l'as mise,
    // sinon tu peux forcer: updatedAt: sql`now()`,
  }).returning();

  await logPublicationHistory({
  publicationId: created.id,
  action: "create",
  changedBy: userId,
  changedFields: ["title","channels","body","hashtags","link_url","assets","tags"],
  before: null,
  after: created,
  note: "created",
});

  res.status(201).json({ data: created });
});


// GET /communication/publications/:id
r.get("/publications/:id", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const { id } = req.params;
  const [row] = await db.select().from(commPublications).where(eq(commPublications.id, id)).limit(1);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ data: row });
});

r.get("/publications/:id/history", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const { id } = req.params;

  const rows = await db
    .select({
      id: commPublicationHistory.id,
      action: commPublicationHistory.action,
      changedAt: commPublicationHistory.changedAt,
      changedFields: commPublicationHistory.changedFields,
      before: commPublicationHistory.before,
      after: commPublicationHistory.after,
      note: commPublicationHistory.note,
      changedBy: commPublicationHistory.changedBy,
      editor_name: users.displayName,
      editor_email: users.email,
    })
    .from(commPublicationHistory)
    .leftJoin(users, eq(commPublicationHistory.changedBy, users.id))
    .where(eq(commPublicationHistory.publicationId, id))
    .orderBy(desc(commPublicationHistory.changedAt));

  res.json({ data: rows });
});
// PATCH /communication/publications/:id
r.patch("/publications/:id", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const { id } = req.params;
  const claims = (req as any).user as { sub?: string } | undefined;
  const userId = String(claims?.sub || "");

  const parsed = zPublicationPatch.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  // charger la version "avant"
  const [before] = await db.select().from(commPublications).where(eq(commPublications.id, id)).limit(1);
  if (!before) return res.status(404).json({ error: "Not found" });

  const patch: any = {};
  const changedFields: string[] = [];

  if (parsed.data.title !== undefined) { patch.title = parsed.data.title; changedFields.push("title"); }
  if (parsed.data.channels !== undefined) { patch.channels = parsed.data.channels; changedFields.push("channels"); }
  if (parsed.data.body !== undefined) { patch.body = parsed.data.body; changedFields.push("body"); }
  if (parsed.data.hashtags !== undefined) { patch.hashtags = parsed.data.hashtags; changedFields.push("hashtags"); }
  if (parsed.data.link_url !== undefined) { patch.linkUrl = parsed.data.link_url; changedFields.push("link_url"); }
  if (parsed.data.assets !== undefined) { patch.assets = parsed.data.assets; changedFields.push("assets"); }
  if (parsed.data.tags !== undefined) { patch.tags = parsed.data.tags; changedFields.push("tags"); }

  // marquer éditeur + MAJ horodatage
  patch.updatedAt = sql`now()`;
  patch.updatedBy = userId as any;

  const [updated] = await db.update(commPublications).set(patch).where(eq(commPublications.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Not found" });

  // journal
  await logPublicationHistory({
    publicationId: id,
    action: "update",
    changedBy: userId,
    changedFields,
    before,
    after: updated,
    note: "patch",
  });

  res.json({ data: updated });
});


// DELETE /communication/publications/:id
r.delete("/publications/:id", requireAuth, requireRoles("admin","staff","communication"), async (req, res) => {
  const { id } = req.params;
  const claims = (req as any).user as { sub?: string } | undefined;
  const userId = String(claims?.sub || "");

  const [before] = await db.select().from(commPublications).where(eq(commPublications.id, id)).limit(1);

  await db.delete(commPublications).where(eq(commPublications.id, id));

  if (before) {
    await logPublicationHistory({
      publicationId: id,
      action: "delete",
      changedBy: userId,
      changedFields: [],
      before,
      after: null,
      note: "delete",
    });
  }

  res.json({ ok: true });
});


export default r;
