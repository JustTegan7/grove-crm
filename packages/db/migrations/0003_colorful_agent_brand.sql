CREATE TABLE "qr_logins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"poll_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"user_id" text,
	"one_time_token" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qr_logins_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "qr_logins" ADD CONSTRAINT "qr_logins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "qr_logins_expires" ON "qr_logins" USING btree ("expires_at");