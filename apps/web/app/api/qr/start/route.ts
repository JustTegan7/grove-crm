import { allow, clientIp, tooManyRequests } from "../../../../lib/rate-limit";
import { startQrLogin } from "../../../../lib/services/qr";

export async function POST(request: Request) {
  if (!(await allow(`qr-start:${clientIp(request)}`, 10, 60))) return tooManyRequests();
  return Response.json(await startQrLogin(), { headers: { "Cache-Control": "no-store" } });
}
