# Quatre dispositions blanc et bleu

Cette branche réunit Veille météo, Comparatif, Dossiers et Parcours sur les routes `/` et `/weather-links`.

Le sélecteur reste accessible en haut de page : boutons sur PC, liste native sur téléphone. Le cookie `dust-layout` conserve le choix pendant un an sur le navigateur courant ; le serveur applique ce choix dès le premier rendu. Un cookie inconnu revient à Veille météo.

Les présentations partagent les calculs et les flux existants. Changer de mode ne remonte pas le composant du tableau : les filtres, conversions et villes repliées restent en place. Le répertoire conserve aussi sa recherche et ses filtres pendant la bascule. Les filtres de page gardent leur comportement initial lors d'une navigation vers une autre page ou d'un rechargement.

Les styles propres à chaque disposition vivent dans `app/assets/css/layouts/` et sont limités par `[data-layout]`. La palette commune et le sélecteur vivent dans `app/assets/css/main.css`. La liste des choix est dans `app/composables/useDashboardLayout.ts`. Les templates conditionnels de `HomeDustMarkets.vue` et `weather-links.vue` permettent de retirer une présentation sans modifier les calculs partagés.

## Aperçu local

`http://127.0.0.1:3024/` utilise le relais de comparaison sur le port 3098 et l'état réel enregistré le 3 octobre 2026 à 15:56 UTC. La configuration locale est ignorée par Git. L'application continue à utiliser `NUXT_PUBLIC_INGEST_BACKEND_URL` pour se connecter au backend déployé.

Le script `../start-ux-previews.ps1` relance les aperçus locaux. Cette branche ne modifie pas le déploiement de production.

## Validation

- ESLint, vérification TypeScript et compilation Nuxt de production.
- Les quatre dispositions, sur les deux pages, à 1920 × 1080 et 390 × 844 : aucun débordement global.
- Même inventaire sur l'état enregistré : 8 courbes, 16 carnets, 51 stations et 47 liens de résolution.
- Filtre asks 99,9¢ : 16 → 6 carnets, conservé en changeant de mode ; Tous restaure les 16.
- Recherche Helsinki conservée pendant la bascule ; choix conservé entre les pages et après rechargement.

La dépendance Vue Router émet l'avertissement préexistant concernant `vue-router/volar/sfc-route-blocks` pendant le contrôle TypeScript ; celui-ci se termine sans erreur.
