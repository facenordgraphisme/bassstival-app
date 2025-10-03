CREATE TYPE "public"."item_status" AS ENUM('open', 'returned');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "loan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"qty_out" integer NOT NULL,
	"qty_in" integer DEFAULT 0 NOT NULL,
	"status" "item_status" DEFAULT 'open' NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"borrower_name" text NOT NULL,
	"status" "loan_status" DEFAULT 'open' NOT NULL,
	"opened_at" timestamp DEFAULT now(),
	"closed_at" timestamp,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "loan_items" ADD CONSTRAINT "loan_items_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;