import { pgTable, uuid, text, integer, timestamp, pgEnum,uniqueIndex, boolean, numeric, primaryKey, jsonb, index } from "drizzle-orm/pg-core";
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
  team: teamEnum("team"),
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
  email: text("email").notNull(),
  displayName: text("display_name"),
  passwordHash: text("password_hash").notNull(),
  roles: text("roles").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uqEmail: uniqueIndex("uq_users_email").on(t.email),
}));
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

// --- POLLS v2 --- //
export const pollChoice = pgEnum("poll_choice", ["yes", "no", "abstain"]);

export const pollSurveys = pgTable("poll_surveys", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),                 // ex: "Prospects 2026 – House/Organic"
  description: text("description"),               // optionnel (contexte)
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollCandidates = pgTable("poll_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  surveyId: uuid("survey_id").references(() => pollSurveys.id, { onDelete: "cascade" }).notNull(),
  artistName: text("artist_name").notNull(),
  genre: text("genre").notNull(),
  youtubeLink: text("youtube_link").notNull(),
  imageUrl: text("image_url"),
  description: text("description"),
  order: integer("order").notNull().default(0),   // tri d'affichage
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollVotes = pgTable("poll_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id").references(() => pollCandidates.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  choice: pollChoice("choice").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  // 1 utilisateur = 1 vote par artiste
  uqCandidateUser: uniqueIndex("uq_pollvote_candidate_user").on(t.candidateId, t.userId),
}));

export const commChannel = pgEnum("comm_channel", [
  "instagram_post",
  "instagram_story",
  "instagram_reel",
  "facebook_post",
  "tiktok",
  "linkedin",
  "email",
  "site_page",
  "press",
]);

export const commStatus = pgEnum("comm_status", [
  "idea",
  "draft",
  "approved",
  "scheduled",
  "published",
  "canceled",
]);

export const commEvents = pgTable("comm_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  channels: commChannel("channels").array().notNull(),
  status: commStatus("status").notNull().default("idea"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  body: text("body"),
  hashtags: text("hashtags"),
  linkUrl: text("link_url"),
  assets: jsonb("assets").$type<{ kind: "image"|"video"; url: string; alt?: string }[]>().default(sql`'[]'::jsonb`),
  tags: text("tags").array(), // ex: ["artist","food","tickets"]
  extra: jsonb("extra").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
   byScheduled: index("ix_comm_events_scheduled_status").on(t.scheduledAt, t.status),
}));

export const commStatusHistory = pgTable("comm_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => commEvents.id, { onDelete: "cascade" }).notNull(),
  fromStatus: commStatus("from_status"),
  toStatus: commStatus("to_status").notNull(),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
  changedAt: timestamp("changed_at").defaultNow(),
  note: text("note"),
}, (t) => ({
  byEvent: index("ix_comm_status_history_event_time").on(t.eventId, t.changedAt),
}));

export const commPublications = pgTable("comm_publications", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  channels: commChannel("channels").array().notNull(),
  body: text("body").notNull(),
  hashtags: text("hashtags"),
  linkUrl: text("link_url"),
  assets: jsonb("assets").$type<{ kind: "image"|"video"; url: string; alt?: string }[]>().default(sql`'[]'::jsonb`),
  tags: text("tags").array(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  byUpdated: index("ix_comm_publications_updated").on(t.updatedAt),
}));

export const pubAction = pgEnum("pub_action", ["create", "update", "delete"]);

export const commPublicationHistory = pgTable("comm_publication_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicationId: uuid("publication_id")
    .references(() => commPublications.id, { onDelete: "cascade" })
    .notNull(),
  action: pubAction("action").notNull(),
  changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  changedFields: text("changed_fields").array().notNull().default([]), // ex: ["title","body"]
  before: jsonb("before"), // snapshot avant
  after: jsonb("after"),   // snapshot après
  note: text("note"),
}, (t) => ({
  byPublication: index("ix_comm_pub_history_publication_time").on(t.publicationId, t.changedAt),
}));