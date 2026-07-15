# AGENTS.md

Nuxt 4 dashboard frontend for displaying bot data.

## What this project is

- Nuxt 4 app using TypeScript and Nuxt UI.
- Fetches bot state from an ingest backend.
- Uses client/server composables and SSR-aware data loading.
- Managed with `pnpm`.

## Run and dev commands

- Install dependencies: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Preview production build: `pnpm preview`
- Lint: `pnpm run lint`
- Typecheck: `pnpm run typecheck`

## Key files

- `nuxt.config.ts` — application config and public runtime config.
- `app/` — layouts, pages, and components.
- `app/composables/useDustMarkets.ts` — fetches `/state` and `/events` from ingest backend.
- `app/composables/useWeatherLinks.ts` — fetches `/weather-links`.
- `app/pages/` — dashboard, weather links, settings pages.

## Agent guidance

- Preserve SSR/client separation in Nuxt and do not force a browser-only solution where server-side fetch is appropriate.
- Use `publicConfig.ingestBackendUrl` or `NUXT_PUBLIC_INGEST_BACKEND_URL` for backend URL configuration.
- Follow existing TypeScript and ESLint conventions.

## References

- `dashboard-ui-frontend/README.md`
- `dashboard-ui-frontend/.github/workflows/ci.yml`
