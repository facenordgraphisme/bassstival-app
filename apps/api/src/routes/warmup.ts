import { Router } from "express";
import { db } from "../drizzle/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ ok: true, ts: new Date().toISOString() });
  } catch (e) {
    console.error("Warmup error:", e);
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

export default router;
