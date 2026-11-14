# App Store checklist (Grove v2)

## Before building
- [ ] Pull requests merged and Vercel deploy is green; migrations applied.
- [ ] Test on a real phone with Expo Go (`cd apps/mobile && npm install && npx expo start`).
- [ ] Vercel env vars set: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`. Optional: `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM`.

## Reviewer demo account (isolated from Evergreen data)
1. On Vercel set `GROVE_OPEN_SIGNUP=true` and redeploy.
2. On thegrovecms.com create a login with a dedicated email (for example appreview@evergreendigitalco.com) and a strong password.
3. On the Set up your grove screen, name it "Demo Auto Group", pick Small business.
4. Owner, Import from CSV, upload `docs/demo-leads.csv`.
5. Set `GROVE_OPEN_SIGNUP` back to `false` (or delete it) and redeploy.
6. Put the email and password in App Store Connect, App Review Information, Sign-in required.

## Build and submit
1. `npm i -g eas-cli`, `eas login`, then in `apps/mobile` run `eas init`.
2. `eas build --platform ios --profile production` (EAS will ask to sign in to Apple and create certificates).
3. `eas submit --platform ios`.
4. In App Store Connect fill in the listing below, attach the build, and submit for review.

## Listing text
- **Name**: Grove
- **Subtitle**: A CRM with nothing in the way
- **Category**: Business
- **Description**: Grove keeps your leads and follow-ups in one simple place. See what is due today, call or text with one tap, copy a ready-made message, move businesses through your pipeline, and log notes from anywhere. Your team shares the same list, so nobody double-contacts a lead.
- **Keywords**: crm,leads,sales,follow up,pipeline,field sales
- **Support URL**: https://thegrovecms.com
- **Privacy policy URL**: https://thegrovecms.com/privacy
- **Review notes**: Grove is a login-only business tool. Sign in with the demo account above. Scan to log in (More tab) is optional and needs the website login page open on a computer. Account deletion is in the More tab. Payments are handled outside the app and the app sells nothing.

## Privacy answers (App Store Connect)
- Data collected, linked to the user: name and email (account), contact info you enter about businesses (phone, email), user content (notes). Used for app functionality only. No tracking, no ads.
- Camera: only to scan the login QR code.

## Screenshots
6.9 inch iPhone size is required. Take them from the demo account: Today, Pipeline, a business profile, Businesses search.
