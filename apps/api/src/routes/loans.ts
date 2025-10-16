import { Router, Request, Response } from "express";
import { db } from "../drizzle/db";
import { loans, loanItems } from "../drizzle/schema";
import { and, or, ilike, eq, sql, exists } from "drizzle-orm";

type LoanStatus = "open" | "closed";
const router = Router();

/** Créer une fiche + items optionnels */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { borrowerName, note, items } = req.body || {};
    if (!borrowerName || typeof borrowerName !== "string") {
      return res.status(400).json({ error: "borrowerName requis" });
    }

    const created = await db.insert(loans).values({ borrowerName, note }).returning();
    const loan = created[0];
    if (!loan) return res.status(500).json({ error: "Création fiche échouée" });

    // Ajout éventuel d’items
    if (Array.isArray(items) && items.length > 0) {
      const rows = items
        .map((i: any) => ({
          loanId: loan.id as string,
          itemName: String(i?.itemName ?? "").trim(),
          qtyOut: Number(i?.qtyOut) || 1,
          note: i?.note ?? null,
        }))
        .filter((v) => v.itemName.length > 0);

      if (rows.length) await db.insert(loanItems).values(rows);
    }

    return res.status(201).json({ id: loan.id });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Lister toutes les fiches */
router.get("/", async (req: Request, res: Response) => {
  try {
    const q = req.query.status as LoanStatus | undefined;
    if (q && q !== "open" && q !== "closed") {
      return res.status(400).json({ error: "status doit être 'open' ou 'closed'" });
    }

    const rows = q
      ? await db.select().from(loans).where(eq(loans.status, q)).orderBy(loans.openedAt)
      : await db.select().from(loans).orderBy(loans.openedAt);

    return res.json(rows);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

// Recherche par nom d'emprunteur ET/OU nom d'objet
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    const status = (req.query.status as "open" | "closed" | undefined) || undefined;
    if (!q) return res.json([]);

    const pattern = `%${q}%`;

    // 1) d’abord on récupère les loans qui matchent nom ou items
    const itemsExist = exists(
      db
        .select({ one: sql`1` })
        .from(loanItems)
        .where(and(eq(loanItems.loanId, loans.id), ilike(loanItems.itemName, pattern)))
        .limit(1)
    );

    const whereBase = or(ilike(loans.borrowerName, pattern), itemsExist);

    const matchedLoans = await db
      .select()
      .from(loans)
      .where(status ? and(whereBase, eq(loans.status, status)) : whereBase)
      .orderBy(loans.openedAt);

    // 2) ensuite, on récupère pour chaque loan les items qui matchent
    const allMatches: Array<{ loanId: string; itemName: string }> = await db
      .select({ loanId: loanItems.loanId, itemName: loanItems.itemName })
      .from(loanItems)
      .where(ilike(loanItems.itemName, pattern));

    // 3) On regroupe
    const response = matchedLoans.map((loan) => {
      const matchedItems = allMatches
        .filter((it) => it.loanId === loan.id)
        .map((it) => it.itemName)
        .slice(0, 3); // max 3 items
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
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const { borrowerName, note } = req.body || {};
    await db.update(loans).set({ borrowerName, note }).where(eq(loans.id, id));

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
router.post("/:id/items", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    if (!id) return res.status(400).json({ error: "id manquant" });

    const { itemName, qtyOut, note } = req.body || {};
    if (!itemName || typeof itemName !== "string") {
      return res.status(400).json({ error: "itemName requis" });
    }

    const inserted = await db.insert(loanItems).values({
      loanId: id,
      itemName,
      qtyOut: Number(qtyOut) || 1,
      note: note ?? null,
    }).returning();

    return res.status(201).json(inserted[0]);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
});

/** Retour partiel/total d’un item */
router.patch("/:id/items/:itemId/return", async (req: Request, res: Response) => {
  try {
    const { id, itemId } = req.params;
    if (!id || !itemId) return res.status(400).json({ error: "id/itemId manquant" });

    const qtyIn = Number(req.body?.qtyIn) || 0;

    const itemRows = await db.select().from(loanItems).where(eq(loanItems.id, itemId)).limit(1);
    const item = itemRows[0];
    if (!item || item.loanId !== id) return res.status(404).json({ error: "Ligne introuvable" });

    const newQtyIn = Math.min(item.qtyIn + qtyIn, item.qtyOut);
    const newStatus = newQtyIn === item.qtyOut ? "returned" : "open";

    await db.update(loanItems).set({ qtyIn: newQtyIn, status: newStatus as any }).where(eq(loanItems.id, itemId));

    // auto-close si tout est rendu
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
