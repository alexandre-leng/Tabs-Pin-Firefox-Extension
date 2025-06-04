#!/usr/bin/env node

/**
 * Script de validation des traductions i18n
 * Vérifie que toutes les langues ont les mêmes clés que la langue de référence (anglais)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LOCALES_DIR = path.join(__dirname, '..', '_locales');
const REFERENCE_LOCALE = 'en'; // Langue de référence
const REQUIRED_LOCALES = ['fr', 'it', 'es']; // Langues requises selon les spécifications

// Couleurs pour l'affichage console
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadMessages(locale) {
  const messagesFile = path.join(LOCALES_DIR, locale, 'messages.json');
  try {
    const content = fs.readFileSync(messagesFile, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log('red', `❌ Erreur lors du chargement de ${locale}/messages.json: ${error.message}`);
    return null;
  }
}

function extractKeys(messages, prefix = '') {
  const keys = new Set();
  
  for (const [key, value] of Object.entries(messages)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.add(fullKey);
    
    // Vérifier les placeholders
    if (value.placeholders) {
      for (const placeholderKey of Object.keys(value.placeholders)) {
        keys.add(`${fullKey}.placeholders.${placeholderKey}`);
      }
    }
  }
  
  return keys;
}

function validateLocale(referenceKeys, locale, messages) {
  log('cyan', `\n🔍 Validation de ${locale}:`);
  
  if (!messages) {
    return false;
  }
  
  const localeKeys = extractKeys(messages);
  const missingKeys = [...referenceKeys].filter(key => !localeKeys.has(key));
  const extraKeys = [...localeKeys].filter(key => !referenceKeys.has(key));
  
  let isValid = true;
  
  // Clés manquantes
  if (missingKeys.length > 0) {
    log('red', `  ❌ ${missingKeys.length} clé(s) manquante(s):`);
    missingKeys.forEach(key => log('red', `    - ${key}`));
    isValid = false;
  }
  
  // Clés supplémentaires
  if (extraKeys.length > 0) {
    log('yellow', `  ⚠️  ${extraKeys.length} clé(s) supplémentaire(s):`);
    extraKeys.forEach(key => log('yellow', `    + ${key}`));
  }
  
  // Messages vides
  const emptyMessages = Object.entries(messages)
    .filter(([key, value]) => !value.message || value.message.trim() === '')
    .map(([key]) => key);
  
  if (emptyMessages.length > 0) {
    log('red', `  ❌ ${emptyMessages.length} message(s) vide(s):`);
    emptyMessages.forEach(key => log('red', `    - ${key}`));
    isValid = false;
  }
  
  // Placeholders manquants
  for (const [key, value] of Object.entries(messages)) {
    if (value.message && value.message.includes('$')) {
      const messagePlaceholders = [...value.message.matchAll(/\$([A-Z_]+)\$/g)]
        .map(match => match[1]);
      
      const definedPlaceholders = value.placeholders ? Object.keys(value.placeholders) : [];
      
      const missingPlaceholders = messagePlaceholders.filter(p => !definedPlaceholders.includes(p.toLowerCase()));
      
      if (missingPlaceholders.length > 0) {
        log('red', `  ❌ Placeholders manquants dans ${key}:`);
        missingPlaceholders.forEach(p => log('red', `    - $${p}$`));
        isValid = false;
      }
    }
  }
  
  if (isValid) {
    log('green', `  ✅ ${locale} est valide (${localeKeys.size} clés)`);
  }
  
  return isValid;
}

function generateMissingTranslations(referenceMessages, locale, localeMessages) {
  const referenceKeys = extractKeys(referenceMessages);
  const localeKeys = localeMessages ? extractKeys(localeMessages) : new Set();
  const missingKeys = [...referenceKeys].filter(key => !localeKeys.has(key));
  
  if (missingKeys.length === 0) {
    return null;
  }
  
  log('blue', `\n📝 Génération des traductions manquantes pour ${locale}:`);
  
  const missing = {};
  
  for (const key of missingKeys) {
    if (key.includes('.placeholders.')) {
      continue; // Skip placeholder keys, they're handled with their parent
    }
    
    const mainKey = key.split('.')[0];
    const referenceValue = referenceMessages[mainKey];
    
    if (referenceValue) {
      missing[mainKey] = {
        message: `[TODO: ${locale.toUpperCase()}] ${referenceValue.message}`,
        description: referenceValue.description || `Translation needed for ${locale}`
      };
      
      if (referenceValue.placeholders) {
        missing[mainKey].placeholders = referenceValue.placeholders;
      }
    }
  }
  
  return missing;
}

function main() {
  log('magenta', '🌐 Validation des traductions TabsFlow Firefox Extension');
  log('white', '==================================================');
  
  // Charger la langue de référence
  const referenceMessages = loadMessages(REFERENCE_LOCALE);
  if (!referenceMessages) {
    log('red', `❌ Impossible de charger la langue de référence: ${REFERENCE_LOCALE}`);
    process.exit(1);
  }
  
  const referenceKeys = extractKeys(referenceMessages);
  log('green', `✅ Langue de référence ${REFERENCE_LOCALE} chargée: ${referenceKeys.size} clés`);
  
  // Vérifier les langues disponibles
  const availableLocales = fs.readdirSync(LOCALES_DIR)
    .filter(dir => fs.statSync(path.join(LOCALES_DIR, dir)).isDirectory())
    .filter(dir => dir !== REFERENCE_LOCALE);
  
  log('blue', `📂 Langues disponibles: ${availableLocales.join(', ')}`);
  
  let allValid = true;
  const results = {};
  
  // Valider chaque langue
  for (const locale of availableLocales) {
    const messages = loadMessages(locale);
    const isValid = validateLocale(referenceKeys, locale, messages);
    results[locale] = { isValid, messages };
    
    if (!isValid) {
      allValid = false;
    }
    
    // Générer les traductions manquantes pour les langues requises
    if (REQUIRED_LOCALES.includes(locale) && messages) {
      const missing = generateMissingTranslations(referenceMessages, locale, messages);
      if (missing) {
        const outputFile = path.join(__dirname, `missing-${locale}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(missing, null, 2));
        log('blue', `  📄 Traductions manquantes sauvées: ${outputFile}`);
      }
    }
  }
  
  // Vérifier les langues requises
  log('cyan', '\n🎯 Vérification des langues requises:');
  for (const requiredLocale of REQUIRED_LOCALES) {
    if (availableLocales.includes(requiredLocale)) {
      const isValid = results[requiredLocale]?.isValid;
      if (isValid) {
        log('green', `  ✅ ${requiredLocale}: Complet et valide`);
      } else {
        log('red', `  ❌ ${requiredLocale}: Erreurs détectées`);
      }
    } else {
      log('red', `  ❌ ${requiredLocale}: Langue manquante`);
      allValid = false;
    }
  }
  
  // Rapport final
  log('white', '\n📊 Rapport final:');
  if (allValid) {
    log('green', '🎉 Toutes les traductions sont valides !');
    process.exit(0);
  } else {
    log('red', '❌ Des erreurs ont été détectées dans les traductions.');
    log('yellow', '💡 Exécutez ce script à nouveau après avoir corrigé les erreurs.');
    process.exit(1);
  }
}

// Vérifier si le script est exécuté directement
if (require.main === module) {
  main();
}

module.exports = {
  loadMessages,
  extractKeys,
  validateLocale,
  generateMissingTranslations
}; 