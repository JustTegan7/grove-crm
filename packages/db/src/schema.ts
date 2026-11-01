import { sql } from "drizzle-orm";
import {
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
