import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth } from "./auth";
import { db } from "../drizzle/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const router = Router();

type Claims = { sub?: string; email?: string; name?: string; roles?: string[] } | undefined;

router.get("/me", requireAuth, async (req, res) => {
  const claims = (req as any).user as Claims;
  if (!claims?.sub) return res.status(401).json({ error: "Unauthorized" });

  const [row] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);
  if (!row) return res.status(401).json({ error: "Unauthorized" });

  return res.json({
    id: row.id,
    email: row.email,
    name: (row as any).displayName ?? null,
    roles: ((row as any).roles ?? []) as string[],
  });
});

const zPatchMe = z.object({
  name: z.string().trim().min(1).max(200),
});

router.patch("/me", requireAuth, async (req, res) => {
  try {
    const claims = (req as any).user as Claims;
    if (!claims?.sub) return res.status(401).json({ error: "Unauthorized" });

    const parsed = zPatchMe.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    await db.update(users)
      .set({ displayName: parsed.data.name } as any)
      .where(eq(users.id, claims.sub));

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

const zChangePassword = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.patch("/me/password", requireAuth, async (req, res) => {
  try {
    const claims = (req as any).user as Claims;
    if (!claims?.sub) return res.status(401).json({ error: "Unauthorized" });

    const parsed = zChangePassword.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const [row] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);
    if (!row) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(parsed.data.currentPassword, (row as any).passwordHash || "");
    if (!ok) return res.status(400).json({ error: "Current password invalid" });

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await db.update(users)
      .set({ passwordHash: newHash } as any)
      .where(eq(users.id, claims.sub));

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

export default router;
