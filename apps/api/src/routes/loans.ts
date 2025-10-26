import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../drizzle/db";
import { loans, loanItems } from "../drizzle/schema";
import { and, ilike, eq, sql, exists, or } from "drizzle-orm";
import { validateBody, validateQuery } from "../utils/validate";

type LoanStatus = "open" | "closed";
const router = Router();

const zCreateLoan = z.object({
  borrowerName: z.string().min(1),
  note: z.string().optional().nullable(),
  items: z.array(
    z.object({
      itemName: z.string().min(1),
      qtyOut: z.number().int().positive().optional().default(1),
      note: z.string().optional().nullable(),
    })
  ).optional(),
});

const zPatchLoan = z.object({
  borrowerName: z.string().min(1).optional(),
  note: z.string().optional().nullable(),
});

const zAddItem = z.object({
  itemName: z.string().min(1),
  qtyOut: z.number().int().positive().optional().default(1),
  note: z.string().optional().nullable(),
});

const zReturnItem = z.object({
  qtyIn: z.number().int().nonnegative().default(0),
});

const zListLoansQuery = z.object({
  status: z.enum(["open","closed"]).optional(),
});

const zSearchLoansQuery = z.object({
  q: z.string().min(1),
  status: z.enum(["open","closed"]).optional(),
});

/** Créer une fiche + items optionnels */
router.post("/", validateBody(zCreateLoan), async (req: Request, res: Response) => {
  try {
    const { borrowerName, note, items } = req.validated as z.infer<typeof zCreateLoan>;

    const created = await db.insert(loans).values({ borrowerName, note }).returning();
    const loan = created[0];
    if (!loan) return res.status(500).json({ error: "Création fiche échouée" });

    if (items?.length) {
      const rows = items.map(i => ({
        loanId: loan.id as string,
        itemName: i.itemName.trim(),
        qtyOut: i.qtyOut ?? 1,
        note: i.note ?? null,
      }));
      await db.insert(loanItems).values(rows);
    }

    return res.status(201).json({ id: loan.id });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Lister toutes les fiches */
router.get("/", validateQuery(zListLoansQuery), async (req: Request, res: Response) => {
  try {
    const { status } = req.q as z.infer<typeof zListLoansQuery>;
    const rows = status
      ? await db.select().from(loans).where(eq(loans.status, status as LoanStatus)).orderBy(loans.openedAt)
      : await db.select().from(loans).orderBy(loans.openedAt);

    return res.json(rows);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// Recherche par nom d'emprunteur ET/OU nom d'objet
router.get("/search", validateQuery(zSearchLoansQuery), async (req: Request, res: Response) => {
  try {
    const { q, status } = req.q as z.infer<typeof zSearchLoansQuery>;
    const pattern = `%${q}%`;

    const itemsExist = exists(
      db.select({ one: sql`1` })
        .from(loanItems)
        .where(and(eq(loanItems.loanId, loans.id), ilike(loanItems.itemName, pattern)))
        .limit(1)
    );

    const whereBase = or(ilike(loans.borrowerName, pattern), itemsExist);

    const matchedLoans = await db
      .select()
      .from(loans)
      .where(status ? and(whereBase, eq(loans.status, status as LoanStatus)) : whereBase)
      .orderBy(loans.openedAt);

    const allMatches: Array<{ loanId: string; itemName: string }> = await db
      .select({ loanId: loanItems.loanId, itemName: loanItems.itemName })
      .from(loanItems)
      .where(ilike(loanItems.itemName, pattern));

    const response = matchedLoans.map((loan) => {
      const matchedItems = allMatches
        .filter((it) => it.loanId === loan.id)
        .map((it) => it.itemName)
        .slice(0, 3);
      return { ...loan, matchedItems };
    });

    res.json(response);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Détail fiche (+ items) */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const loanRows = await db.select().from(loans).where(eq(loans.id, id)).limit(1);
    const loan = loanRows[0];
    if (!loan) return res.status(404).json({ error: "Fiche introuvable" });

    const items = await db.select().from(loanItems).where(eq(loanItems.loanId, id));
    return res.json({ ...loan, items });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Modifier fiche (nom, note) */
router.patch("/:id", validateBody(zPatchLoan), async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const { borrowerName, note } = req.validated as z.infer<typeof zPatchLoan>;
    const patch: any = {};
    if (borrowerName !== undefined) patch.borrowerName = borrowerName;
    if (note !== undefined) patch.note = note ?? null;

    if (!Object.keys(patch).length) return res.json({ ok: true });
    await db.update(loans).set(patch).where(eq(loans.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Clôture forcée */
router.patch("/:id/close", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    await db.update(loans).set({ status: "closed" as LoanStatus, closedAt: new Date() }).where(eq(loans.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Ajouter un item à une fiche */
router.post("/:id/items", validateBody(zAddItem), async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const { itemName, qtyOut, note } = req.validated as z.infer<typeof zAddItem>;
    const [inserted] = await db.insert(loanItems).values({
      loanId: id,
      itemName,
      qtyOut: qtyOut ?? 1,
      note: note ?? null,
    }).returning();

    return res.status(201).json(inserted);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Retour partiel/total d’un item */
router.patch("/:id/items/:itemId/return", validateBody(zReturnItem), async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;
    if (!id || !itemId) return res.status(400).json({ error: "id/itemId manquant" });

    const { qtyIn } = req.validated as z.infer<typeof zReturnItem>;
    const itemRows = await db.select().from(loanItems).where(eq(loanItems.id, itemId)).limit(1);
    const item = itemRows[0];
    if (!item || item.loanId !== id) return res.status(404).json({ error: "Ligne introuvable" });

    const newQtyIn = Math.min(item.qtyIn + (qtyIn ?? 0), item.qtyOut);
    const newStatus = newQtyIn === item.qtyOut ? "returned" : "open";

    await db.update(loanItems).set({ qtyIn: newQtyIn, status: newStatus as any }).where(eq(loanItems.id, itemId));

    const remaining = await db.select().from(loanItems).where(eq(loanItems.loanId, id));
    const allReturned = remaining.length > 0 && remaining.every((r) => r.status === "returned");
    if (allReturned) {
      await db.update(loans).set({ status: "closed" as LoanStatus, closedAt: new Date() }).where(eq(loans.id, id));
    }

    return res.json({ ok: true, autoClosed: allReturned });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Supprimer un item */
router.delete("/:id/items/:itemId", async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    if (!itemId) return res.status(400).json({ error: "itemId manquant" });

    await db.delete(loanItems).where(eq(loanItems.id, itemId));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Supprimer une fiche (et ses items via FK cascade) */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    await db.delete(loans).where(eq(loans.id, id));
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

export default router;
