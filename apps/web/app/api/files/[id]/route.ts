import { getCtx } from "../../../../lib/services/ctx";
import { openFile } from "../../../../lib/services/files";
import { isImageType } from "@grove/core";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Guarded download: only members of the file's workspace get the bytes.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const ctx = await getCtx();
  const found = await openFile(ctx, id);
  if (!found) return new Response("Not found", { status: 404 });
  const { file, stream } = found;
  const download = new URL(request.url).searchParams.has("download");
  const inline = !download && (isImageType(file.contentType) || file.contentType === "application/pdf");
  const encoded = encodeURIComponent(file.name);
  return new Response(stream, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
