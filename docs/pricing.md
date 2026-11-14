# Grove pricing and billing

All prices are placeholders. Change them in `packages/core/src/plans.ts` and nowhere else. Checkout builds its prices from that file, so Stripe needs no products or price ids.

## Plans
| Plan | Price | Notes |
| --- | --- | --- |
| Solo | $19 per month, flat | One user. |
| Team | $15 per user per month | Minimum 2 users. |
| Dealership | $249 per rooftop per month | Covers 10 users. Extra users $12 each per month. |

- Every plan has a 14-day free trial with a card required up front.
- Pay yearly and get 2 months free.
- Evergreen website packages include Grove seats: Ultra-Lite 1, Basic 1, Growth 3, Elite 5 (placeholder numbers, `INCLUDED_SEATS` in plans.ts). Grove is also sold on its own to people who do not need a website.

## How access works
- New workspaces start with no subscription and are sent to /billing to start a trial with a card.
- Existing workspaces (Evergreen) were marked "comped" by migration 0006 and keep working free.
- Billing is off until `GROVE_BILLING=on` and `STRIPE_SECRET_KEY` are set in Vercel, so merging the code changes nothing by itself.
- Failed payments keep working while Stripe retries. A canceled subscription or an unfinished checkout blocks the workspace until an owner subscribes.

## Setting up Stripe (about 15 minutes, you do this part)
1. In Stripe, copy the secret key (test mode first). Add it to Vercel as `STRIPE_SECRET_KEY`.
2. In Stripe, Developers, Webhooks, add `https://www.thegrovecms.com/api/stripe/webhook` with these events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy its signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.
3. In Stripe, Settings, Billing, Customer portal, turn it on and allow card updates and cancellation.
4. Test with card 4242 4242 4242 4242 in test mode. Then add `GROVE_BILLING=on`, redeploy, and repeat with live keys.

## Giving someone free or included access
Run in the Neon SQL editor:
- Free (our team, demo and App Store review accounts): `update subscriptions set plan = 'comped', status = 'comped' where workspace_id = '<id>';`
- Included with a website package: `update subscriptions set plan = 'included', status = 'comped', included_seats = 3 where workspace_id = '<id>';`

## App Store rules
The iPhone app shows no prices and no purchase button. Sign-up and billing happen on the web. If a workspace has no active subscription, the phone shows a plain message telling the owner to manage billing on the web. Apple's rules for login-only business apps are in guideline 3.1.3, so confirm against the current text before submitting.
