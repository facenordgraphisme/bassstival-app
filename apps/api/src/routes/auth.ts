// apps/api/src/routes/auth.ts
import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { db } from "../drizzle/db";
import { users } from "../drizzle/schema"; // <-- ton schema Drizzle
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

/* --------------------------- Rôles & types --------------------------- */

const ROLES = ["admin", "staff", "tools", "volunteers", "lineup", "polls", "communication"] as const;

type Role = (typeof ROLES)[number];

function isValidRoles(input: unknown): input is Role[] {
  return Array.isArray(input) && input.every((r) => (ROLES as readonly string[]).includes(r as Role));
}

/** Claims dans le JWT */
type AuthClaims = {
  sub: string;
  email: string;
  name: string;
  roles: Role[];
  iat?: number;
  exp?: number;
};

/** Request avec user injecté par requireAuth */
type AuthedRequest = Request & { user?: AuthClaims };

/* ------------------------- JWT helpers ------------------------ */

const JWT_SECRET =
  process.env.API_JWT_SECRET ||
  process.env.AUTH_JWT_SECRET ||
  "dev_fallback_secret_change_me";

const TOKEN_TTL_HOURS = Number(
  process.env.API_TOKEN_TTL_HOURS ?? process.env.AUTH_TOKEN_TTL_HOURS ?? 12
);

function signToken(claims: Omit<AuthClaims, "iat" | "exp">) {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: `${TOKEN_TTL_HOURS}h` });
}

/* --------------------------- Middlewares ----------------------------- */

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  if (!header) {
    console.warn("[auth] Missing Authorization header");
    return res.status(401).json({ error: "Missing bearer token" });
  }
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    console.warn("[auth] Invalid Authorization format:", header);
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const decoded = jwt.verify(match[1], JWT_SECRET) as JwtPayload;

    const roles: Role[] = Array.isArray((decoded as any).roles)
      ? ((decoded as any).roles.filter((r: unknown) => (ROLES as readonly string[]).includes(r as Role)) as Role[])
      : [];

    const claims: AuthClaims = {
      sub: String(decoded.sub ?? ""),
      email: String((decoded as any).email ?? ""),
      name: String((decoded as any).name ?? ""),
      roles,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    req.user = claims;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRoles(...allowed: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const roles: Role[] = req.user?.roles ?? [];
    if (!allowed.some((r) => roles.includes(r))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

/* ----------------------------- DB helpers ---------------------------- */

async function getUserByEmail(email?: string | null) {
  if (!email) return null;
  const [row] = await db.select().from(users).where(eq(users.email, String(email))).limit(1);
  return row ?? null;
}

async function getUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

async function createUserInDb(params: {
  email: string;
  name: string;
  password: string;
  roles: Role[];
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  // Si ton schema a `displayName` => on alimente displayName
  // Si c'est `name` dans ta table, remplace ci-dessous par `name: params.name`
  await db.insert(users).values({
    email: params.email,
    displayName: params.name,
    passwordHash,
    roles: params.roles as unknown as string[], // selon ton type drizzle (text[])
  } as any);
  return getUserByEmail(params.email);
}

/* ----------------------------- Seed admin ---------------------------- */

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  if (!email || !pass) return;

  const exist = await getUserByEmail(email);
  if (exist) return;

  await createUserInDb({
    email,
    name: "Admin",
    password: pass,
    roles: ["admin", "staff", "tools", "volunteers", "lineup"],
  });
}
seedAdmin().catch(() => {});

/* ------------------------------ Routes ------------------------------ */

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "Missing email/password" });

  const user = await getUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(String(password), (user as any).passwordHash || "");
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const claims: Omit<AuthClaims, "iat" | "exp"> = {
    sub: String(user.id),
    email: String(user.email),
    name: String((user as any).displayName ?? ""), // ou user.name si ta colonne s'appelle name
    roles: ((user as any).roles ?? []) as Role[],
  };
  const token = signToken(claims);

  return res.json({
    id: user.id,
    name: (user as any).displayName ?? null,
    email: user.email,
    roles: (user as any).roles ?? [],
    token,
  });
});

// GET /auth/me (debug)
router.get("/me", requireAuth, async (req: AuthedRequest, res: Response) => {
  const u = await getUserById(String(req.user?.sub || ""));
  if (!u) return res.status(404).json({ error: "Not found" });
  return res.json({
    id: u.id,
    email: u.email,
    name: (u as any).displayName ?? null,
    roles: (u as any).roles ?? [],
  });
});

/* ------------------------------ Admin CRUD ------------------------------ */

const zCreate = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1),
  password: z.string().min(6),
  roles: z.array(z.enum(ROLES)).default([]),
});

router.get(
  "/users",
  requireAuth,
  requireRoles("admin"),
  async (_req: Request, res: Response) => {
    const rows = await db.select().from(users).orderBy(users.email);
    return res.json(
      rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: (u as any).displayName ?? null,
        roles: (u as any).roles ?? [],
      }))
    );
  }
);

router.post(
  "/users",
  requireAuth,
  requireRoles("admin"),
  async (req: Request, res: Response) => {
    const parsed = zCreate.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const { email, name, password, roles } = parsed.data;
    const exists = await getUserByEmail(email);
    if (exists) return res.status(409).json({ error: "Email exists" });

    const created = await createUserInDb({ email, name, password, roles });
    return res.status(201).json({
      id: created?.id,
      email: created?.email,
      name: (created as any)?.displayName ?? null,
      roles: (created as any)?.roles ?? [],
    });
  }
);

const zPatch = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  roles: z.array(z.enum(ROLES)).optional(),
});

router.patch(
  "/users/:id",
  requireAuth,
  requireRoles("admin"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const parsed = zPatch.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const patch = parsed.data;

    // email unique
    if (patch.email) {
      const other = await getUserByEmail(patch.email);
      if (other && String(other.id) !== id) {
        return res.status(409).json({ error: "Email exists" });
      }
    }

    const set: Record<string, unknown> = {};
    if (patch.name !== undefined) set.displayName = patch.name; // adapte si ta colonne est `name`
    if (patch.email !== undefined) set.email = patch.email;
    if (patch.roles !== undefined) set.roles = patch.roles;
    if (patch.password) set.passwordHash = await bcrypt.hash(patch.password, 10);

    if (Object.keys(set).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    await db.update(users).set(set as any).where(eq(users.id, id));

    const updated = await getUserById(id);
    if (!updated) return res.status(404).json({ error: "Not found" });

    return res.json({
      id: updated.id,
      email: updated.email,
      name: (updated as any).displayName ?? null,
      roles: (updated as any).roles ?? [],
    });
  }
);

router.delete(
  "/users/:id",
  requireAuth,
  requireRoles("admin"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    await db.delete(users).where(eq(users.id, id));
    return res.json({ ok: true });
  }
);

export default router;
