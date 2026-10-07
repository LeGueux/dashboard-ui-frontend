# Observatoire météo — version claire

Fond froid gris bleuté, instruments blancs, encre ardoise et bleu technique. L'ambre signale les relevés et alertes, les couleurs achat/vente restent réservées aux carnets. Aucun dégradé ni effet lumineux.

Toutes les villes restent visibles : bande compacte de températures actuelle/pic/heure locale, puis stations comparables. Sur PC dès 1200 px, deux stations se côtoient pour comparer les villes simultanément ; dès 1800 px, chaque station affiche la météo à gauche et ses carnets à droite, avec courbe de 160 px maximum. Cette disposition permet de voir les courbes et les premiers marchés de deux villes sur le premier écran. Sur tablette, météo et marchés sont comparables dans chaque station. Mobile : stations empilées, synthèse deux colonnes et relevés quatre colonnes. Les ancres de synthèse font simplement défiler vers une station.

Le wiki devient un annuaire de stations en tableau, regroupé par fuseau, avec heures, trading/dust, unités, sources météo et résolution. Sur téléphone le tableau défile horizontalement dans son conteneur ; les contrôles restent accessibles au-dessus.

Composables, données, tri et calculs existants conservés. Fonctionnalités conservées : filtre 99.9¢, aide et conversions, replis villes/fuseaux, sources, courbes et survol/focus, modèles/relevés/signaux, asks/bids/spreads/rendements, recherche et tous les filtres du wiki. Aucune fixture et aucune modification backend.

Veille météo est la disposition initiale. Le sélecteur permet aussi de choisir Comparatif, Dossiers ou Parcours, sur les deux pages et sans changer le thème ni les données. Voir [LAYOUTS.md](LAYOUTS.md) pour les caractéristiques de chaque disposition.

Les styles sont limités à leur disposition par l'attribut `data-layout`. Les calculs, filtres et flux restent partagés. Le cookie de préférence permet de conserver le choix entre les pages et d'appliquer la disposition dès le rendu serveur.
