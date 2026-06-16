# Cloud Wallet UI

Cloud Wallet UI is the frontend application for the EUDI Cloud Wallet experience.  
It allows users to register a wallet tenant, scan credential offers, complete issuance and presentation flows, and view stored credentials.

## Table of contents

- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Environment configuration](#environment-configuration)
- [Application routes](#application-routes)
- [Issuance flow](#issuance-flow)
- [Presentation flow](#presentation-flow)
- [Project structure](#project-structure)

## Technology stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- ESLint (flat config)
- Prettier
- Vitest
- Playwright (e2e testing)

## Getting started

### Prerequisites

- Node.js 20+ (recommended)
- npm 10+ (recommended)

### Installation and local run

```bash
npm install
npm run dev
```

The app runs with Vite's default development server and hot module replacement.

## Available scripts

- `npm run dev` - Start the local development server.
- `npm run build` - Type-check and produce a production build.
- `npm run lint` - Run ESLint (warnings treated as errors).
- `npm run lint:fix` - Auto-fix lint issues where possible.
- `npm run format` - Check formatting with Prettier.
- `npm run format:write` - Write formatting updates.
- `npm run test` - Run unit tests with Vitest.
- `npm run build:e2e` - Type-check and build for end-to-end testing mode.
- `npm run test:e2e` - Run end-to-end tests with Playwright.
- `npm run preview` - Preview the production build locally.

## Environment configuration

The application uses Vite environment variables.

- `VITE_API_BASE_URL`  
  Backend base URL. When `/api/v1` is missing, the app appends it automatically.  
  Example: `http://localhost:3000` becomes `http://localhost:3000/api/v1`.

- `VITE_ALLOWED_CREDENTIAL_OFFER_HOSTS` (optional)  
  Comma-separated allowlist of `host[:port]` values for plain `https` credential-offer payloads.  
  If omitted, the app only accepts conservative plain-HTTPS offers (path must contain `credential-offer`).  
  `openid-credential-offer://...` links remain accepted regardless.

- `VITE_DEBUG_API` (optional)  
  Set to `true` to enable **`console.debug`** logging of all traffic from `apiGet` / `apiPost` and the issuance SSE stream (`useSseStream`): request method and path, redacted headers (`Authorization` is never logged in full), response status and JSON bodies, and parsed SSE events.  
  **Do not** enable in production builds. Leave unset (default) so no API traffic is logged.

- `VITE_E2E` (optional)  
  Set to `true` in e2e builds to enable test helpers (e.g., sample QR-code offers on the scan screen). **Do not** enable in production builds.

Create `.env` in the project root:

```bash
VITE_API_BASE_URL=http://localhost:3000
# Optional:
# VITE_ALLOWED_CREDENTIAL_OFFER_HOSTS=issuer.example.com,wallet.example.org
# VITE_DEBUG_API=true
# VITE_E2E=true
```

You can also copy `.env.example` to `.env` (or `.env.local`) and adjust values.

## Application routes

| Route                               | Purpose                                                |
| ----------------------------------- | ------------------------------------------------------ |
| `/registration`                     | Initial tenant registration (first-time users).        |
| `/`                                 | Home screen and entry point to scanning.               |
| `/scan`                             | QR scanner and credential-offer / presentation intake. |
| `/present`                          | Presentation request review (verifier details).        |
| `/present/details`                  | Proof details and consent screen (Share / Decline).    |
| `/present/success`                  | Success state after presentation submission.           |
| `/credential-types`                 | Credential types offered by issuer.                    |
| `/credential-types/:optionId`       | Selected credential type details and issuance actions. |
| `/issuance/success/:credentialId?`  | Success state after issuance.                          |
| `/credentials`                      | Wallet credential list or empty state.                 |
| `/credentials/:credentialId`        | Credential details with reveal/hide controls.          |
| `/credentials/:credentialId/remove` | Remove credential confirmation screen.                 |

All routes except `/registration` are protected and require a stored tenant ID.

## Issuance flow

1. User scans a credential-offer QR code on `/scan`.
2. Wallet validates and submits the offer to create an issuance session.
3. User accepts the offer and selects a credential type.
4. User starts issuance on the credential details screen.
5. Flow continues through one of:
   - redirect-based authorization,
   - pre-authorized flow with transaction code, or
   - direct issuance.
6. SSE events update processing state until completion or failure.
7. On success, user is redirected to `/issuance/success` and can open credential details.

## Presentation flow

1. User scans a verifier QR code or receives a deep link on `/scan`.
2. Wallet validates and submits the request to start a presentation session via `POST /presentation/start`.
3. Backend resolves the request, evaluates the DCQL query against stored credentials, and returns verifier metadata and credential matches.
4. User reviews verifier details, requested claims, and matched credentials on `/present/details`.
5. User consents (Share) or declines the presentation.
6. Backend builds and submits the VP Token to the verifier synchronously.
7. On success:
   - **Cross-device flow**: user is shown `/present/success` and the verifier has received the VP Token.
   - **Same-device flow**: the browser is redirected to the verifier's `redirect_uri`.

## Project structure

```txt
src/
  api/              # API clients and endpoint modules (grouped by feature)
  auth/             # Tenant registration and auth initialization
  components/       # Reusable UI components (grouped by feature)
  constants/        # App constants (routes, keys)
  e2e/              # End-to-end test helpers and sample data
  hooks/            # Custom React hooks
  pages/            # Page-level components (grouped by feature)
  state/            # Issuance and presentation flow state stores/providers
  types/            # Shared TypeScript types
  utils/            # Utility helpers and parsers (grouped by feature)
  */tests/          # Unit tests grouped by feature
```
