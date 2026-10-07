# Dust Dashboard Frontend

Frontend Nuxt 4 du dashboard Polymarket Dust. L'application affiche les marches dust envoyes par l'ingest backend, expose le wiki des liens meteo et quelques pages de configuration issues du dashboard.

## Dispositions du dashboard

Le dashboard et le répertoire des stations proposent quatre dispositions dans le même thème clair blanc et bleu : **Veille météo**, **Comparatif**, **Dossiers** et **Parcours**. Le sélecteur reste accessible en haut de page, avec des boutons sur PC et une liste sur téléphone.

Le choix est mémorisé sur le navigateur et appliqué dès le rendu serveur. Changer de disposition conserve les filtres, les conversions et les villes repliées du tableau, ainsi que la recherche et les filtres du répertoire. Toutes les dispositions utilisent les mêmes données et calculs du backend configuré.

Voir [LAYOUTS.md](LAYOUTS.md) pour les différences entre les dispositions et leur organisation dans le code.

## Prerequis

- Node.js 24.11 ou plus recent
- pnpm, via Corepack recommande

```bash
corepack enable
corepack prepare pnpm@12.8.1 --activate
```

Le gestionnaire de paquets officiel est `pnpm`. Le fichier de lock a conserver est [pnpm-lock.yaml](pnpm-lock.yaml). Ne pas utiliser `npm install`, qui genere un `package-lock.json` concurrent.

Les dependances directes utilisent des versions stables. TypeScript reste en `6.0.3`, derniere version compatible avec `typescript-eslint` et `vue-tsc`. `@tanstack/table-core` reste en `8.21.3` pour correspondre a l'API utilisee par Nuxt UI. Certaines dependances transitives du framework (notamment `h3`, `ofetch` et `unenv`) sont imposees en prerelease par les versions stables de Nuxt et Nitro.

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

Le dashboard est servi sur `http://localhost:3005` par defaut.

Pour utiliser `ingest-backend` en local, definir dans le `.env` du frontend :

```bash
NUXT_PUBLIC_INGEST_BACKEND_URL=http://localhost:3001
```

Dans le `.env` de `ingest-backend`, autoriser l'origine du dashboard :

```bash
UI_ORIGIN=http://localhost:3005
```

Redemarrer les services apres modification de leurs variables d'environnement. L'origine CORS doit correspondre exactement a l'adresse du dashboard, port compris.

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
