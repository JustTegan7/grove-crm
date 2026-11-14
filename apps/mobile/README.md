# Grove iPhone app (v2)

Expo (React Native) app. Bundle ID `com.thegrovecms.app`, URL scheme `grove`.

It talks to the web app's `/api/v1` routes with a Better Auth bearer token kept in the phone's secure storage. Date rules and brand colors are imported from `packages/core` and `packages/brand` (see `lib/shared.ts`), so the phone and web agree.

This folder is not an npm workspace. Install and run it on its own:

```
cd apps/mobile
npm install
EXPO_PUBLIC_API_URL=https://thegrovecms.com npx expo start     # scan with Expo Go on your phone
npx tsc --noEmit                                                # typecheck
```

Screens: login, Today (complete, tomorrow, copy message, call, text), Pipeline, Businesses (search), business profile (stage, notes, tasks, history), new lead, and Scan to log in (QR login for the web).

## Putting it on the App Store

1. Apple Developer Program account (paid, yearly).
2. `npm i -g eas-cli`, then `eas login`, and `eas init` in this folder.
3. `eas build --platform ios --profile production` (cloud build, no Mac needed).
4. `eas submit --platform ios` and fill in the App Store Connect listing (screenshots, privacy answers, a demo login for review).

Not done yet: push reminders, offline capture, direct photo upload.
