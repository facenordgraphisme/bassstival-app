import { Router } from "express";
import { z } from "zod";
import { db } from "../drizzle/db";
import { pollSurveys, pollCandidates, pollVotes } from "../drizzle/schema";
import { eq, and, sql, asc, inArray } from "drizzle-orm";
import { requireAuth, requireRoles } from "./auth";
import { users } from "../drizzle/schema";

const router = Router();
type Claims = { sub?: string } | undefined;

/* ===== Schemas ===== */
const zSurveyCreate = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

const zSurveyPatch = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(), // vide => on mettra null
}).refine(d => d.title !== undefined || d.description !== undefined, {
  message: "Empty patch",
});

const toUrl = z
  .string()
  .trim()
  .transform((s) => (s && !/^https?:\/\//i.test(s) ? `https://${s}` : s))
  .pipe(z.string().url());

const zCandidateCreate = z.object({
  artist_name: z.string().trim().min(1),
  genre: z.string().trim().min(1),
  youtube_link: toUrl, // <— tolérant
  image_url: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url().optional()
  ),
  description: z.string().trim().optional(),
  order: z.number().int().min(0).optional(),
});

const zCandidatePatch = z.object({
  artist_name: z.string().trim().min(1).optional(),
  genre: z.string().trim().min(1).optional(),
  youtube_link: toUrl.optional(),
  image_url: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url().optional()
  ),
  description: z.string().trim().optional(),
  order: z.number().int().min(0).optional(),
});

const zVote = z.object({ choice: z.enum(["yes", "no", "abstain"]) });

type SurveyRow = typeof pollSurveys.$inferSelect;

type EnsureOwnerResult =
  | { ok: true; survey: SurveyRow }
  | { ok: false; status: number; error: string };

/* ===== Helpers ===== */
async function ensureSurveyOwner(surveyId: string, userId: string): Promise<EnsureOwnerResult> {
  const [s] = await db
    .select()
    .from(pollSurveys)
    .where(eq(pollSurveys.id, surveyId))
    .limit(1);

  if (!s) return { ok: false, status: 404, error: "Survey not found" } as const;
  if (String(s.createdBy) !== String(userId)) {
    return { ok: false, status: 403, error: "Forbidden" } as const;
  }
  return { ok: true, survey: s } as const;
}

/* ===== Routes ===== */

// GET /polls — liste des surveys (sans détail)
router.get("/", requireAuth, requireRoles("polls"), async (_req, res) => {
  // jointure auteur + agrégat du nombre de candidats
  const rows = await db
    .select({
      id: pollSurveys.id,
      title: pollSurveys.title,
      description: pollSurveys.description,
      created_by: pollSurveys.createdBy,
      created_at: pollSurveys.createdAt,

      // auteur
      author_name: users.displayName,
      author_email: users.email,

      // nombre de candidats
      candidates_count: sql<number>`count(${pollCandidates.id})`.as("candidates_count"),
    })
    .from(pollSurveys)
    .leftJoin(users, eq(users.id, pollSurveys.createdBy))
    .leftJoin(pollCandidates, eq(pollCandidates.surveyId, pollSurveys.id))
    .groupBy(
      pollSurveys.id,
      pollSurveys.title,
      pollSurveys.description,
      pollSurveys.createdBy,
      pollSurveys.createdAt,
      users.displayName,
      users.email
    )
    .orderBy(asc(pollSurveys.createdAt));

  res.json(
    rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      description: r.description ?? null,
      created_by: String(r.created_by),
      created_at: r.created_at,
      candidates_count: Number(r.candidates_count ?? 0),
      creator_name:
        (r.author_name && String(r.author_name)) ||
        (r.author_email ? String(r.author_email).split("@")[0] : "—"),
    }))
  );
});

