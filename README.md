# Halaq

Halaq is a Shariah stock screener for Muslim investors. It checks a stock
against AAOIFI and other published Islamic-finance standards and shows the
financial ratios and business-activity checks behind every verdict. The code is
a React + Vite single-page app, served with serverless API functions under
`api/` on Vercel, and packaged for Android and iOS with Capacitor.

- [SHARIAH.md](SHARIAH.md) — the single source of truth for the compliance
  methodology (standards, thresholds, and known gaps). Halaq surfaces
  guidance, not a fatwa.
- [DESIGN.md](DESIGN.md) — the design system.

## Requirements

- **Node.js** as declared in `package.json`: `>=24.22.1 <27` (and npm).
- A **Supabase** project for auth/data, and a **Lemon Squeezy** account for the
  optional billing features.

## Setup

1. Copy the environment template and fill in your values:

   ```sh
   cp .env.example .env
   ```

   The local API server reads `.env` via `node --env-file=.env` (Vite reads it
   too). VITE_-prefixed variables are exposed to the browser bundle; keep the
   server-only keys (service role key, API keys, webhook secret) unprefixed.

2. Install dependencies from the lockfile:

   ```sh
   npm ci
   ```

3. Start the UI and API together:

   ```sh
   npm run dev
   ```

   This runs `dev:ui` (Vite on http://localhost:3000) and `dev:api` (the Express
   dev server on http://localhost:3005) concurrently. Vite proxies `/api`
   requests to port 3005, and `server/index.js` mounts the functions in `api/`
   so local development uses the same code as production.

## Test and build

```sh
npm test          # node:test suite (test/**/*.test.js)
npm run build     # production Vite build -> dist/
npm run preview   # serve the built bundle locally
```

## Web deployment (Vercel)

Import the repository as a Vite project in Vercel. `vercel.json` already sets
the framework preset, `npm run build` as the build command, `dist` as the output
directory, and SPA rewrites. Set the same variables as `.env.example` in the
Vercel project environment (remember that VITE_ variables are baked in at build
time, so rebuild after changing them). Set `APP_ORIGIN` to your production
origin (or a comma-separated list) so the API CORS allowlist accepts the web
app; it falls back to `VITE_APP_URL`.

## Android / iOS (Capacitor)

For native builds, also copy `.env.android.example` to `.env.android` and set
`VITE_API_BASE_URL` to your deployed Vercel URL, plus the Supabase values.

```sh
npm run android:build   # vite build --mode android && cap sync android
npm run android:open    # open the Android project in Android Studio
npm run android:run     # build and run on a connected device/emulator
npm run android:apk     # release APK (android/gradlew assembleRelease)
npm run android:aab     # release App Bundle (android/gradlew bundleRelease)
npm run android:assets  # generate native icons/splash assets

npm run ios:build       # vite build --mode ios && cap sync ios
npm run ios:open        # open the iOS project in Xcode
npm run ios:run         # build and run on a connected device/simulator
```

Android and iOS projects live in `android/` and `ios/`; the Capacitor app id is
`com.halaq.app` and the web asset directory is `dist`.

## Native hardening: verified links, pinning, device integrity

### Verified deep links (do this before any release)

The legacy custom scheme `com.halaq.app://` is hijackable by another installed
app, so verified HTTPS links are the supported path:

- Android App Links: `https://halaq.app/...` (`android:autoVerify="true"` in
  `AndroidManifest.xml`).
- iOS Universal Links: `https://halaq.app/...` (`applinks:halaq.app` in
  `ios/App/App/App.entitlements`, enabled as the Associated Domains capability).

Both platforms fetch association files from the **domain root**. The checked-in
files contain **placeholders that MUST be replaced before release**:

| File | Placeholder | Replace with |
| --- | --- | --- |
| `public/.well-known/assetlinks.json` | `REPLACE_WITH_SHA256_FINGERPRINT` | SHA-256 fingerprint of the **release** signing certificate (64 hex chars) |
| `public/.well-known/apple-app-site-association` | `REPLACE_WITH_TEAM_ID` | Apple Developer Team ID (10 alphanumeric chars) |

Fill them with the helper script (it validates both values and rewrites the
files):

```sh
ANDROID_SHA256_FINGERPRINT=<64 hex chars> \
APPLE_TEAM_ID=<team id> \
npm run setup:associated-domains
```

The files must be publicly reachable with no redirects at:

- `https://halaq.app/.well-known/assetlinks.json`
- `https://halaq.app/.well-known/apple-app-site-association`

Vercel serves everything in `public/` from the root of the deployment (`dist/`),
so a normal redeploy publishes both files — verify with `curl` after deploying.
The app should be rebuilt (`npm run android:build` / `npm run ios:build`) after
changing them. Universal Links already flow through Capacitor's
`appUrlOpen` event; `src/main.jsx` accepts only `https://halaq.app/...` (exact
host, no userinfo, https only) and maps it onto the same allowlisted hash
routes as the custom scheme, rejecting every other host.

### Certificate pinning (disabled by default)

`android/app/src/main/res/xml/network_security_config.xml` is referenced from
the manifest, but its `<pin-set>` blocks are **intentionally commented out**.
Do not enable it as-is: the `REPLACE_WITH_BASE64_SPKI_SHA256_PIN` placeholders
are not real pins and would block all TLS traffic to Supabase and halaq.app.
To enable, generate real primary **and backup** pins per host, replace the
placeholders, uncomment the `<domain-config>` blocks, and check the expiration:

```sh
openssl s_client -connect <host>:443 -servername <host> </dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary | openssl base64
```

Test on a real device against production before shipping a pin-set.

### Root / jailbreak detection and screen shielding (non-blocking)

`MainActivity.java` adds `FLAG_SECURE` (blocks screenshots, recordings and
recent-app previews) and a conservative root heuristic; `AppDelegate.swift`
shows an opaque overlay while screen capture/AirPlay is active and uses a
jailbreak heuristic. Detection is a **warning signal only**: it logs to the
console and dispatches a `halaq:device-integrity` event with
`detail: { compromised: true }` that the web layer can listen for. It never
crashes, exits or blocks the app, and it is not a security boundary.
