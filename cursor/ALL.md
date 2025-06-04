Ne produit pas de documentation mais met à jour le changelog

# Firefox Extension Development Guide

## Code Style and Structure

* Write clear, modular TypeScript code with explicit type definitions.
* Use functional programming patterns; avoid class-based implementations.
* Employ descriptive variable names (e.g., isLoading, hasPermission).
* Structure files logically into distinct directories: `popup`, `background`, `content_scripts`, `utils`.
* Implement thorough error handling and structured logging.
* Document code clearly with JSDoc comments.

## Architecture and Best Practices

* Strictly adhere to Firefox Manifest V3 specifications.
* Clearly separate responsibilities between background scripts, content scripts, and popup scripts.
* Configure permissions following the principle of least privilege.
* Use modern build tools such as webpack or Vite for bundling and optimization.
* Implement robust version control (Git) and clear change management practices.

## Firefox API Usage

* Utilize `browser.*` APIs properly (e.g., storage, tabs, runtime, alarms, action, notifications).
* Manage asynchronous operations consistently with Promises and async/await syntax.
* Implement background scripts as Service Workers to comply with Manifest V3.
* Use `browser.alarms` for scheduled tasks.
* Handle browser actions effectively via the `browser.action` API.
* Ensure offline functionality is handled gracefully and reliably.

## Security and Privacy

* Define a robust Content Security Policy (CSP) in `manifest.json`.
* Securely manage user data, ensuring privacy compliance.
* Guard against XSS and injection vulnerabilities.
* Use secure messaging via `browser.runtime.sendMessage` and `browser.runtime.onMessage`.
* Safely handle cross-origin requests, explicitly defining permissions.
* Encrypt sensitive data at rest and in transit.
* Properly configure `web_accessible_resources` following best security practices.

## Performance and Optimization

* Minimize resource usage, ensuring extensions remain lightweight.
* Optimize performance of background scripts.
* Implement caching effectively to reduce unnecessary network calls.
* Manage asynchronous operations efficiently to prevent blocking.
* Regularly monitor and optimize CPU and memory usage.

## UI and User Experience

* Align extension UI with Firefox Photon Design principles.
* Implement responsive and intuitive popup windows.
* Provide clear, real-time user feedback during operations.
* Ensure full keyboard navigation support.
* Clearly indicate loading states and transitions.
* Use animations judiciously for enhanced user experience.

## Internationalization

* Leverage the `browser.i18n` API for translations and localization.
* Adhere to the `_locales` directory structure for language files.
* Support Right-to-Left (RTL) languages appropriately.
* Manage regional and locale-specific formats gracefully.

## Accessibility

* Include ARIA labels and roles to support assistive technologies.
* Ensure high contrast ratios for readability.
* Fully support screen readers and keyboard navigation.
* Provide clearly defined keyboard shortcuts.

## Testing and Debugging

* Use Firefox Developer Tools for debugging and performance analysis.
* Write comprehensive unit and integration tests.
* Ensure compatibility across major Firefox versions.
* Regularly monitor performance metrics and user-reported issues.
* Clearly handle and log error conditions for ease of debugging.

## Publishing and Maintenance

* Prepare complete and appealing store listings, including clear screenshots.
* Provide transparent and user-friendly privacy policies.
* Implement robust auto-update mechanisms.
* Proactively handle user feedback and reviews.
* Keep documentation up-to-date and easily accessible.

## Reference Official Documentation

* Regularly consult Mozilla's official Firefox Extension documentation.
* Stay current with Manifest V3 updates and deprecations.
* Follow Mozilla Add-ons (AMO) submission and review guidelines.
* Monitor Firefox platform updates and announcements.

## Expected Output for Cursor AI

* Generate clear, functional TypeScript code snippets.
* Include robust error handling examples.
* Adhere strictly to security best practices.
* Ensure compatibility across different Firefox browser versions.
* Write code that is maintainable, scalable, and easy to extend.



### Fonctionnalités principales
1. **Gestion d'URLs favorites** - Liste personnalisable d'URLs à épingler
2. **Ouverture rapide d'onglets** - Ouvrir tous les onglets épinglés d'un clic
3. **Épinglage automatique** - Les onglets s'ouvrent directement épinglés
4. **Option d'ouverture automatique** - Ouvrir automatiquement les onglets lors de nouvelles fenêtres

🎯 À quoi sert cette extension TabsFlow
Fonctionnalité principale :
L'extension permet de gérer un ensemble d'onglets favoris qui s'ouvrent automatiquement épinglés dans Firefox.
Comment ça fonctionne :
📋 Configuration : L'utilisateur configure une liste d'URLs dans la page d'options
Exemples des URLs actuelles : LinkedIn, Waalaxy, Google Calendar, Grok, Gemini, ChatGPT, Perplexity, Google Drive, Gmail, etc.
🚀 Ouverture rapide :
Clic sur l'icône de l'extension → Tous les onglets s'ouvrent épinglés
Si aucune URL configurée → Ouvre automatiquement la page d'options
🔄 Ouverture automatique (optionnel) :
Option "Automatically Open Tabs"
Ouvre automatiquement les onglets épinglés quand une nouvelle fenêtre Firefox est créée

