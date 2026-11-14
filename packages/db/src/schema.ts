import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

const id = () => uuid("id").primaryKey().$defaultFn(() => uuidv7());
const stamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

// ---------- Better Auth tables (names and columns follow Better Auth's Drizzle schema) ----------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Grove extras
  timezone: text("timezone"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Grove ----------

export const accountType = pgEnum("account_type", ["door_to_door", "small_business", "big_business", "dealership"]);
export const role = pgEnum("role", ["owner", "manager", "salesperson"]);
export const stageGroup = pgEnum("stage_group", ["active", "won", "parked"]);
export const cadenceBehavior = pgEnum("cadence_behavior", ["start", "stop", "none"]);
export const channel = pgEnum("channel", ["email", "call", "text"]);
export const taskKind = pgEnum("task_kind", ["followup", "decide", "manual", "client", "resurface"]);
export const activityType = pgEnum("activity_type", ["call", "text", "email", "note", "reply", "stage", "system"]);
export const tier = pgEnum("tier", ["Ultra-Lite", "Basic", "Growth", "Elite"]);

export const workspaces = pgTable("workspaces", {
  id: id(),
  name: text("name").notNull(),
  accountType: accountType("account_type").notNull().default("small_business"),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  template: text("template").notNull().default("agency"),
  // "team": salespeople see everything. "own": salespeople see only their own businesses and tasks.
  visibility: text("visibility").notNull().default("team"),
  ...stamps,
});

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: role("role").notNull().default("salesperson"),
    color: text("color").notNull().default("#4FB39C"),
    ...stamps,
  },
  (t) => [uniqueIndex("memberships_ws_user").on(t.workspaceId, t.userId), index("memberships_user").on(t.userId)],
);

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: id(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    position: integer("position").notNull(),
    color: text("color").notNull(),
    group: stageGroup("group").notNull(),
    cadenceBehavior: cadenceBehavior("cadence_behavior").notNull().default("none"),
    checkinDays: integer("checkin_days"),
    resurfaceDays: integer("resurface_days"),
    clearsTasks: boolean("clears_tasks").notNull().default(false),
    isDefaultNew: boolean("is_default_new").notNull().default(false),
    ...stamps,
  },
  (t) => [uniqueIndex("stages_ws_key").on(t.workspaceId, t.key)],
);

