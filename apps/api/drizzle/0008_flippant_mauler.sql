BEGIN;

-- 1) ENUM (idempotent)
DO $$ BEGIN
  CREATE TYPE "poll_choice" AS ENUM ('yes','no','abstain');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Tables sondage/candidats (idempotent)
CREATE TABLE IF NOT EXISTS "poll_surveys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "poll_candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "survey_id" uuid NOT NULL,
  "artist_name" text NOT NULL,
  "genre" text NOT NULL,
  "youtube_link" text NOT NULL,
  "image_url" text,
  "order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- 3) FKs pour surveys/candidates (sans IF NOT EXISTS -> try/catch)
DO $$ BEGIN
  ALTER TABLE "poll_surveys"
    ADD CONSTRAINT "poll_surveys_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "poll_candidates"
    ADD CONSTRAINT "poll_candidates_survey_id_poll_surveys_id_fk"
    FOREIGN KEY ("survey_id") REFERENCES "public"."poll_surveys"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4) Nettoyage ancienne table polls si elle existe
DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables
   WHERE table_schema='public' AND table_name='polls';
  IF FOUND THEN
    EXECUTE 'ALTER TABLE "polls" DISABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP TABLE "polls" CASCADE';
  END IF;
END $$;

-- 5) poll_votes (création/upgrade)
-- Crée si absente
CREATE TABLE IF NOT EXISTS "poll_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "candidate_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "choice" "poll_choice" NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Si la table existait déjà mais sans colonnes → les ajouter
ALTER TABLE "poll_votes" ADD COLUMN IF NOT EXISTS "candidate_id" uuid;
ALTER TABLE "poll_votes" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "poll_votes" ADD COLUMN IF NOT EXISTS "choice" "poll_choice";
ALTER TABLE "poll_votes" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();

-- Supprime anciennes contraintes/index si présents (noms potentiels), en try/catch
DO $$ BEGIN
  ALTER TABLE "poll_votes" DROP CONSTRAINT "poll_votes_poll_id_polls_id_fk";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "poll_votes" DROP CONSTRAINT "poll_votes_candidate_id_poll_candidates_id_fk";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "poll_votes" DROP CONSTRAINT "poll_votes_user_id_users_id_fk";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Ajoute les nouveaux FKs (try/catch)
DO $$ BEGIN
  ALTER TABLE "poll_votes"
    ADD CONSTRAINT "poll_votes_candidate_id_poll_candidates_id_fk"
    FOREIGN KEY ("candidate_id") REFERENCES "public"."poll_candidates"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "poll_votes"
    ADD CONSTRAINT "poll_votes_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index d’unicité (1 vote par (candidate,user))
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pollvote_candidate_user"
  ON "poll_votes" ("candidate_id","user_id");

-- Supprime l’ancienne colonne si elle existe
ALTER TABLE "poll_votes" DROP COLUMN IF EXISTS "poll_id";

COMMIT;
