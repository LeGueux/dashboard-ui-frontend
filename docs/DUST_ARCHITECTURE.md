# Architecture du tableau Dust

Le tableau utilise les conventions de Nuxt 4 : composants de présentation dans `app/components/home/`, état et orchestration réactive dans `app/composables/`, transformations déterministes dans `app/utils/`, contrats de données dans `app/types/`.

## Responsabilités

| Élément | Rôle |
| --- | --- |
| `HomeDustMarkets.vue` | Orchestration du tableau, filtre 99,9¢, panneaux repliés et horloge partagée. |
| `HomeDustControls.vue` | Commandes du filtre et convertisseur °C/°F ; son instance survit aux changements de disposition. |
| `HomeDustStationOverview.vue` | Raccourci vers une ville et une date, résumé et heure locale. |
| `HomeDustStationPanel.vue` | Assemblage d'un dossier, avertissement de date et contenu repliable. |
| `HomeDustStationHeader.vue` | Identité, pic, liens, source de résolution et variantes Veille météo/Dossiers. |
| `HomeDustStationClock.vue` | Heure, décompte de minuit et nombre de marchés urgents. |
| `HomeDustStationWeather.vue` | Prévisions, graphique, seuils et relevés METAR d'un seul jour. |
| `HomeDustCurrentWeather.vue` | Dernière température et condition, partagées entre les deux présentations. |
| `HomeDustWeatherFreshness.vue` | Fraîcheur de la collecte, actualisée à la cadence de 30 secondes. |
| `HomeDustOrderBook.vue` | Rendu d'un carnet dont les niveaux sont calculés avec `computed`. |
| `useDustMarkets.ts` | Transport HTTP et SSE, polling de secours et application commune des instantanés. |
| `useDustMarketGroups.ts` | Filtre, regroupement par ville/station/date et classement. |
| `useDustStation.ts` | Météo datée, pic, prévision métier et garde de date d'un dossier. |
| `useDustClock.ts` | Deux timers par tableau, fournis à ses descendants et arrêtés au démontage. |
| `useDustMarketLinks.ts` | Actions de menu et presse-papiers, avec notifications Nuxt UI. |
| `types/dust.ts` | Contrats communs des marchés, groupes, liens et instantanés météo. |
| `utils/dust*.ts` | Formatage, carnet, seuils, fuseaux, liens et géométrie du graphique. |

Les composants reçoivent les données via leurs props et signalent les actions via leurs événements ou `v-model`. Le flux réseau est ouvert une seule fois par la page. Les composants de station ne chargent pas eux-mêmes les marchés.

## Dépendances et performances

- L'horloge à la seconde n'est pas lue par le rendu du tableau, de l'en-tête complet, des carnets ou des instruments météo. Les heures et décomptes sont isolés ; les dates locales sont des valeurs calculées qui restent identiques entre deux minuits.
- Le classement conserve les objets groupes et leurs tableaux de marchés lorsque leur contenu et leur ordre restent identiques. Un tick de 30 secondes ne reconstruit donc pas les données passées aux composants météo.
- La géométrie est une fonction pure de la météo datée, des marchés, des prévisions et de la largeur. Chaque station possède sa propre valeur `computed` ; le redimensionnement d'une station n'invalide pas les autres graphiques.
- Chaque carnet nettoie et trie ses niveaux une seule fois par modification de ses dépendances, au lieu de recalculer ses asks et bids à chaque appel dans le template.
- Les deux présentations partagent le même arbre de composants et les mêmes règles métier. Le changement de disposition conserve les filtres, les conversions et les panneaux repliés.

Ces changements réduisent des invalidations et du travail répété. Ils ne constituent pas une mesure du temps CPU gagné ni une réduction garantie du JavaScript téléchargé. Le chargement différé pourra être ajouté si un profilage le justifie.

## Rendu serveur et évolutions

Le cookie de disposition reste appliqué dès le rendu serveur. Les horloges commencent à `null` et les timers, `EventSource`, `ResizeObserver` et actions du presse-papiers restent du côté client.

Le chargement initial des marchés reste effectué au montage du client, puis actualisé par SSE avec un polling de secours de cinq minutes. Ce refactoring conserve ce comportement. Un passage du premier instantané à `useAsyncData` ou `useFetch` devra traiter explicitement les réponses 204, les erreurs du backend, la transmission du payload à l'hydratation et la concurrence avec les mises à jour SSE.

Les règles métier indépendantes de Nuxt restent dans les utilitaires. Pour une migration du framework ou de Nuxt UI, adapter en priorité les composables d'intégration et les composants concernés ; éviter de réintroduire ces dépendances dans les calculs métier. Aucune directive ni bibliothèque globale d'état n'est nécessaire pour les responsabilités actuelles.

## Validation

```bash
pnpm run test:dust
pnpm run lint
pnpm run typecheck
pnpm run build
```

Les tests `scripts/dust.test.mjs` exécutent les fonctions et composables réels. Leur chargeur local résout les alias et auto-imports Vue utilisés par Nuxt ; il n'intervient pas dans l'application. Les données synthétiques restent limitées aux tests métier, sans état de démonstration dans le dashboard.

Vérifications effectuées lors du refactoring du 22 octobre 2026 :

- Neuf tests métier et de réactivité : niveaux du carnet, filtre 99,9¢, déduplication, changements de jour et d'année, séparation des journées, plages et conversions, échelle des courbes, stabilité des groupes et alertes après montage.
- Comparaison avec la version d'origine sur l'instantané réel enregistré du backend : mêmes valeurs affichées des carnets, relevés et seuils ; 8 stations, 16 carnets et 8 courbes.
- Captures avant/après des deux dispositions en 1920 × 1080 et 390 × 844 : mêmes dimensions de page, sans débordement horizontal global. Les heures, la fraîcheur et l'indicateur des DevTools évoluent entre les captures.
- Vingt-trois contrôles d'interface : filtre 16 → 6 → 16, conversion 20°C → 68°F, conservation des saisies et panneaux en changeant de mode, cookie après rechargement, rendu serveur du cookie et retour à Veille météo pour une valeur inconnue.
- Injection d'un événement SSE dans le navigateur de test pour vérifier un deuxième jour sans historique, sans écrire dans le backend ; retour à l'instantané original ensuite.
- Polling après une erreur SSE, fermeture du flux et arrêt du polling à la navigation ; répertoire de 51 stations et conservation de la disposition au retour.
- Aucune erreur JavaScript ni divergence d'hydratation pendant ces parcours. L'avertissement SSE provoqué pour tester le secours est attendu.
- ESLint, vérification TypeScript et compilation de production réussis. La version compilée a également été ouverte dans une session de navigateur vierge : 8 stations, 16 carnets, 8 courbes, disposition conservée après rechargement, aucune erreur JavaScript ou d'hydratation.

La compilation signale des avertissements de temps de plugins et de littéraux BigInt dans des chunks de dépendances ciblant ES2019. Elle se termine avec succès ; le serveur compilé a été vérifié sous le moteur Node.js 24 requis par le projet.

Les captures et traces locales vivent dans `output/playwright/` et `.playwright-cli/`, ignorés par Git.
