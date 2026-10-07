# Vignette de partage Dust

Image : `public/social/dust-weather-markets-v1.png` (PNG opaque, 1731 × 909, environ 1,4 Mo).

Le visuel reprend le thème blanc-bleu du dashboard, avec la marque Dust, une carte de stations et une courbe d'observation prolongée par une prévision. Il s'agit d'une illustration, sans valeurs de marchés inventées. Création avec l'outil intégré **imagegen**, sans API ou script externe.

Les métadonnées Open Graph et Twitter sont définies dans `app/app.vue` et présentes dans le HTML rendu côté serveur. L'URL de l'image est absolue et pointe vers le fichier public du site de production. Chaque page conserve son URL Open Graph ; titre, description et image sont communs au projet.

Pour remplacer le visuel à l'avenir, créer un nouveau nom de fichier et mettre à jour son URL ainsi que ses dimensions dans les métadonnées.

## Prompt utilisé

```text
Use case: ads-marketing. Asset type: a finished Open Graph social sharing image for DUST, a multi-city weather and Polymarket temperature-market dashboard. Generate a wide landscape 1200 x 630 pixel composition, 1.91:1 aspect ratio. Primary request: an original, striking but restrained white-and-blue weather observatory graphic that reads immediately in a small Discord link preview. The real app is white, slate and technical blue (#2465a4, #174e83, #eef2f5), with a tiny amber accent for measured temperatures. Art direction: crisp Swiss editorial typography and flat technical weather illustration, confidently composed with substantial whitespace, sharp lines, no 3D, no glow, no glass panels, no gradients, no generic SaaS screenshot. A unified illustration connects several city station markers on a subtly outlined Europe map with a temperature observation curve that transitions from solid blue into a dashed forecast; a simple cloud and sun motif completes the weather identity. No numerical values, no fake market data, no stock-market candlesticks. Large highly legible exact word 'DUST' as the dominant brand, with exact French subtitle 'Veille météo & marchés' below in clear substantial sans serif type. These are the only words. The map and curve must be a coherent illustration rather than an array of dashboard cards. Keep the headline uncluttered and the illustration balanced within generous safe margins. The finished graphic should feel like an elegant weather publication cover, specific to the project, with strong blue visual identity, on an opaque white background. No watermark, no external brand logos, no Discord interface, no tiny labels.
```
