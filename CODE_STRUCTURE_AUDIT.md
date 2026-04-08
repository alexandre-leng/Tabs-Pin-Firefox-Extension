# Audit de structuration du code — Tabs Pin (Firefox Extension)

Date: 2026-04-08

## Problèmes principaux identifiés

1. **Mélange de technologies incompatibles dans le dépôt**
   - Le projet est une extension Firefox (Manifest V2), mais `package.json` est configuré comme une application Next.js (`next dev`, `next build`, `next start`, `next lint`) et contient des dépendances React/Next/Tailwind qui ne sont pas utilisées par les fichiers d’extension présents.
   - Impact: confusion d’architecture, maintenance plus difficile, faux signaux de CI, onboarding ralenti.

2. **Absence de séparation claire des responsabilités côté front extension**
   - `popup/popup.js` et `options/options.js` regroupent logique métier, orchestration des données, i18n, gestion d’état UI, et manipulation DOM dans de gros fichiers monolithiques.
   - Impact: faible testabilité, complexité cyclomatique élevée, régressions plus probables.

3. **Code fortement orienté classes globales sans modules ESM**
   - `StorageManager` et `ContainerUtils` sont chargés via scripts globaux depuis `manifest.json` puis utilisés implicitement.
   - Impact: couplage implicite, dépendances non explicites, ordre de chargement fragile.

4. **Duplication de logique et de constantes métier**
   - Les catégories par défaut sont définies à plusieurs endroits (background et popup), avec logique i18n similaire.
   - Impact: risque de divergence fonctionnelle et incohérences UX.

5. **Niveau de logging trop verbeux en production**
   - De très nombreux `console.log`/`console.warn` sont présents dans le background, popup et utilitaires.
   - Impact: bruit de diagnostic, difficulté de tri des erreurs réelles, coût perf mineur mais constant.

6. **Présence de fichier TypeScript isolé hors architecture réelle**
   - `lib/utils.ts` (helper `cn` orienté React/Tailwind) ne s’inscrit pas dans le runtime extension actuel (scripts JS classiques).
   - Impact: dette technique et signal d’un socle front inachevé ou abandonné.

## Recommandations de restructuration (ordre prioritaire)

1. **Décider une direction d’architecture unique**
   - Soit extension “vanilla” (HTML/CSS/JS), soit extension packagée via bundler (Vite/esbuild/webpack) avec modules.
   - Nettoyer immédiatement `package.json` pour refléter la stratégie choisie.

2. **Modulariser la logique métier partagée**
   - Extraire dans `lib/` les services suivants:
     - `categories-service` (source unique des catégories)
     - `tabs-service` (CRUD + validation URL)
     - `message-bus` (contrats de messages runtime)

3. **Découper popup/options par couches**
   - `state/`, `services/`, `ui/`, `events/`.
   - Limiter chaque module à une responsabilité.

4. **Rendre les contrats explicites**
   - Définir un schéma de messages (`action`, payload, réponse, erreurs normalisées).
   - Ajouter des JSDoc types stricts (ou migrer en TypeScript de bout en bout).

5. **Mettre en place une stratégie de logs**
   - Wrapper logger (`debug/info/warn/error`) activable par flag.
   - Réduire les logs d’info en production.

6. **Ajouter des garde-fous qualité**
   - ESLint + Prettier adaptés au contexte extension.
   - Tests unitaires sur services purs (storage abstraction, normalisation URL, règles anti-duplication).

## Quick wins (faible effort / fort impact)

- Supprimer les dépendances non utilisées et scripts Next.js du `package.json`.
- Centraliser les catégories par défaut dans un seul module.
- Introduire un fichier de constantes de messages runtime.
- Encapsuler les accès DOM avec de petites fonctions utilitaires pour réduire le code impératif répétitif.

