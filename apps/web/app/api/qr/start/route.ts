import { startQrLogin } from "../../../../lib/services/qr";

export async function POST() {
  return Response.json(await startQrLogin(), { headers: { "Cache-Control": "no-store" } });
}
