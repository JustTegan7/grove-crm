import { api } from "../../../../../../lib/api/handler";
import { listFiles, uploadFile } from "../../../../../../lib/services/files";

// GET lists a business's files. POST takes multipart form data with a `file` field (a photo from the phone).
export const GET = api(async (ctx, _request, { id }) => ({ files: await listFiles(ctx, id) }));

export const POST = api(async (ctx, request, { id }) => {
  const form = await request.formData();
  return uploadFile(ctx, { contactId: id, file: form.get("file") });
});