export const cadenceSteps = pgTable(
  "cadence_steps",
  {
    id: id(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    channel: channel("channel").notNull(),
    position: integer("position").notNull(),
    ...stamps,
  },
  (t) => [index("cadence_steps_ws").on(t.workspaceId)],
);

// The UI calls these "Businesses".
export const contacts = pgTable(
  "contacts",
  {
    id: id(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    niche: text("niche"),
    source: text("source"),
    stageId: uuid("stage_id").notNull().references(() => pipelineStages.id),
    ownerId: text("owner_id").notNull().references(() => user.id),
    contactName: text("contact_name"),
    contactRole: text("contact_role"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    social: text("social"),
    notes: text("notes"),
    tier: tier("tier"),
    siteUrl: text("site_url"),
    launchDate: date("launch_date", { mode: "string" }),
    checkinFrequencyDays: integer("checkin_frequency_days"),
    cadenceActive: boolean("cadence_active").notNull().default(false),
    cadenceDone: uuid("cadence_done").array().notNull().default(sql`'{}'::uuid[]`),
    cadenceStartedOn: date("cadence_started_on", { mode: "string" }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    stageChangedAt: timestamp("stage_changed_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").references(() => user.id),
    ...stamps,
  },
  (t) => [
    index("contacts_ws_stage").on(t.workspaceId, t.stageId),
    index("contacts_owner").on(t.ownerId),
    index("contacts_ws_updated").on(t.workspaceId, t.updatedAt),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    kind: taskKind("kind").notNull(),
    channel: channel("channel"),
    title: text("title").notNull(),
    note: text("note"),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    doneAt: timestamp("done_at", { withTimezone: true }),
    cadenceStepId: uuid("cadence_step_id").references(() => cadenceSteps.id),
    ownerId: text("owner_id").notNull().references(() => user.id),
    createdBy: text("created_by").references(() => user.id),
    ...stamps,
  },
  (t) => [
    index("tasks_ws_due_open").on(t.workspaceId, t.dueDate).where(sql`${t.doneAt} is null and ${t.deletedAt} is null`),
    index("tasks_contact").on(t.contactId),
    index("tasks_ws_updated").on(t.workspaceId, t.updatedAt),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: id(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
    type: activityType("type").notNull(),
    body: text("body").notNull(),
    actorId: text("actor_id").references(() => user.id),
    ...stamps,
  },
  (t) => [
    index("activities_contact_created").on(t.contactId, t.createdAt.desc()),
    index("activities_ws_updated").on(t.workspaceId, t.updatedAt),
  ],
);

// Files attached to a business. The bytes live in a private Vercel Blob store;
// downloads always go through /api/files/[id], which checks the workspace.
export const contactFiles = pgTable(
  "contact_files",
  {
    id: id(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
    blobPathname: text("blob_pathname").notNull(),
    name: text("name").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    createdBy: text("created_by").references(() => user.id),
    ...stamps,
  },
  (t) => [index("contact_files_contact").on(t.contactId), index("contact_files_ws_updated").on(t.workspaceId, t.updatedAt)],
);

export const waitlistSignups = pgTable("waitlist_signups", {
  id: id(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Message templates a business edits for its own follow-ups. Merge fields look like {{business}}.
export const messageTemplates = pgTable(
  "message_templates",
  {
    id: id(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    channel: channel("channel").notNull(),
    // The cadence day this message is used for. Null means any day on that channel.
    day: integer("day"),
    subject: text("subject"),
    body: text("body").notNull(),
    createdBy: text("created_by").references(() => user.id),
    ...stamps,
  },
  (t) => [index("message_templates_ws").on(t.workspaceId, t.channel)],
);

// An owner invites a teammate by email. When that email signs up, they join with this role.
export const invites = pgTable(
  "invites",
  {
    id: id(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: role("role").notNull().default("salesperson"),
    invitedBy: text("invited_by").references(() => user.id),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...stamps,
  },
  (t) => [uniqueIndex("invites_ws_email").on(t.workspaceId, t.email), index("invites_email").on(t.email)],
);

// One row per workspace. The plan and status are what Grove checks; Stripe keeps them current through its webhook.
export const subscriptions = pgTable("subscriptions", {
  id: id(),
  workspaceId: uuid("workspace_id").notNull().unique().references(() => workspaces.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("solo"),
  status: text("status").notNull().default("incomplete"),
  interval: text("interval").notNull().default("month"),
  // Rooftops for dealership, otherwise unused.
  units: integer("units").notNull().default(1),
  // Users covered by an Evergreen website package when plan is "included".
  includedSeats: integer("included_seats").notNull().default(1),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  trialEndsOn: text("trial_ends_on"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  ...stamps,
}, (t) => [index("subscriptions_stripe_customer").on(t.stripeCustomerId)]);

// Request counters for rate limiting. Better Auth reads and writes this table for its own endpoints (so limits hold
// across Vercel instances), and lib/rate-limit.ts uses it for the QR login endpoints.
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// A phone that has allowed Grove to send reminders. One row per Expo push token.
export const pushDevices = pgTable("push_devices", {
  id: id(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull().default("ios"),
  ...stamps,
}, (t) => [index("push_devices_user").on(t.userId)]);

// Log in on the web by scanning a QR code with the phone app. Only hashes of the code and the
// poll secret are stored. The one-time token is cleared the moment the web browser collects it.
export const qrLogins = pgTable(
  "qr_logins",
  {
    id: id(),
    codeHash: text("code_hash").notNull().unique(),
    pollHash: text("poll_hash").notNull(),
    status: text("status", { enum: ["pending", "approved", "used"] }).notNull().default("pending"),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    oneTimeToken: text("one_time_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("qr_logins_expires").on(t.expiresAt)],
);