Cas d'usage typique :
Un workflow de productivité pour les utilisateurs qui :
Utilisent toujours les mêmes outils web (mail, calendrier, outils IA, réseaux sociaux pro)
Veulent retrouver instantanément leur environnement de travail
Perdent leurs onglets lors des redémarrages
Veulent synchroniser leur setup entre appareils
Pourquoi "TabsFlow" est parfait :
C'est exactement un outil de flux de travail basé sur les onglets ! L'extension transforme les bookmarks statiques en un environnement de travail dynamique qui se recrée à la demande.
Le nouveau nom TabsFlow capture parfaitement cette essence : un flux fluide et organisé d'onglets pour optimiser la productivité ! 🚀
---

## 🎨 Nouvelle UX - Concept "Firefox Workflow"

### Philosophie de design
- **Interface moderne et minimaliste** inspirée de Firefox Proton
- **Actions contextuelles** avec raccourcis clavier
- **Organisation par catégories** pour une meilleure gestion
- **Feedback visuel immédiat** pour toutes les actions
- **Responsive design** pour tous les formats d'écran

### Thème visuel
- **Couleurs** : Palette Firefox (bleu #0060df, orange #ff9400, gris modernes)
- **Typographie** : System fonts avec fallback vers Inter/Roboto
- **Iconographie** : Icônes Fluent UI ou Heroicons
- **Layout** : Grid CSS moderne avec Flexbox

---

## 🏗️ Architecture technique

### Structure du projet
```
firefox-TabsFlow/
├── manifest.json                 # Manifest v2 Firefox
├── background/
│   ├── background.js             # Script background principal
│   └── storage.js                # Gestion du stockage
├── popup/
│   ├── popup.html                # Interface popup principale
│   ├── popup.js                  # Logique popup
│   └── popup.css                 # Styles popup
├── options/
│   ├── options.html              # Page des paramètres
│   ├── options.js                # Logique paramètres
│   └── options.css               # Styles paramètres
├── content/
│   ├── content.js                # Scripts d'injection si nécessaire
│   └── styles.css                # Styles pour les pages web
├── assets/
│   ├── icons/                    # Icônes de l'extension
│   ├── images/                   # Images et illustrations
│   └── fonts/                    # Polices custom si nécessaire
├── libs/
│   ├── utils.js                  # Utilitaires partagés
│   ├── storage-manager.js        # Gestionnaire de stockage
│   └── tab-manager.js            # Gestionnaire d'onglets
└── locales/
    ├── en/
    ├── fr/
    └── es/                       # Support i18n
```

---

## 📦 Spécifications techniques

### Manifest.json (Firefox v2)
```json
{
  "manifest_version": 2,
  "name": "__MSG_extensionName__",
  "description": "__MSG_extensionDescription__",
  "version": "1.0.0",
  "default_locale": "en",
  
  "permissions": [
    "tabs",
    "storage",
    "activeTab"
  ],
  
  "background": {
    "scripts": ["background/background.js"],
    "persistent": false
  },
  
  "browser_action": {
    "default_popup": "popup/popup.html",
    "default_title": "__MSG_browserActionTitle__",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "32": "assets/icons/icon-32.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  }
}
```

### API Firefox vs Chrome
- **browser.* vs chrome.*** : Utiliser l'API WebExtensions Firefox
- **Promesses natives** au lieu de callbacks
- **browser.storage.local** pour le stockage persistant
- **browser.tabs.create()** avec pinned: true

---

## 🎯 Fonctionnalités détaillées

### 1. Interface Popup principale
**Nouveau design :**
- **Header** : Logo + titre + bouton paramètres
- **Quick Actions** : 
  - Bouton "Ouvrir tous" (icône + texte)
  - Compteur d'onglets actifs épinglés
- **Liste des catégories** :
  - Travail, Personnel, Développement, etc.
  - Icônes personnalisables par catégorie
- **Preview des URLs** : Favicon + titre + domaine
- **Actions rapides** : Ouvrir, Modifier, Supprimer par URL

### 2. Système de catégories
**Nouvelles fonctionnalités :**
- **Catégories prédéfinies** : Travail, Personnel, Développement, Social, etc.
- **Catégories personnalisées** avec couleurs et icônes
- **Glisser-déposer** pour réorganiser les URLs
- **Import/Export** des catégories

### 3. Gestion intelligente des onglets
**Améliorations :**
- **Détection de doublons** : Éviter d'ouvrir des onglets déjà ouverts
- **Gestion des erreurs** : Retry automatique en cas d'échec
- **État des onglets** : Indicateur visuel (chargement, erreur, succès)
- **Ordre d'ouverture** : Respecter l'ordre défini par l'utilisateur

### 4. Options avancées
**Nouvelles fonctionnalités :**
- **Profils de session** : Sauvegarder plusieurs ensembles d'onglets
- **Planification** : Ouvrir des onglets à des heures spécifiques
- **Règles d'ouverture** : Conditions pour l'ouverture automatique
- **Synchronisation** : Sync entre appareils via Firefox Sync

---

garde une approche générique pas d'approche spécifique à un site il faut que ça fonctionne pour TOUT les sites


Ne produit pas de documentation mais met à jour le changelog