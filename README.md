# Cloud Wallet UI

Cloud Wallet UI is the frontend application for the EUDI Cloud Wallet experience.  
It allows users to register a wallet tenant, scan credential offers, complete issuance flows, and view stored credentials.

## Table of contents

- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Environment configuration](#environment-configuration)
- [Application routes](#application-routes)
- [Issuance flow](#issuance-flow)
- [Project structure](#project-structure)

## Technology stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- ESLint (flat config)
- Prettier
- Vitest

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

## Environment configuration

The application uses Vite environment variables.

- `VITE_API_BASE_URL`  
  Backend base URL. When `/api/v1` is missing, the app appends it automatically.  
  Example: `http://localhost:3000` becomes `http://localhost:3000/api/v1`.

- `VITE_ALLOWED_CREDENTIAL_OFFER_HOSTS` (optional)  
  Comma-separated allowlist of `host[:port]` values for plain `https` credential-offer payloads.  
  If omitted, the app only accepts conservative plain-HTTPS offers (path must contain `credential-offer`).  
  `openid-credential-offer://...` links remain accepted regardless.

Create `.env` in the project root:

```bash
VITE_API_BASE_URL=http://localhost:3000
# Optional:
# VITE_ALLOWED_CREDENTIAL_OFFER_HOSTS=issuer.example.com,wallet.example.org
```

You can also copy `.env.example` to `.env` (or `.env.local`) and adjust values.

## Application routes

| Route                              | Purpose                                                |
| ---------------------------------- | ------------------------------------------------------ |
| `/registration`                    | Initial tenant registration (first-time users).        |
| `/`                                | Home screen and entry point to scanning.               |
| `/scan`                            | QR scanner and credential-offer intake.                |
| `/credential-types`                | Credential types offered by issuer.                    |
| `/credential-types/:optionId`      | Selected credential type details and issuance actions. |
| `/issuance/success/:credentialId?` | Success state after issuance.                          |
| `/credentials`                     | Wallet credential list or empty state.                 |
| `/credentials/:credentialId`       | Credential details with reveal/hide controls.          |

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

## Project structure

```txt
src/
  api/          # API clients and endpoint modules
  auth/         # Tenant registration and auth initialization
  components/   # Reusable UI components
  constants/    # App constants (routes, keys)
  hooks/        # Custom React hooks
  pages/        # Page-level components
  state/        # Issuance flow state store/provider
  types/        # Shared TypeScript types
  utils/        # Utility helpers and parsers
  */tests/      # Unit tests grouped by feature
```
