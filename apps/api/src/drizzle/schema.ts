import { pgTable, uuid, text, integer, timestamp, pgEnum,uniqueIndex } from "drizzle-orm/pg-core";


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

// --- BÉNÉVOLES --- //
export const teamEnum = pgEnum("team", [
  "bar",
  "billetterie",
  "parking",
  "bassspatrouille",
  "tech",
  "autre",
]);

export const roleEnum = pgEnum("role_key", [
  "admin",
  "coordo",
  "chef_equipe",
  "staff",
]);

export const volunteers = pgTable("volunteers", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  team: teamEnum("team").notNull().default("autre"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shifts = pgTable("shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  team: teamEnum("team").notNull(),
  title: text("title").notNull(),          // Ex: "Service Bar 18-21"
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  capacity: integer("capacity").notNull().default(1),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  shiftId: uuid("shift_id").references(() => shifts.id, { onDelete: "cascade" }).notNull(),
  volunteerId: uuid("volunteer_id").references(() => volunteers.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("uq_assignment").on(t.shiftId, t.volunteerId),
}));

export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  assignmentId: uuid("assignment_id")
    .references(() => assignments.id, { onDelete: "cascade" })
    .notNull(),
  checkinAt: timestamp("checkin_at"),
  checkoutAt: timestamp("checkout_at"),
  status: text("status").notNull().default("pending"), // pending|in|done|no_show
}, (t) => ({
  uqAssignment: uniqueIndex("uq_checkins_assignment").on(t.assignmentId), // 👈 ajouté
}));

// --- (optionnel v2) utilisateurs + rôles --- //
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: roleEnum("role").notNull().default("staff"),
  team: teamEnum("team"), // Ex: chef d’équipe limité à son team
  createdAt: timestamp("created_at").defaultNow(),
});