import { pollQrLogin } from "../../../../lib/services/qr";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string; pollSecret?: string };
  return Response.json(await pollQrLogin(body.code, body.pollSecret), { headers: { "Cache-Control": "no-store" } });
}
