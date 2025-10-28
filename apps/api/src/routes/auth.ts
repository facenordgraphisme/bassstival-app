// apps/api/src/routes/auth.ts
import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

/* --------------------------- Types & Store --------------------------- */

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  roles: string[]; // ["admin","staff","tools","volunteers","lineup"]
};

// ⚠️ In-memory (non persistant). Remplace par DB plus tard.
const users: User[] = [];

/* ------------------------- Constantes & Utils ------------------------ */

const ROLES = ["admin", "staff", "tools", "volunteers", "lineup"] as const;
type Role = (typeof ROLES)[number];

function isValidRoles(input: unknown): input is Role[] {
  return Array.isArray(input) && input.every((r) => (ROLES as readonly string[]).includes(r));
}

function safeUser(u: User) {
  const { passwordHash, ...rest } = u;
  return rest;
}

function getUserByEmail(email?: string | null) {
  if (!email) return undefined;
  return users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

async function createUser(email: string, name: string, password: string, roles: Role[]) {
  const passwordHash = await bcrypt.hash(password, 10);
  const u: User = { id: Math.random().toString(36).slice(2), name, email, passwordHash, roles };
  users.push(u);
  return u;
}

const JWT_SECRET =
  process.env.API_JWT_SECRET ||
  process.env.AUTH_JWT_SECRET ||
  "dev_fallback_secret_change_me"; // évite crash en dev

const TOKEN_TTL_HOURS = Number(process.env.API_TOKEN_TTL_HOURS ?? process.env.AUTH_TOKEN_TTL_HOURS ?? 12);

function signToken(user: User) {
  const payload = { sub: user.id, email: user.email, name: user.name, roles: user.roles };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${TOKEN_TTL_HOURS}h` });
}

/* ----------------------------- Seed admin ---------------------------- */

// Évite de dupliquer si hot-reload / dev
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) return;
  if (getUserByEmail(email)) return; // déjà présent
  await createUser(email, "Admin", pass, ["admin", "staff", "tools", "volunteers", "lineup"]);
}
seedAdmin().catch(() => {});

/* --------------------------- Middlewares ----------------------------- */

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: "Missing bearer token" });

  try {
    const claims = jwt.verify(match[1], JWT_SECRET) as any;
    (req as any).user = claims;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRoles(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const roles: string[] = ((req as any).user?.roles) || [];
    if (!allowed.some((r) => roles.includes(r))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

/* ------------------------------ Routes ------------------------------ */

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  const user = getUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(String(password || ""), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user);
  return res.json({ ...safeUser(user), token });
});

// GET /auth/me  (debug/outil)
router.get("/me", requireAuth, (req: Request, res: Response) => {
  const claims = (req as any).user;
  return res.json({ ok: true, user: claims });
});

// GET /auth/users
router.get("/users", requireAuth, requireRoles("admin"), (_req: Request, res: Response) => {
  return res.json(users.map(safeUser));
});

// POST /auth/users
router.post("/users", requireAuth, requireRoles("admin"), async (req: Request, res: Response) => {
  const { email, name, password, roles } = req.body ?? {};

  if (!email || !password) return res.status(400).json({ error: "Missing email/password" });
  if (getUserByEmail(email)) return res.status(409).json({ error: "Email exists" });
  if (roles && !isValidRoles(roles)) return res.status(400).json({ error: "Invalid roles" });

  const u = await createUser(String(email), String(name || email), String(password), (roles ?? []) as Role[]);
  return res.status(201).json(safeUser(u));
});

// PATCH /auth/users/:id
router.patch("/users/:id", requireAuth, requireRoles("admin"), async (req: Request, res: Response) => {
  const { id } = req.params;
  const u = users.find((x) => x.id === id);
  if (!u) return res.status(404).json({ error: "Not found" });

  const { name, email, password, roles } = req.body ?? {};

  if (typeof name === "string") u.name = name;
  if (typeof email === "string") {
    // garde l’unicité email
    if (getUserByEmail(email) && getUserByEmail(email)?.id !== u.id) {
      return res.status(409).json({ error: "Email exists" });
    }
    u.email = email;
  }
  if (Array.isArray(roles)) {
    if (!isValidRoles(roles)) return res.status(400).json({ error: "Invalid roles" });
    u.roles = roles as Role[];
  }
  if (typeof password === "string" && password.trim()) {
    u.passwordHash = await bcrypt.hash(password, 10);
  }

  return res.json(safeUser(u));
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
