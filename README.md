# ARC Raiders Loot Recycler

Application monopage légère (React + TypeScript) pour gérer le loot ARC Raiders. Elle charge localement la dernière liste d’objets issue de l’API communautaire MetaForge, fusionne vos alias français et vos préférences issues du guide de recyclage, puis vous permet de classer chaque objet en GARDER, PEUT‑ÊTRE ou RECYCLER avec des filtres instantanés.

Données d’objets fournies par [MetaForge](https://metaforge.app/arc-raiders). Les catégories de recyclage proviennent de la communauté « ARC Raiders Recycling Cheat Sheet ».

## Fonctionnalités

- `data/items-base.json` mis en cache depuis l’API MetaForge (aucun appel runtime)
- Fusion facultative d’alias français manuels et du guide de recyclage
- Recherche tolérante aux accents sur les noms anglais/français + alias
- Filtres par catégorie, rareté, statut utilisateur et catégorie du guide (avec presets rapides)
- Sauvegarde locale (localStorage) des statuts GARDER/PEUT‑ÊTRE/RECYCLER avec alertes de conflit
- Bascule FR/EN pour les libellés de l’interface

## Démarrage

```bash
npm install
npm run update:items   # récupère le JSON MetaForge
npm run update:french  # importe les noms officiels depuis ARC Tracker
npm run update:guide   # parse l’article GameRant pour les catégories
npm run dev            # lance le serveur Vite
```

Ouvre l’URL locale affichée (par défaut `http://localhost:5173`).

> Si `data/items-base.json` manque, exécute d’abord `npm run update:items`.

## Build production

```bash
npm run build   # vérifie le typage puis build Vite -> dist/
npm run start   # sert la version buildée (alias vite preview --host)
```

Déploie le contenu de `dist/` sur un hébergeur statique ou via un simple serveur HTTP sur ton VPS.

## Rafraîchir les données

Le projet inclut trois scripts :

- `scripts/update-items.js` télécharge tout le catalogue MetaForge `/items` (toutes les pages) et l’écrit dans `data/items-base.json`.
- `scripts/update-french-aliases.js` appelle l’API [ARC Tracker](https://arctracker.io/fr/items) et fusionne chaque nom français dans `data/item-aliases.json` pour permettre la recherche en FR.
- `scripts/update-guide-from-gamerant.js` récupère l’article GameRant « safe-to-sell », parse le tableau et génère les métadonnées du guide.

```
npm run update:items   # met à jour les données MetaForge
npm run update:french  # rafraîchit les noms officiels FR
npm run update:guide   # rafraîchit les infos guide depuis GameRant
```

Committe les JSON mis à jour si tu veux qu’ils soient embarqués, puis rebuild.

## Fichiers de données personnalisables

Tout vit dans `data/` :

- `items-base.json` – réponse brute de l’endpoint MetaForge (scripté).
- `item-aliases.json` – map par `id` où `npm run update:french` stocke `name_fr` ; tu peux ajouter tes propres `aliases`.
- `french-dictionary.json` – mini dictionnaire EN→FR utilisé pour générer des tokens afin que la recherche reconnaisse tes requêtes françaises même sans alias.
- `guide-cheatsheet.json` – produit par le scraper GameRant : catégorie de guide, stations, quêtes, recommandations de vente, recyclages, etc.

Au démarrage, l’app fusionne toutes ces sources. Tout objet absent de `guide-cheatsheet.json` tombe par défaut dans la catégorie `NONE`.

## Préférences utilisateur & persistance

Application purement statique : les sélections GARDER/PEUT‑ÊTRE/RECYCLER sont stockées dans `localStorage` sous la clé `arcraiders:user-statuses`. Vider le stockage du navigateur réinitialise tout. Si un backend apparaît un jour, conserve la même structure pour rester compatible.

## Lint

`npm run lint` lance ESLint (config flat) sur le projet. Vite/TypeScript sont configurés en mode strict pour faciliter les refactorings sûrs.

## Crédits

- Métadonnées d’objets : [MetaForge](https://metaforge.app/arc-raiders) (respecte leurs conditions d’usage).
- Groupes de recyclage : ressource communautaire « ARC Raiders Recycling Cheat Sheet » (non parsée automatiquement – modifie `guide-cheatsheet.json` si besoin).
