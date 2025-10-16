CREATE TYPE "public"."artist_status" AS ENUM('prospect', 'pending', 'confirmed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('draft', 'confirmed', 'played', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('EUR');--> statement-breakpoint
CREATE TYPE "public"."stage" AS ENUM('main', 'second', 'vip');--> statement-breakpoint
CREATE TABLE "artist_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"name" text,
	"role" text,
	"email" text,
	"phone" text,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"genre" text,
	"agency" text,
	"status" "artist_status" DEFAULT 'prospect' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" "currency" DEFAULT 'EUR',
	"paid" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"stage" "stage",
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"status" "booking_status" DEFAULT 'draft' NOT NULL,
	"fee_amount" integer,
	"fee_currency" "currency" DEFAULT 'EUR',
	"hospitality_notes" text,
	"tech_rider" text,
	"travel_notes" text,
	"pickup_at" timestamp,
	"pickup_location" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "artist_contacts" ADD CONSTRAINT "artist_contacts_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_costs" ADD CONSTRAINT "booking_costs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;