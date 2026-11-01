import "server-only";
import { del, get, put } from "@vercel/blob";
import { uuidv7 } from "uuidv7";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { activities, contactFiles, contacts } from "@grove/db";
import { FILE_MAX_BYTES, fileContentType, safeFileName } from "@grove/core";
import { db } from "../db";
import type { Ctx } from "./ctx";

export class FileError extends Error {}

function requireStore() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new FileError("File storage is not connected yet. Add a Blob store to the Vercel project.");
}

async function requireContact(ctx: Ctx, contactId: string) {
  const [c] = await db()
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.workspaceId, ctx.workspace.id), isNull(contacts.deletedAt)));
  if (!c) throw new FileError("That business was not found.");
}

export async function listFiles(ctx: Ctx, contactId: string) {
  return db()
    .select({ id: contactFiles.id, name: contactFiles.name, contentType: contactFiles.contentType, size: contactFiles.size, createdAt: contactFiles.createdAt, createdBy: contactFiles.createdBy })
    .from(contactFiles)
    .where(and(eq(contactFiles.contactId, contactId), eq(contactFiles.workspaceId, ctx.workspace.id), isNull(contactFiles.deletedAt)))
    .orderBy(desc(contactFiles.createdAt));
}

const uploadInput = z.object({ contactId: z.string().uuid(), file: z.instanceof(File, { message: "Choose a file." }) });

/** Stores a file privately in Vercel Blob under the workspace and business. */
export async function uploadFile(ctx: Ctx, raw: unknown) {
  const { contactId, file } = uploadInput.parse(raw);
  if (file.size === 0) throw new FileError("That file is empty.");
  if (file.size > FILE_MAX_BYTES) throw new FileError("Files can be up to 4 MB for now.");
  const type = fileContentType(file.name, file.type);
  if (!type) throw new FileError("That file type is not allowed. Use images, PDF, Word, Excel, PowerPoint, CSV or text.");
  requireStore();
  await requireContact(ctx, contactId);

  const id = uuidv7();
  const pathname = `ws/${ctx.workspace.id}/contacts/${contactId}/${id}-${safeFileName(file.name)}`;
  await put(pathname, file, { access: "private", contentType: type, addRandomSuffix: false });
  const name = file.name.slice(0, 200);
  await db().batch([
    db().insert(contactFiles).values({ id, workspaceId: ctx.workspace.id, contactId, blobPathname: pathname, name, contentType: type, size: file.size, createdBy: ctx.userId }),
    db().insert(activities).values({ workspaceId: ctx.workspace.id, contactId, type: "system", body: `Added file: ${name}`, actorId: ctx.userId }),
  ]);
  return { message: "File added." };
}

/** Removes the record and the stored bytes. Files are not undoable on purpose: deleting means gone. */
export async function deleteFile(ctx: Ctx, raw: unknown) {
  const { id } = z.object({ id: z.string().uuid() }).parse(raw);
  const [f] = await db()
    .select()
    .from(contactFiles)
    .where(and(eq(contactFiles.id, id), eq(contactFiles.workspaceId, ctx.workspace.id), isNull(contactFiles.deletedAt)));
  if (!f) throw new FileError("That file was not found.");
  requireStore();
  await del(f.blobPathname);
  await db().batch([
    db().update(contactFiles).set({ deletedAt: new Date() }).where(eq(contactFiles.id, id)),
    db().insert(activities).values({ workspaceId: ctx.workspace.id, contactId: f.contactId, type: "system", body: `Removed file: ${f.name}`, actorId: ctx.userId }),
  ]);
  return { message: "File removed." };
}

/** Opens a file for download after checking it belongs to the signed-in member's workspace. */
export async function openFile(ctx: Ctx, id: string) {
  const [f] = await db()
    .select()
    .from(contactFiles)
    .innerJoin(contacts, eq(contacts.id, contactFiles.contactId))
    .where(and(eq(contactFiles.id, id), eq(contactFiles.workspaceId, ctx.workspace.id), isNull(contactFiles.deletedAt), isNull(contacts.deletedAt)));
  if (!f) return null;
  requireStore();
  const res = await get(f.contact_files.blobPathname, { access: "private" });
  if (!res || res.statusCode !== 200) return null;
  return { file: f.contact_files, stream: res.stream };
}
