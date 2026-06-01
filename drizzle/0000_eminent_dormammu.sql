CREATE TABLE "todos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" bigint NOT NULL,
	"due_date" bigint NOT NULL,
	"completed_at" bigint,
	"completed" boolean DEFAULT false NOT NULL
);
