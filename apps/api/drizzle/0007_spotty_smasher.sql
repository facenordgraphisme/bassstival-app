-- ENUM (idempotent)
DO $$
BEGIN
  CREATE TYPE "public"."poll_choice" AS ENUM ('yes','no','abstain');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- TABLE poll_votes (v1) : ne crée que si elle N'EXISTE PAS (on ne touche pas aux schémas déjà en place)
DO $$
BEGIN
  IF to_regclass('public.poll_votes') IS NULL THEN
    CREATE TABLE "public"."poll_votes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "poll_id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "choice" "public"."poll_choice" NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  END IF;
END $$;

-- TABLE polls : crée seulement si absente
CREATE TABLE IF NOT EXISTS "public"."polls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "genre" text NOT NULL,
  "youtube_link" text NOT NULL,
  "image_url" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- FK poll_votes.poll_id -> polls.id : n'ajoute la contrainte que si la colonne poll_id existe ET la contrainte n'existe pas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='poll_votes' AND column_name='poll_id'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='poll_votes_poll_id_polls_id_fk'
  ) THEN
    ALTER TABLE "public"."poll_votes"
      ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk"
      FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- FK poll_votes.user_id -> users.id : guard idem
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='poll_votes' AND column_name='user_id'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='poll_votes_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "public"."poll_votes"
      ADD CONSTRAINT "poll_votes_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- FK polls.created_by -> users.id : guard idem
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='polls' AND column_name='created_by'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='polls_created_by_users_id_fk'
  ) THEN
    ALTER TABLE "public"."polls"
      ADD CONSTRAINT "polls_created_by_users_id_fk"
      FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- INDEX unique v1 (poll_id, user_id) : ne crée que si la colonne poll_id existe ET si l'index n'existe pas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='poll_votes' AND column_name='poll_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind='i' AND c.relname='uq_poll_votes_poll_user' AND n.nspname='public'
  ) THEN
    CREATE UNIQUE INDEX "uq_poll_votes_poll_user" ON "public"."poll_votes" ("poll_id","user_id");
  END IF;
END $$;
