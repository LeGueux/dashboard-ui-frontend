# Dust Dashboard Frontend

Frontend Nuxt 4 du dashboard Polymarket Dust. L'application affiche les marches dust envoyes par l'ingest backend, expose le wiki des liens meteo et quelques pages de configuration issues du dashboard.

## Prerequis

- Node.js 24 ou plus recent
- pnpm, via Corepack recommande

```bash
corepack enable
corepack prepare pnpm@11.23.0 --activate
```

Le gestionnaire de paquets officiel est `pnpm`. Le fichier de lock a conserver est [pnpm-lock.yaml](pnpm-lock.yaml). Ne pas utiliser `npm install`, qui genere un `package-lock.json` concurrent.

## Installation

```bash
pnpm install
```

## Configuration

Copier l'exemple d'environnement si besoin :

```bash
cp .env.example .env
```

Variable disponible :

```bash
NUXT_PUBLIC_INGEST_BACKEND_URL=https://api.legueux.xyz
```

Si elle n'est pas definie, Nuxt utilise la valeur par defaut configuree dans [nuxt.config.ts](nuxt.config.ts).

## Demarrage local

```bash
pnpm dev
```

Le dashboard est servi sur `http://localhost:3000` par defaut.

## Commandes utiles

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run preview
```

Note : `pnpm run lint` peut encore remonter des regles de formatage historiques dans certains fichiers Vue. `pnpm run typecheck` est la verification principale pour les changements fonctionnels.

## Structure principale

- [app/pages/index.vue](app/pages/index.vue) : page principale du dashboard dust
- [app/components/home/HomeDustMarkets.vue](app/components/home/HomeDustMarkets.vue) : cartes de marches et raccourcis meteo
- [app/pages/weather-links.vue](app/pages/weather-links.vue) : wiki des liens meteo par aeroport
- [app/composables/useDustMarkets.ts](app/composables/useDustMarkets.ts) : chargement des marches depuis l'ingest backend
- [app/composables/useWeatherLinks.ts](app/composables/useWeatherLinks.ts) : chargement du wiki meteo

## Deploiement

```bash
pnpm run build
```

Pour tester le build localement :

```bash
pnpm run preview
```
