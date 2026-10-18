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
- Before every push, increment the application version in `package.json` and include the version change in the pushed commits. For a new feature, increment the minor version (the second number) and reset the patch to zero, for example `0.10.4` → `0.11.0`. For a fix, increment the patch version (the last number), for example `0.11.0` → `0.11.1`. Documentation-only and maintenance changes also require a patch increment. Follow an explicitly requested version when provided. `runtimeConfig.public.appVersion` reads this value automatically; do not hardcode a separate version in the UI.

## References

- `dashboard-ui-frontend/README.md`
- `dashboard-ui-frontend/.github/workflows/ci.yml`

## Validation

- Prefer targeted validation during implementation.
- Do not run `pnpm build` after every change.
- Run `pnpm run lint` and `pnpm run typecheck` once before completing substantial changes.
- For trivial or purely visual changes, run only the relevant checks.
- Do not repeat a successful validation unless relevant code changed afterward.
