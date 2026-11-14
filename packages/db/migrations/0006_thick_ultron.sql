CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"plan" text DEFAULT 'solo' NOT NULL,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	"included_seats" integer DEFAULT 1 NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"trial_ends_on" text,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "subscriptions_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_customer" ON "subscriptions" USING btree ("stripe_customer_id");
--> statement-breakpoint
-- Every workspace that exists today keeps working free. Only workspaces created after billing goes live start a trial.
INSERT INTO "subscriptions" ("id", "workspace_id", "plan", "status") SELECT gen_random_uuid(), "id", 'comped', 'comped' FROM "workspaces" ON CONFLICT ("workspace_id") DO NOTHING;
