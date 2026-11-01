"use client";

import { useRef } from "react";
import { FILE_MAX_BYTES, FILE_TYPES, formatBytes, isImageType } from "@grove/core";
import { deleteFileAction, uploadFileAction } from "../../app/(app)/actions";
import { useAct } from "./useAct";
import { useToast } from "./Toast";

export type FileView = { id: string; name: string; contentType: string; size: number; date: string };

const ACCEPT = [...Object.keys(FILE_TYPES), ...Object.values(FILE_TYPES).map((e) => `.${e}`)].join(",");

export function FilesBox({ contactId, files }: { contactId: string; files: FileView[] }) {
  const { act, pending } = useAct();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > FILE_MAX_BYTES) {
      toast("Files can be up to 4 MB for now.", "error");
      return;
    }
    const f = new FormData();
    f.set("contactId", contactId);
    f.set("file", file);
    act(() => uploadFileAction(f), () => { if (input.current) input.current.value = ""; });
  }

  return (
    <section className="card space-y-4 p-5" aria-labelledby="h-files">
      <div className="flex items-center justify-between gap-2">
        <h2 id="h-files" className="font-bold">Files</h2>
        <label className={`btn btn-soft btn-sm cursor-pointer ${pending ? "opacity-60" : ""}`}>
          {pending ? "Uploading..." : "Add file"}
          <input ref={input} type="file" accept={ACCEPT} className="sr-only" disabled={pending} onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-muted">No files yet. Screenshots, proposals and contracts go here (up to 4 MB each).</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {files.map((f) => (
            <li key={f.id} className="overflow-hidden rounded-lg border border-line">
              <a href={`/api/files/${f.id}`} target="_blank" rel="noopener" className="block">
                {isImageType(f.contentType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${f.id}`} alt={f.name} loading="lazy" className="h-24 w-full bg-surface-2 object-cover" />
                ) : (
                  <span className="flex h-24 items-center justify-center bg-surface-2 text-sm font-bold uppercase text-muted">{f.name.split(".").pop()}</span>
                )}
              </a>
              <div className="space-y-1 p-2">
                <p className="truncate text-xs font-semibold" title={f.name}>{f.name}</p>
                <p className="text-[11px] text-muted">{formatBytes(f.size)} · {f.date}</p>
                <div className="flex gap-1">
                  <a href={`/api/files/${f.id}?download`} className="btn btn-ghost btn-sm px-1.5 text-xs">Download</a>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm px-1.5 text-xs text-overdue"
                    disabled={pending}
                    onClick={() => { if (confirm(`Remove ${f.name}? This deletes the file for everyone.`)) act(() => deleteFileAction(f.id)); }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
