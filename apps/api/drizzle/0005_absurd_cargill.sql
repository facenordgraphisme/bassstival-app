CREATE TABLE "artist_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" "currency" DEFAULT 'EUR',
	"paid" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "fee_amount" integer;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "fee_currency" "currency" DEFAULT 'EUR';--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "hospitality_notes" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "tech_rider" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "travel_notes" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "pickup_at" timestamp;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "pickup_location" text;--> statement-breakpoint
ALTER TABLE "artist_costs" ADD CONSTRAINT "artist_costs_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;