# Store checklist (Grove v2, iPhone and Android)

Billing stays off until `GROVE_BILLING=on` is set, and the phone app shows no prices or purchase screens, so reviewers never meet a paywall.

## Before building
- [ ] Pull requests merged in order and the Vercel deploy is green; migrations applied.
- [ ] Vercel env vars set: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`. Optional: `RESEND_API_KEY`, `EMAIL_FROM`.
- [ ] `support@evergreendigitalco.com` (set in `apps/web/lib/site-config.ts`) is a real mailbox you read. Both stores and the privacy page point to it.
- [ ] These pages load when logged out: /privacy, /support, /delete-account.
- [ ] Test on a real phone (Expo Go for the basics; push reminders need the EAS build).

## Reviewer demo account (isolated from Evergreen data)
1. On Vercel set `GROVE_OPEN_SIGNUP=true` and redeploy.
2. On thegrovecms.com create a login with a dedicated email (for example appreview@evergreendigitalco.com) and a strong password.
3. On the Set up your grove screen, name it "Demo Auto Group", pick Small business.
4. Owner, Import from CSV, upload `docs/demo-leads.csv`.
5. Set `GROVE_OPEN_SIGNUP` back to `false` (or delete it) and redeploy.
6. If billing is on, mark the demo workspace comped (SQL in `docs/pricing.md`) so the reviewer is never sent to billing.
7. Put the email and password in both consoles' review fields.

## Build and submit
1. `npm i -g eas-cli`, `eas login`, then in `apps/mobile` run `eas init` (first time only).
2. iPhone: `eas build --platform ios --profile production`, then `eas submit --platform ios`. EAS asks to sign in to Apple and makes the certificates.
3. Android: `eas build --platform android --profile production` (makes a signed .aab; let EAS create the keystore and keep it). The first upload to Google Play must be done by hand in Play Console (Production, Create release, upload the .aab). After that `eas submit --platform android` works once a Play service account key is set up.
4. Fill in the listings below, attach the build, answer the questionnaires, submit.

## Listing text (both stores)
- **Name**: Grove
- **Subtitle / short description**: A CRM with nothing in the way
- **Category**: Business
- **Full description**: Grove keeps your leads and follow-ups in one simple place. See what is due today, call or text with one tap, copy a ready-made message, move businesses through your pipeline, and log notes from anywhere. Your team shares the same list, so nobody double-contacts a lead.
- **Keywords (Apple)**: crm,leads,sales,follow up,pipeline,field sales
- **Support URL**: https://thegrovecms.com/support
- **Privacy policy URL**: https://thegrovecms.com/privacy
- **Account deletion URL (Google Play)**: https://thegrovecms.com/delete-account
- **Review notes**: Grove is a login-only business tool. Sign in with the demo account. Scan to log in (More tab) is optional and needs the website login page open on a computer. Account deletion is in the More tab. The app sells nothing and shows no prices.

## Apple: App Privacy answers
- Contact info (name, email, phone numbers of businesses the user enters), user content (notes, photos, files): linked to the user, used for app functionality only.
- Identifiers: device push token (only if reminders are on), app functionality only.
- Tracking: No. Ads: none.
- Camera: scanning the login QR and taking photos to attach. Photos: choosing a photo to attach.
- Encryption: standard HTTPS only (`ITSAppUsesNonExemptEncryption` is already false).

## Google Play: Data safety answers
- Data collected: Name, Email address, Phone number (of businesses entered), Photos, Other user content (notes, files), Device or other IDs (push token). All "collected", none "shared" with third parties for their own use. Providers that only process data for us (hosting, database, email, payments, push delivery) do not count as sharing.
- Purpose for all of it: App functionality, Account management.
- Encrypted in transit: Yes. Users can request deletion: Yes (in app and at the deletion URL above).
- Financial info: none collected by the app.
- Content rating questionnaire: business tool, no user-generated public content, no violence or mature content.
- Target audience: 18 and over. Not designed for children.
- Ads: none. App access: provide the demo login (Play Console, App content, App access).

## Screenshots
- iPhone 6.9 inch (required). Android phone: at least 2, 1080 wide or more. Take them from the demo account: Today, Pipeline, a business profile, Businesses search.
- Google Play also needs a 512x512 icon (use `apps/mobile/assets/icon.png` resized) and a 1024x500 feature graphic.

## Known limits
- No 2FA on Grove logins yet (back burner, see `docs/security.md`).
- Google Play personal developer accounts created after Nov 2023 must run a 14-day closed test with 12 testers before production. An organization account (Evergreen Digital Co. with a D-U-N-S number) skips that. Check which kind you have before planning "tonight".
