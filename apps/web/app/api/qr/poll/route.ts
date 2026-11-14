import { allow, clientIp, tooManyRequests } from "../../../../lib/rate-limit";
import { pollQrLogin } from "../../../../lib/services/qr";

export async function POST(request: Request) {
  // The login page polls about every 2 seconds, so 60 a minute leaves room for a tab or two.
  if (!(await allow(`qr-poll:${clientIp(request)}`, 90, 60))) return tooManyRequests();
  const body = (await request.json().catch(() => ({}))) as { code?: string; pollSecret?: string };
  return Response.json(await pollQrLogin(body.code, body.pollSecret), { headers: { "Cache-Control": "no-store" } });
}
