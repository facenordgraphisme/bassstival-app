import { pgTable, uuid, text, integer, timestamp, pgEnum,uniqueIndex, boolean, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm"; 



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

// utilisateurs + rôles --- //
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),                  // n’oublie pas l’unique index dans la migration
  displayName: text("display_name"),
  passwordHash: text("password_hash").notNull(),   // <-- NOUVEAU
  roles: text("roles").array().notNull().default(sql`'{}'::text[]`), // <-- NOUVEAU (array)
  createdAt: timestamp("created_at").defaultNow(),
});

// BOOKING ARTISTES

export const artistStatus = pgEnum("artist_status", ["prospect", "pending", "confirmed", "canceled"]);
export const bookingStatus = pgEnum("booking_status", ["draft", "confirmed", "played", "canceled"]);
export const stageEnum = pgEnum("stage", ["main", "second", "vip"]);
export const currencyEnum = pgEnum("currency", ["EUR"]); // extensible

export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  genre: text("genre"),
  agency: text("agency"),
  status: artistStatus("status").notNull().default("prospect"),
  notes: text("notes"),
  feeAmount: integer("fee_amount"),                 // en cents
  feeCurrency: currencyEnum("fee_currency").default("EUR"),
  hospitalityNotes: text("hospitality_notes"),
  techRider: text("tech_rider"),
  travelNotes: text("travel_notes"),
  pickupAt: timestamp("pickup_at"),
  pickupLocation: text("pickup_location"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const artistCosts = pgTable("artist_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id").references(() => artists.id, { onDelete: "cascade" }).notNull(),
  label: text("label").notNull(),
  amount: integer("amount").notNull(),        // cents
  currency: currencyEnum("currency").default("EUR"),
  paid: boolean("paid").notNull().default(false),
  notes: text("notes"),
});

export const artistContacts = pgTable("artist_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id").references(() => artists.id, { onDelete: "cascade" }).notNull(),
  name: text("name"),
  role: text("role"),             // manager, agent…
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").notNull().default(false),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id").references(() => artists.id, { onDelete: "cascade" }).notNull(),
  stage: stageEnum("stage"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: bookingStatus("status").notNull().default("draft"),
  feeAmount: integer("fee_amount"),                 // en cents
  feeCurrency: currencyEnum("fee_currency").default("EUR"),
  hospitalityNotes: text("hospitality_notes"),
  techRider: text("tech_rider"),
  travelNotes: text("travel_notes"),
  pickupAt: timestamp("pickup_at"),
  pickupLocation: text("pickup_location"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookingCosts = pgTable("booking_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  label: text("label").notNull(),                // cachet, hôtel, transport…
  amount: integer("amount").notNull(),          // en cents
  currency: currencyEnum("currency").default("EUR"),
  paid: boolean("paid").notNull().default(false),
  notes: text("notes"),
});