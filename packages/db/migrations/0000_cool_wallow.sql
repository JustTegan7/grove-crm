CREATE TYPE "public"."account_type" AS ENUM('door_to_door', 'small_business', 'big_business', 'dealership');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('call', 'text', 'email', 'note', 'reply', 'stage', 'system');--> statement-breakpoint
CREATE TYPE "public"."cadence_behavior" AS ENUM('start', 'stop', 'none');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('email', 'call', 'text');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'manager', 'salesperson');--> statement-breakpoint
CREATE TYPE "public"."stage_group" AS ENUM('active', 'won', 'parked');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('followup', 'decide', 'manual', 'client', 'resurface');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('Ultra-Lite', 'Basic', 'Growth', 'Elite');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"type" "activity_type" NOT NULL,
	"body" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cadence_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"day" integer NOT NULL,
	"channel" "channel" NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"niche" text,
	"source" text,
	"stage_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"contact_name" text,
	"contact_role" text,
	"phone" text,
	"email" text,
	"website" text,
	"social" text,
	"notes" text,
	"tier" "tier",
	"site_url" text,
	"launch_date" date,
	"checkin_frequency_days" integer,
	"cadence_active" boolean DEFAULT false NOT NULL,
	"cadence_done" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"cadence_started_on" date,
	"last_activity_at" timestamp with time zone,
	"stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "role" DEFAULT 'salesperson' NOT NULL,
	"color" text DEFAULT '#4FB39C' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	"color" text NOT NULL,
	"group" "stage_group" NOT NULL,
	"cadence_behavior" "cadence_behavior" DEFAULT 'none' NOT NULL,
	"checkin_days" integer,
	"resurface_days" integer,
	"clears_tasks" boolean DEFAULT false NOT NULL,
	"is_default_new" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"contact_id" uuid,
	"kind" "task_kind" NOT NULL,
	"channel" "channel",
	"title" text NOT NULL,
	"note" text,
	"due_date" date NOT NULL,
	"done_at" timestamp with time zone,
	"cadence_step_id" uuid,
	"owner_id" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"timezone" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_signups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_signups_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"account_type" "account_type" DEFAULT 'small_business' NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"template" text DEFAULT 'agency' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_steps" ADD CONSTRAINT "cadence_steps_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_cadence_step_id_cadence_steps_id_fk" FOREIGN KEY ("cadence_step_id") REFERENCES "public"."cadence_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_contact_created" ON "activities" USING btree ("contact_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activities_ws_updated" ON "activities" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "cadence_steps_ws" ON "cadence_steps" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "contacts_ws_stage" ON "contacts" USING btree ("workspace_id","stage_id");--> statement-breakpoint
CREATE INDEX "contacts_owner" ON "contacts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "contacts_ws_updated" ON "contacts" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_ws_user" ON "memberships" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stages_ws_key" ON "pipeline_stages" USING btree ("workspace_id","key");--> statement-breakpoint
CREATE INDEX "tasks_ws_due_open" ON "tasks" USING btree ("workspace_id","due_date") WHERE "tasks"."done_at" is null and "tasks"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "tasks_contact" ON "tasks" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "tasks_ws_updated" ON "tasks" USING btree ("workspace_id","updated_at");