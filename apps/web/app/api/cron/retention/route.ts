import { runRetention } from "../../../../lib/services/retention";

// Called once a day by Vercel Cron (see vercel.json). Vercel sends CRON_SECRET as a bearer token.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await runRetention(new Date());
  return Response.json(result);
}
