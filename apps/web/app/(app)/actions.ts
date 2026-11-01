"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getCtx, type Ctx } from "../../lib/services/ctx";
import * as contacts from "../../lib/services/contacts";
import * as tasks from "../../lib/services/tasks";
import * as undo from "../../lib/services/undo";
import * as files from "../../lib/services/files";
import * as team from "../../lib/services/team";

// Thin wrappers: build ctx, call a service, refresh the pages.
export type ActionResult = { ok: true; message: string; id?: string; undo?: string } | { ok: false; error: string };

async function run(fn: (ctx: Ctx) => Promise<{ message: string; id?: string; undo?: string }>): Promise<ActionResult> {
  const ctx = await getCtx();
  try {
    const res = await fn(ctx);
    revalidatePath("/", "layout");
    return { ok: true, ...res };
  } catch (e) {
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the form." };
    if (e instanceof Error) return { ok: false, error: e.message };
    return { ok: false, error: "Something went wrong." };
  }
}

const formObj = (f: FormData) => Object.fromEntries([...f.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));

export async function createContactAction(f: FormData) {
  return run((ctx) => contacts.createContact(ctx, formObj(f)));
}
export async function updateContactAction(f: FormData) {
  return run((ctx) => contacts.updateContact(ctx, formObj(f)));
}
export async function moveStageAction(id: string, stageId: string) {
  return run((ctx) => contacts.moveStage(ctx, { id, stageId }));
}
export async function assignOwnerAction(id: string, ownerId: string) {
  return run((ctx) => contacts.assignOwner(ctx, { id, ownerId }));
}
export async function markRepliedAction(id: string) {
  return run((ctx) => contacts.markReplied(ctx, { id }));
}
export async function logActivityAction(f: FormData) {
  return run((ctx) => contacts.logActivity(ctx, formObj(f)));
}
export async function deleteContactAction(id: string) {
  return run((ctx) => contacts.deleteContact(ctx, { id }));
}
export async function completeTaskAction(id: string) {
  return run((ctx) => tasks.completeTask(ctx, { id }));
}
export async function snoozeTaskAction(id: string) {
  return run((ctx) => tasks.snoozeTask(ctx, { id }));
}
export async function decideAction(id: string, choice: "recycle" | "dnc") {
  return run((ctx) => tasks.decide(ctx, { id, choice }));
}
export async function createReminderAction(f: FormData) {
  return run((ctx) => tasks.createReminder(ctx, formObj(f)));
}
export async function undoAction(token: string) {
  return run((ctx) => undo.applyUndo(ctx, token));
}
export async function uploadFileAction(f: FormData) {
  return run((ctx) => files.uploadFile(ctx, { contactId: f.get("contactId"), file: f.get("file") }));
}
export async function deleteFileAction(id: string) {
  return run((ctx) => files.deleteFile(ctx, { id }));
}
export async function updateTaskAction(f: FormData) {
  return run((ctx) => tasks.updateTask(ctx, formObj(f)));
}
export async function deleteTaskAction(id: string) {
  return run((ctx) => tasks.deleteTask(ctx, { id }));
}
export async function findDuplicatesAction(name: string, phone: string) {
  const ctx = await getCtx();
  try {
    return await contacts.findDuplicates(ctx, { name, phone });
  } catch {
    return [];
  }
}
export async function setTemporaryPasswordAction(f: FormData) {
  return run((ctx) => team.setTemporaryPassword(ctx, formObj(f)));
}
