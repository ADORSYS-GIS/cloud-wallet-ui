# Cloud Wallet UI

A cloud wallet is a digital wallet hosted in the cloud that lets users securely store, manage, and use identity credentials from any device.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- ESLint (flat config)
- Prettier

## Quick start

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev`: start local development server.
- `npm run build`: type-check and create production build.
- `npm run lint`: run ESLint with warnings treated as errors.
- `npm run lint:fix`: auto-fix lint violations where possible.
- `npm run format`: check code formatting with Prettier.
- `npm run format:write`: write formatting changes.

## Project structure

```txt
src/
  api/          # API clients and endpoint modules
  components/   # Reusable UI components
  constants/    # App constants (routes, keys)
  hooks/        # Custom React hooks
  pages/        # Page-level components
  types/        # Shared TypeScript types
  utils/        # Utility helpers
```

## Environment variables

- `VITE_API_BASE_URL`: backend base URL (defaults to `http://localhost:8080`)
- `VITE_ALLOWED_CREDENTIAL_OFFER_HOSTS` (optional): comma-separated allowlist of `host[:port]` values for accepting *plain https* QR payloads as credential-offer URLs. If not set, the app only accepts plain `https` payloads whose path contains `credential-offer` (conservative default). `openid-credential-offer://...` links are accepted regardless.

Create a `.env` file in project root:

```bash
VITE_API_BASE_URL=http://localhost:8080
# Optional:
# VITE_ALLOWED_CREDENTIAL_OFFER_HOSTS=issuer.example.com,wallet.example.org
```

You can also copy `.env.example` to `.env` (or `.env.local`) and adjust values.

## GitFlow

Branching model and release workflow are documented in `docs/gitflow.md`.
