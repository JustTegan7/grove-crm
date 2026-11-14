import { handleWebhook } from "../../../../lib/services/billing";

// Stripe calls this when a subscription changes. The signature is checked inside handleWebhook.
export async function POST(request: Request) {
  const payload = await request.text();
  try {
    await handleWebhook(payload, request.headers.get("stripe-signature"));
    return Response.json({ received: true });
  } catch (e) {
    console.error("stripe webhook", e);
    return Response.json({ error: "Invalid webhook." }, { status: 400 });
  }
}
