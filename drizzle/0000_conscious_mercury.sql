-- Baseline migration. The catalog DB was originally created with `drizzle-kit
-- push`, so the first 7 tables already exist in production; IF NOT EXISTS makes
-- this migration a safe no-op for them and creates only the new `leads` table.
-- Every schema change from here uses `db:generate` + `db:migrate`.
CREATE TABLE IF NOT EXISTS "artworks" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"style" text NOT NULL,
	"medium" text NOT NULL,
	"year" integer,
	"dimensions" text,
	"aspect_ratio" real DEFAULT 0.75 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"order" integer NOT NULL,
	"description" text,
	"image" text NOT NULL,
	"palette" jsonb,
	"status" text DEFAULT 'archive' NOT NULL,
	"price_inr" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_date" timestamp with time zone NOT NULL,
	"category" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"style" text,
	"size" text,
	"budget" text,
	"timeline" text,
	"brief" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintainers" (
	"email" text PRIMARY KEY NOT NULL,
	"name" text,
	"is_root" boolean DEFAULT false NOT NULL,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workshops" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"blurb" text NOT NULL,
	"duration_hours" real,
	"order" integer NOT NULL
);
