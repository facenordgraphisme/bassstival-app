// apps/api/src/routes/auth.ts
import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  roles: string[]; // ["admin", "tools", "volunteers", "lineup", "staff"]
};

const users: User[] = [];

const ROLES = ["admin", "staff", "tools", "volunteers", "lineup"] as const;
function isValidRoles(input: unknown): input is string[] {
  return Array.isArray(input) && input.every((r) => ROLES.includes(r as any));
}

// --- Utils ---
async function createUser(email: string, name: string, password: string, roles: string[]) {
  const passwordHash = await bcrypt.hash(password, 10);
  const u: User = { id: Math.random().toString(36).slice(2), name, email, passwordHash, roles };
  users.push(u);
  return u;
}

function signToken(user: User) {
  const ttl = Number(process.env.AUTH_TOKEN_TTL_HOURS || 12);
  const payload = { sub: user.id, email: user.email, name: user.name, roles: user.roles };
  return jwt.sign(payload, process.env.AUTH_JWT_SECRET!, { expiresIn: `${ttl}h` });
}

// --- Seed admin ---
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  createUser(process.env.ADMIN_EMAIL, "Admin", process.env.ADMIN_PASSWORD, [
    "admin", "staff", "tools", "volunteers", "lineup",
  ]).catch(() => {});
}

/* ------------------------- LOGIN ------------------------- */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user);

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    token, // ✅ on renvoie le vrai token JWT
  });
});

/* ---------------------- Middlewares ---------------------- */
export function requireAuth(req: Request, res: Response, next: Function) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: "Missing bearer token" });

  try {
    const claims = jwt.verify(match[1], process.env.AUTH_JWT_SECRET!) as any;
    (req as any).user = claims;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRoles(...allowed: string[]) {
  return (req: Request, res: Response, next: Function) => {
    const roles: string[] = ((req as any).user?.roles) || [];
    if (!allowed.some(r => roles.includes(r))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

/* ---------------------- Admin Users CRUD ---------------------- */

// GET /auth/users
router.get("/users", requireAuth, requireRoles("admin"), (_req: Request, res: Response) => {
  return res.json(users.map(({ passwordHash, ...u }) => u));
});

// POST /auth/users
router.post("/users", requireAuth, requireRoles("admin"), async (req: Request, res: Response) => {
  const { email, name, password, roles } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Missing email/password" });
  if (users.some((u) => u.email === email)) return res.status(409).json({ error: "Email exists" });
  if (roles && !isValidRoles(roles)) return res.status(400).json({ error: "Invalid roles" });

  const u = await createUser(email, name || email, password, roles ?? []);
  const { passwordHash, ...safe } = u;
  return res.status(201).json(safe);
});

// PATCH /auth/users/:id
router.patch("/users/:id", requireAuth, requireRoles("admin"), async (req: Request, res: Response) => {
  const { id } = req.params;
  const u = users.find((x) => x.id === id);
  if (!u) return res.status(404).json({ error: "Not found" });

  const { name, email, password, roles } = req.body ?? {};
  if (typeof name === "string") u.name = name;
  if (typeof email === "string") u.email = email;
  if (Array.isArray(roles)) {
    if (!isValidRoles(roles)) return res.status(400).json({ error: "Invalid roles" });
    u.roles = roles;
  }
  if (typeof password === "string" && password.trim()) {
    u.passwordHash = await bcrypt.hash(password, 10);
  }

  const { passwordHash, ...safe } = u;
  return res.json(safe);
});

// DELETE /auth/users/:id
router.delete("/users/:id", requireAuth, requireRoles("admin"), (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = users.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  users.splice(idx, 1);
  return res.json({ ok: true });
});

export default router;
