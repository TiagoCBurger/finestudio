-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if profile table exists and has correct structure
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile') THEN
        CREATE TABLE "profile" (
            "id" text PRIMARY KEY NOT NULL,
            "created_at" timestamp DEFAULT now(),
            "updated_at" timestamp DEFAULT now(),
            "onboarded_at" timestamp,
            "credits" integer DEFAULT 100 NOT NULL,
            "credits_used" integer DEFAULT 0 NOT NULL
        );
    END IF;
END $$;

-- Check if project table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project') THEN
        CREATE TABLE "project" (
            "id" text PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
            "name" varchar NOT NULL,
            "transcription_model" varchar NOT NULL,
            "vision_model" varchar NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp,
            "content" json,
            "user_id" varchar NOT NULL,
            "image" varchar,
            "members" text[]
        );
    END IF;
END $$;

-- Check if credit_transactions table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'credit_transactions') THEN
        CREATE TABLE "credit_transactions" (
            "id" text PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
            "user_id" text NOT NULL,
            "amount" integer NOT NULL,
            "type" varchar NOT NULL,
            "model_used" varchar,
            "description" text,
            "metadata" json,
            "created_at" timestamp DEFAULT now() NOT NULL
        );
        
        ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_profile_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."profile"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;
