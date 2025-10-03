import { pgTable, uuid, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";


export const loanStatus = pgEnum("loan_status", ["open", "closed"]);
export const itemStatus = pgEnum("item_status", ["open", "returned"]);


export const loans = pgTable("loans", {
    id: uuid("id").primaryKey().defaultRandom(),
    borrowerName: text("borrower_name").notNull(),
    status: loanStatus("status").notNull().default("open"),
    openedAt: timestamp("opened_at").defaultNow(),
    closedAt: timestamp("closed_at"),
    note: text("note"),
});


export const loanItems = pgTable("loan_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    loanId: uuid("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
    itemName: text("item_name").notNull(),
    qtyOut: integer("qty_out").notNull(),
    qtyIn: integer("qty_in").notNull().default(0),
    status: itemStatus("status").notNull().default("open"),
    note: text("note"),
});