// POST /polls — créer un survey
router.post("/", requireAuth, requireRoles("polls"), async (req, res) => {
  const claims = (req as any).user as Claims;
  const userId = String(claims?.sub || "");
  const parsed = zSurveyCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [created] = await db.insert(pollSurveys).values({
    title: parsed.data.title,
    description: parsed.data.description,
    createdBy: userId,
  } as any).returning();

  res.status(201).json({
    id: created.id,
    title: created.title,
    description: created.description ?? null,
    created_by: created.createdBy,
    created_at: created.createdAt,
  });
});

// GET /polls/:surveyId — détail d’un survey + candidats + votes agrégés et mon vote
router.get("/:surveyId", requireAuth, requireRoles("polls"), async (req, res) => {
  const { surveyId } = req.params;
  const claims = (req as any).user as Claims;
  const userId = String(claims?.sub || "");

  const [s] = await db.select().from(pollSurveys).where(eq(pollSurveys.id, surveyId)).limit(1);
  if (!s) return res.status(404).json({ error: "Not found" });

  const candidates = await db.select().from(pollCandidates)
    .where(eq(pollCandidates.surveyId, surveyId))
    .orderBy(asc(pollCandidates.order), asc(pollCandidates.createdAt));

  // Agrégats votes par candidate
  const grouped = await db
    .select({
      candidateId: pollVotes.candidateId,
      yes: sql<number>`sum(case when ${pollVotes.choice}='yes' then 1 else 0 end)`,
      no: sql<number>`sum(case when ${pollVotes.choice}='no' then 1 else 0 end)`,
      abstain: sql<number>`sum(case when ${pollVotes.choice}='abstain' then 1 else 0 end)`,
    })
    .from(pollVotes)
    .where(and(eq(pollVotes.candidateId, pollVotes.candidateId))) // trick pour drizzle type narrowing
    .groupBy(pollVotes.candidateId);

  const counts = new Map<string, { yes: number; no: number; abstain: number }>();
  for (const g of grouped) {
    counts.set(String(g.candidateId), {
      yes: Number(g.yes ?? 0),
      no: Number(g.no ?? 0),
      abstain: Number(g.abstain ?? 0),
    });
  }

  // Mes votes
  const mine = await db
    .select({ candidateId: pollVotes.candidateId, choice: pollVotes.choice })
    .from(pollVotes)
    .where(eq(pollVotes.userId, userId));

  const myMap = new Map<string, string>();
  for (const m of mine) myMap.set(String(m.candidateId), String(m.choice));

  res.json({
    id: s.id,
    title: s.title,
    description: s.description ?? null,
    created_by: s.createdBy,
    created_at: s.createdAt,
    candidates: candidates.map(c => ({
      id: c.id,
      artist_name: c.artistName,
      genre: c.genre,
      youtube_link: c.youtubeLink,
      image_url: c.imageUrl ?? null,
      description: c.description ?? null,
      order: c.order,
      results: counts.get(c.id) ?? { yes: 0, no: 0, abstain: 0 },
      my_vote: (myMap.get(c.id) as "yes" | "no" | "abstain" | undefined) ?? null,
    })),
  });
});

// POST /polls/:surveyId/candidates — ajouter un artiste
router.post("/:surveyId/candidates", requireAuth, requireRoles("polls"), async (req, res) => {
  const claims = (req as any).user as Claims;
  const userId = String(claims?.sub || "");
  const { surveyId } = req.params;

  const owner = await ensureSurveyOwner(surveyId, userId);
  if (!owner.ok) return res.status(owner.status).json({ error: owner.error });

  const parsed = zCandidateCreate.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid body",
      details: parsed.error.flatten(), // <— utile pour debug
    });
  }

  const [created] = await db.insert(pollCandidates).values({
    surveyId,
    artistName: parsed.data.artist_name,
    genre: parsed.data.genre,
    youtubeLink: parsed.data.youtube_link,
    imageUrl: parsed.data.image_url,
    description: parsed.data.description ?? null,
    order: parsed.data.order ?? 0,
  } as any).returning();

  res.status(201).json({
    id: created.id,
    artist_name: created.artistName,
    genre: created.genre,
    youtube_link: created.youtubeLink,
    image_url: created.imageUrl ?? null,
    description: created.description ?? null,
    order: created.order,
  });
});

