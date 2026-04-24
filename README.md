# Dashboard UI (Nuxt 3)

Mini dashboard Nuxt 3 consommant `/state` et `/events` (SSE) depuis l'ingest-backend.

Run locally:

```bash
cd dashboard-ui-frontend
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run start
```

Notes:
- L'UI attend les endpoints `/state` et `/events` relatifs au même domaine. Configure un reverse-proxy si besoin.
- Dark / Light mode disponible et conservé via `useState` de Nuxt (runtime).
# dashboard-ui-frontend