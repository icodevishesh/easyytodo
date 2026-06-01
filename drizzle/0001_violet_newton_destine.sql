CREATE TYPE "public"."goal_status" AS ENUM('active', 'in_progress', 'achieved');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('work', 'short_break', 'long_break');--> statement-breakpoint
CREATE TABLE "pomodoro_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"todo_id" text NOT NULL,
	"weekly_goal_id" text,
	"type" "session_type" DEFAULT 'work' NOT NULL,
	"started_at" bigint NOT NULL,
	"ended_at" bigint,
	"duration_minutes" integer,
	"interrupted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_date" bigint NOT NULL,
	"end_date" bigint NOT NULL,
	"total_hours" integer DEFAULT 0 NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"review" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "weekly_goal_id" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "pomodoro_count" integer DEFAULT 0 NOT NULL;