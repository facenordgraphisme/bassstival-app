// apps/api/src/routes/users.ts
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  requireAuth,
  findUserById,
  updateUserDisplayName,
  changeUserPasswordInStore,
} from "./auth";

const router = Router();

/** GET /users-api/me */
router.get("/me", requireAuth, (req, res) => {
  const claims = (req as any).user as { sub?: string; email?: string; name?: string; roles?: string[] } | undefined;
  if (!claims?.sub) return res.status(401).json({ error: "Unauthorized" });

  const u = findUserById(claims.sub);
  if (!u) return res.status(401).json({ error: "Unauthorized" });

  return res.json({
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    roles: Array.isArray(u.roles) ? u.roles : [],
  });
});

const zPatchMe = z.object({
  name: z.string().trim().min(1).max(200),
});

/** PATCH /users-api/me  (changer le nom) */
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const claims = (req as any).user as { sub?: string } | undefined;
    if (!claims?.sub) return res.status(401).json({ error: "Unauthorized" });

    const parsed = zPatchMe.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const updated = await updateUserDisplayName(claims.sub, parsed.data.name);
    return res.json({ ok: true, user: updated });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

const zChangePassword = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

/** PATCH /users-api/me/password */
router.patch("/me/password", requireAuth, async (req, res) => {
  try {
    const claims = (req as any).user as { sub?: string } | undefined;
    if (!claims?.sub) return res.status(401).json({ error: "Unauthorized" });

    const parsed = zChangePassword.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { currentPassword, newPassword } = parsed.data;

    const u = findUserById(claims.sub);
    if (!u) return res.status(401).json({ error: "Unauthorized" });

    const ok = await bcrypt.compare(currentPassword, u.passwordHash);
    if (!ok) return res.status(400).json({ error: "Current password invalid" });

    await changeUserPasswordInStore(claims.sub, newPassword);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

export default router;
