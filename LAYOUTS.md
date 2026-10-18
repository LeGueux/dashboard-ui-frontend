# Deux dispositions blanc et bleu

La page des marchés (`/`) propose Veille météo et Dossiers. Le répertoire Stations & sources (`/weather-links`) utilise uniquement Dossiers.

- **Veille météo** : synthèse de toutes les villes, puis panneaux météo et marchés par ville.
- **Dossiers** : navigation latérale, grandes lignes par ville et fiches de stations détaillées.

Le sélecteur reste accessible en haut de la page des marchés : boutons sur PC, liste native sur téléphone. Le cookie `dust-layout` conserve le choix pendant un an sur le navigateur courant ; le serveur applique ce choix dès le premier rendu. Un cookie inconnu ou correspondant à une disposition supprimée revient à Veille météo et est remplacé. Le répertoire n'affiche pas ce sélecteur et ne modifie pas la préférence des marchés.

Les présentations des marchés partagent les calculs et les flux existants. Changer de mode ne remonte pas le composant du tableau : les filtres, conversions et villes repliées restent en place. Le répertoire conserve ses fonctions de recherche, de filtrage et de regroupement par fuseau. Les filtres de page gardent leur comportement initial lors d'une navigation vers une autre page ou d'un rechargement.

Les styles propres à chaque disposition vivent dans `app/assets/css/layouts/` et sont limités par `[data-layout]`. La palette commune et le sélecteur vivent dans `app/assets/css/main.css`. La liste des choix est dans `app/composables/useDashboardLayout.ts` et les templates conditionnels des marchés sont dans `HomeDustMarkets.vue`. La page `weather-links.vue` contient un seul template ; son layout dédié `app/layouts/directory.vue` applique Dossiers dès le rendu serveur, sans lire ni écrire la préférence des marchés. La hauteur réservée au sélecteur y est nulle pour replacer la navigation et l'index des fuseaux.

## Utilisation et configuration

Lancer `pnpm dev` dans le projet et ouvrir `http://localhost:3005/` pour choisir la présentation des marchés. Ouvrir `http://localhost:3005/weather-links` pour le répertoire en Dossiers.

L'application utilise `NUXT_PUBLIC_INGEST_BACKEND_URL` pour se connecter au backend, comme auparavant. Aucun état de démonstration, relais de comparaison ou fichier extérieur au projet n'est requis. La configuration locale `.env` reste ignorée par Git. Consulter [README.md](README.md) pour les commandes et les origines CORS.

## Validation de l'intégration initiale (avant unification du répertoire)

- ESLint, vérification TypeScript et compilation Nuxt de production.
- Les dispositions conservées, sur les deux pages, à 1920 × 1080 et 390 × 844 : aucun débordement global.
- Même inventaire sur l'état enregistré : 8 courbes, 16 carnets, 51 stations et 47 liens de résolution.
- Filtre asks 99,9¢ : 16 → 6 carnets, conservé en changeant de mode ; Tous restaure les 16.
- Recherche Helsinki conservée pendant la bascule ; choix conservé entre les pages et après rechargement.
- Rendu serveur de chaque choix ; retour à Veille météo pour un cookie inconnu.

La dépendance Vue Router émet l'avertissement préexistant concernant `vue-router/volar/sfc-route-blocks` pendant le contrôle TypeScript ; celui-ci se termine sans erreur.