// PATCH /polls/:surveyId/candidates/:id — modifier un artiste
router.patch("/:surveyId/candidates/:id", requireAuth, requireRoles("polls"), async (req, res) => {
  const claims = (req as any).user as Claims;
  const userId = String(claims?.sub || "");
  const { surveyId, id } = req.params;

  const owner = await ensureSurveyOwner(surveyId, userId);
  if (!owner.ok) return res.status(owner.status).json({ error: owner.error });

  const parsed = zCandidatePatch.safeParse(req.body);
  if (!parsed.success) {
  return res.status(400).json({
    error: "Invalid body",
    details: parsed.error.flatten(), // <— utile pour debug
  });
}

  const patch: any = {};
  if (parsed.data.artist_name !== undefined) patch.artistName = parsed.data.artist_name;
  if (parsed.data.genre !== undefined) patch.genre = parsed.data.genre;
  if (parsed.data.youtube_link !== undefined) patch.youtubeLink = parsed.data.youtube_link;
  if (parsed.data.image_url !== undefined) patch.imageUrl = parsed.data.image_url;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description ?? null;
  if (parsed.data.order !== undefined) patch.order = parsed.data.order;

  const [updated] = await db.update(pollCandidates).set(patch).where(eq(pollCandidates.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Not found" });

  res.json({
    id: updated.id,
    artist_name: updated.artistName,
    genre: updated.genre,
    youtube_link: updated.youtubeLink,
    image_url: updated.imageUrl ?? null,
    description: updated.description ?? null, 
    order: updated.order,
  });
});

router.patch("/:surveyId", requireAuth, requireRoles("polls", "admin"), async (req, res) => {
  const { surveyId } = req.params;
  const claims = (req as any).user as { sub?: string; roles?: string[] } | undefined;
  const userId = String(claims?.sub || "");
  const roles = (claims?.roles ?? []) as string[];

  const [s] = await db.select().from(pollSurveys).where(eq(pollSurveys.id, surveyId)).limit(1);
  if (!s) return res.status(404).json({ error: "Not found" });

  const isOwner = String(s.createdBy) === userId;
  const isAdmin = roles.includes("admin");
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

  const parsed = zSurveyPatch.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });

  const patch: any = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title.trim();
  if (parsed.data.description !== undefined) {
    const d = parsed.data.description.trim();
    patch.description = d.length ? d : null;
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const [updated] = await db.update(pollSurveys).set(patch).where(eq(pollSurveys.id, surveyId)).returning();
  return res.json({
    id: updated.id,
    title: updated.title,
    description: updated.description ?? null,
    created_by: updated.createdBy,
    created_at: updated.createdAt,
  });
});

// DELETE /polls/:surveyId/candidates/:id — supprimer un artiste
router.delete("/:surveyId/candidates/:id", requireAuth, requireRoles("polls"), async (req, res) => {
  const claims = (req as any).user as Claims;
  const userId = String(claims?.sub || "");
  const { surveyId, id } = req.params;

  const owner = await ensureSurveyOwner(surveyId, userId);
  if (!owner.ok) return res.status(owner.status).json({ error: owner.error });

  await db.delete(pollCandidates).where(eq(pollCandidates.id, id));
  res.json({ ok: true });
});

// POST /polls/vote/:candidateId — voter pour un artiste (upsert)
router.post("/vote/:candidateId", requireAuth, requireRoles("polls"), async (req, res) => {
  const claims = (req as any).user as Claims;
  const userId = String(claims?.sub || "");
  const { candidateId } = req.params;

  const parsed = zVote.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  // upsert simple : delete + insert
  await db.delete(pollVotes).where(and(eq(pollVotes.candidateId, candidateId), eq(pollVotes.userId, userId)));
  await db.insert(pollVotes).values({ candidateId, userId, choice: parsed.data.choice } as any);

  // renvoyer les nouveaux totaux
  const [agg] = await db
    .select({
      yes: sql<number>`sum(case when ${pollVotes.choice}='yes' then 1 else 0 end)`,
      no: sql<number>`sum(case when ${pollVotes.choice}='no' then 1 else 0 end)`,
      abstain: sql<number>`sum(case when ${pollVotes.choice}='abstain' then 1 else 0 end)`,
    })
    .from(pollVotes)
    .where(eq(pollVotes.candidateId, candidateId));

  res.json({
    candidate_id: candidateId,
    results: {
      yes: Number(agg?.yes ?? 0),
      no: Number(agg?.no ?? 0),
      abstain: Number(agg?.abstain ?? 0),
    },
  });
});

// GET /polls/:surveyId/voters — détails des votants par artiste
router.get("/:surveyId/voters", requireAuth, requireRoles("polls"), async (req, res) => {
  const { surveyId } = req.params;

  // 1) Vérifier que le survey existe
  const [s] = await db.select().from(pollSurveys).where(eq(pollSurveys.id, surveyId)).limit(1);
  if (!s) return res.status(404).json({ error: "Not found" });

  // 2) Charger les artistes (candidates)
  const candidates = await db
    .select()
    .from(pollCandidates)
    .where(eq(pollCandidates.surveyId, surveyId))
    .orderBy(asc(pollCandidates.order), asc(pollCandidates.createdAt));

  if (candidates.length === 0) {
    return res.json({ id: s.id, candidates: [] });
  }

  const candidateIds = candidates.map(c => c.id);

  // 3) Joindre votes + users
  const rows = await db
    .select({
      candidateId: pollVotes.candidateId,
      userId: users.id,
      name: users.displayName,
      email: users.email,
      choice: pollVotes.choice,
    })
    .from(pollVotes)
    .innerJoin(
      // @ts-ignore — on importe bien users depuis schema
      users,
      eq(users.id, pollVotes.userId)
    )
    .where(inArray(pollVotes.candidateId, candidateIds));

  // 4) Grouper par candidate + par choix
  const map = new Map<string, { yes: any[]; no: any[]; abstain: any[] }>();
  for (const c of candidates) {
    map.set(c.id, { yes: [], no: [], abstain: [] });
  }
  for (const r of rows as Array<{ candidateId: string; userId: string; name: string | null; email: string; choice: "yes"|"no"|"abstain" }>) {
    const bucket = map.get(String(r.candidateId));
    if (!bucket) continue;
    const entry = { id: r.userId, name: r.name ?? r.email.split("@")[0], email: r.email };
    if (r.choice === "yes") bucket.yes.push(entry);
    else if (r.choice === "no") bucket.no.push(entry);
    else bucket.abstain.push(entry);
  }

  // 5) Réponse
  return res.json({
    id: s.id,
    candidates: candidates.map(c => ({
      id: c.id,
      artist_name: c.artistName,
      voters: map.get(c.id) ?? { yes: [], no: [], abstain: [] },
    })),
  });
});

// DELETE /polls/:surveyId — supprime un sondage (créateur ou admin)
router.delete("/:surveyId", requireAuth, requireRoles("polls", "admin"), async (req, res) => {
  const { surveyId } = req.params;
  const claims = (req as any).user as { sub?: string; roles?: string[] } | undefined;
  const userId = String(claims?.sub || "");
  const roles = (claims?.roles ?? []) as string[];

  const [s] = await db.select().from(pollSurveys).where(eq(pollSurveys.id, surveyId)).limit(1);
  if (!s) return res.status(404).json({ error: "Not found" });

  const isOwner = String(s.createdBy) === userId;
  const isAdmin = roles.includes("admin");
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Forbidden" });

  // FK cascade : poll_candidates -> poll_votes seront supprimés via CASCADE
  await db.delete(pollSurveys).where(eq(pollSurveys.id, surveyId));
  return res.json({ ok: true });
});

export default router;
