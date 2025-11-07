DO $$
BEGIN
  CREATE TYPE "public"."comm_channel" AS ENUM (
    'instagram_post','instagram_story','instagram_reel',
    'facebook_post','tiktok','linkedin','email','site_page','press'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "public"."comm_status" AS ENUM (
    'idea','draft','approved','scheduled','published','canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE "comm_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"channel" "comm_channel" NOT NULL,
	"status" "comm_status" DEFAULT 'idea' NOT NULL,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"body" text,
	"hashtags" text,
	"link_url" text,
	"assets" jsonb DEFAULT '[]'::jsonb,
	"tags" text[],
	"extra" jsonb DEFAULT '{}'::jsonb,
	"owner_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comm_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"channel" "comm_channel" NOT NULL,
	"body" text NOT NULL,
	"hashtags" text,
	"link_url" text,
	"assets" jsonb DEFAULT '[]'::jsonb,
	"tags" text[],
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "comm_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"from_status" "comm_status",
	"to_status" "comm_status" NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp DEFAULT now(),
	"note" text
);
--> statement-breakpoint
ALTER TABLE "comm_events" ADD CONSTRAINT "comm_events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comm_publications" ADD CONSTRAINT "comm_publications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comm_status_history" ADD CONSTRAINT "comm_status_history_event_id_comm_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."comm_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comm_status_history" ADD CONSTRAINT "comm_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ix_comm_events_scheduled_status" ON "comm_events" USING btree ("scheduled_at","status");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_comm_publications_updated" ON "comm_publications" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_comm_status_history_event_time" ON "comm_status_history" USING btree ("event_id","changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "users" USING btree ("email");