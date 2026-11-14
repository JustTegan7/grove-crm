# Grove pricing and billing

All prices are placeholders. Change them in `packages/core/src/plans.ts` and nowhere else. Checkout builds its prices from that file, so Stripe needs no products or price ids.

## Plans
| Plan | Price | Notes |
| --- | --- | --- |
| Solo | $12 per month, flat | One user. |
| Team | $10 per user per month | Minimum 2 users, so $20 to start. |
| Dealership | $299 per rooftop per month | Covers 10 users. Extra users $15 each per month. |

- Every plan has a 14-day free trial with a card required up front.
- Pay yearly and get 2 months free (Solo $120 a year, Team $100 per user a year).
- Grove is included only with the Growth (3 users) and Elite (5 users) website packages (`INCLUDED_SEATS` in plans.ts). Ultra-Lite and Basic clients buy Grove at the standalone price. Grove is also sold on its own to people who do not need a website.

## Why these numbers (research, Nov 2026)
- Entry-level small business CRMs cost about $14 to $25 per user per month: Pipedrive and Zoho from $14, HubSpot Starter $15 to $20, Nutshell $13 to $19 on annual billing, Close Essentials $35. Grove undercuts all of them at $10 to $12 and is built for a person working from a phone. The tradeoff is less revenue per customer, so the plan is to win volume first and raise prices for new customers later while keeping early customers at their price.
- Dealership CRMs are mostly quote-only. Published numbers run from $299 a month (AutoRaptor, 3 to 5 users) and $498 a month flat (eCars) up to $1,000+ per rooftop for the big names. $299 for 10 users is at the low end on purpose, to land a first pilot store. Grove has no DMS, phone system or texting platform of its own, so pricing it near the big names would not hold. Raise it once Drivonic is connected and it replaces other tools.
- Sources checked: costbench.com and toolradar.com CRM price roundups, ddiy.co small business CRM comparison, telecrm.in automotive CRM pricing guide, dealerfunnel.com, fitgap.com. Vendor prices change, so recheck before launch.

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
