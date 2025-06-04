#!/usr/bin/env node

/**
 * Script pour mettre à jour toutes les traductions avec les nouvelles clés des containers
 * Ajoute les traductions manquantes à toutes les langues supportées
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LOCALES_DIR = path.join(__dirname, '..', '_locales');

// Nouvelles clés à ajouter avec leurs traductions
const newTranslations = {
  // Traductions anglaises (référence)
  en: {
    containerSupport: {
      message: "Firefox Multi-Account Containers support detected",
      description: "Message indicating containers are supported"
    },
    defaultContainer: {
      message: "Default container",
      description: "Name for the default container"
    },
    containerTabPin: {
      message: "Pinning tab in container: $CONTAINER$",
      description: "Message when pinning a tab in a container",
      placeholders: {
        container: {
          content: "$1",
          example: "Personal"
        }
      }
    },
    containerTabCreate: {
      message: "Creating tab in container: $CONTAINER$",
      description: "Message when creating a tab in a container",
      placeholders: {
        container: {
          content: "$1",
          example: "Work"
        }
      }
    },
    invalidTabId: {
      message: "Invalid tab ID: $TABID$",
      description: "Error message for invalid tab ID",
      placeholders: {
        tabid: {
          content: "$1",
          example: "61"
        }
      }
    },
    tabNoLongerExists: {
      message: "Tab no longer exists or is not accessible",
      description: "Error message when tab no longer exists"
    },
    containerNotFound: {
      message: "Container not found: $CONTAINER$",
      description: "Error message when container is not found",
      placeholders: {
        container: {
          content: "$1",
          example: "firefox-container-1"
        }
      }
    },
    containerErrorFallback: {
      message: "Using default container due to error",
      description: "Message when falling back to default container"
    },
    someTabsPinned: {
      message: "Some existing tabs have been pinned",
      description: "Message when some existing tabs were pinned"
    },
    someTabsPinnedAndOpened: {
      message: "Some tabs were pinned and others opened",
      description: "Message when some tabs were pinned and others opened"
    },
    tabPinSuccess: {
      message: "Tab pinned successfully: $URL$",
      description: "Success message for tab pinning",
      placeholders: {
        url: {
          content: "$1",
          example: "https://example.com"
        }
      }
    },
    tabPinError: {
      message: "Failed to pin tab: $ERROR$",
      description: "Error message for tab pinning",
      placeholders: {
        error: {
          content: "$1",
          example: "Invalid tab ID"
        }
      }
    },
    containerRaceCondition: {
      message: "Adding delay to avoid conflicts with containers",
      description: "Debug message for containers"
    },
    allTabsAlreadyPinned: {
      message: "All tabs are already pinned!",
      description: "Message when all tabs are already pinned"
    }
  },

  // Traductions françaises
  fr: {
    containerSupport: {
      message: "Support des Containers Firefox Multi-Account détecté",
      description: "Message indiquant que les containers sont supportés"
    },
    defaultContainer: {
      message: "Container par défaut",
      description: "Nom du container par défaut"
    },
    containerTabPin: {
      message: "Épinglage d'onglet dans le container : $CONTAINER$",
      description: "Message lors de l'épinglage d'un onglet dans un container",
      placeholders: {
        container: {
          content: "$1",
          example: "Personal"
        }
      }
    },
    containerTabCreate: {
      message: "Création d'onglet dans le container : $CONTAINER$",
      description: "Message lors de la création d'un onglet dans un container",
      placeholders: {
        container: {
          content: "$1",
          example: "Work"
        }
      }
    },
    invalidTabId: {
      message: "ID d'onglet invalide : $TABID$",
      description: "Message d'erreur pour un ID d'onglet invalide",
      placeholders: {
        tabid: {
          content: "$1",
          example: "61"
        }
      }
    },
    tabNoLongerExists: {
      message: "L'onglet n'existe plus ou n'est pas accessible",
      description: "Message d'erreur quand l'onglet n'existe plus"
    },
    containerNotFound: {
      message: "Container non trouvé : $CONTAINER$",
      description: "Message d'erreur quand un container n'est pas trouvé",
      placeholders: {
        container: {
          content: "$1",
          example: "firefox-container-1"
        }
      }
    },
    containerErrorFallback: {
      message: "Utilisation du container par défaut en raison d'une erreur",
      description: "Message quand on revient au container par défaut"
    },
    someTabsPinned: {
      message: "Certains onglets ont été épinglés",
      description: "Message quand certains onglets existants ont été épinglés"
    },
    someTabsPinnedAndOpened: {
      message: "Certains onglets ont été épinglés et d'autres ouverts",
      description: "Message quand certains onglets ont été épinglés et d'autres ouverts"
    },
    tabPinSuccess: {
      message: "Onglet épinglé avec succès : $URL$",
      description: "Message de succès pour l'épinglage d'onglet",
      placeholders: {
        url: {
          content: "$1",
          example: "https://example.com"
        }
      }
    },
    tabPinError: {
      message: "Échec de l'épinglage de l'onglet : $ERROR$",
      description: "Message d'erreur pour l'épinglage d'onglet",
      placeholders: {
        error: {
          content: "$1",
          example: "Invalid tab ID"
        }
      }
    },
    containerRaceCondition: {
      message: "Ajout d'un délai pour éviter les conflits avec les containers",
      description: "Message de debug pour les containers"
    },
    allTabsAlreadyPinned: {
      message: "Tous les onglets sont déjà épinglés !",
      description: "Message quand tous les onglets sont déjà épinglés"
    }
  },

  // Autres langues avec traductions génériques (à améliorer plus tard)
  ar: {
    containerSupport: { message: "تم اكتشاف دعم Firefox Multi-Account Containers", description: "Message indicating containers are supported" },
    defaultContainer: { message: "الحاوية الافتراضية", description: "Name for the default container" },
    containerTabPin: { message: "تثبيت علامة التبويب في الحاوية: $CONTAINER$", description: "Message when pinning a tab in a container", placeholders: { container: { content: "$1", example: "Personal" } } },
    containerTabCreate: { message: "إنشاء علامة تبويب في الحاوية: $CONTAINER$", description: "Message when creating a tab in a container", placeholders: { container: { content: "$1", example: "Work" } } },
    invalidTabId: { message: "معرف علامة تبويب غير صالح: $TABID$", description: "Error message for invalid tab ID", placeholders: { tabid: { content: "$1", example: "61" } } },
    tabNoLongerExists: { message: "علامة التبويب لم تعد موجودة أو غير قابلة للوصول", description: "Error message when tab no longer exists" },
    containerNotFound: { message: "الحاوية غير موجودة: $CONTAINER$", description: "Error message when container is not found", placeholders: { container: { content: "$1", example: "firefox-container-1" } } },
    containerErrorFallback: { message: "استخدام الحاوية الافتراضية بسبب خطأ", description: "Message when falling back to default container" },
    someTabsPinned: { message: "تم تثبيت بعض علامات التبويب الموجودة", description: "Message when some existing tabs were pinned" },
    someTabsPinnedAndOpened: { message: "تم تثبيت بعض علامات التبويب وفتح أخرى", description: "Message when some tabs were pinned and others opened" },
    tabPinSuccess: { message: "تم تثبيت علامة التبويب بنجاح: $URL$", description: "Success message for tab pinning", placeholders: { url: { content: "$1", example: "https://example.com" } } },
    tabPinError: { message: "فشل في تثبيت علامة التبويب: $ERROR$", description: "Error message for tab pinning", placeholders: { error: { content: "$1", example: "Invalid tab ID" } } },
    containerRaceCondition: { message: "إضافة تأخير لتجنب التعارض مع الحاويات", description: "Debug message for containers" },
    allTabsAlreadyPinned: { message: "جميع علامات التبويب مثبتة بالفعل!", description: "Message when all tabs are already pinned" }
  },

  de: {
    containerSupport: { message: "Firefox Multi-Account Containers Unterstützung erkannt", description: "Message indicating containers are supported" },
    defaultContainer: { message: "Standard-Container", description: "Name for the default container" },
    containerTabPin: { message: "Tab in Container anheften: $CONTAINER$", description: "Message when pinning a tab in a container", placeholders: { container: { content: "$1", example: "Personal" } } },
    containerTabCreate: { message: "Tab in Container erstellen: $CONTAINER$", description: "Message when creating a tab in a container", placeholders: { container: { content: "$1", example: "Work" } } },
    invalidTabId: { message: "Ungültige Tab-ID: $TABID$", description: "Error message for invalid tab ID", placeholders: { tabid: { content: "$1", example: "61" } } },
    tabNoLongerExists: { message: "Tab existiert nicht mehr oder ist nicht zugänglich", description: "Error message when tab no longer exists" },
    containerNotFound: { message: "Container nicht gefunden: $CONTAINER$", description: "Error message when container is not found", placeholders: { container: { content: "$1", example: "firefox-container-1" } } },
    containerErrorFallback: { message: "Standard-Container wird aufgrund eines Fehlers verwendet", description: "Message when falling back to default container" },
    someTabsPinned: { message: "Einige vorhandene Tabs wurden angeheftet", description: "Message when some existing tabs were pinned" },
    someTabsPinnedAndOpened: { message: "Einige Tabs wurden angeheftet und andere geöffnet", description: "Message when some tabs were pinned and others opened" },
    tabPinSuccess: { message: "Tab erfolgreich angeheftet: $URL$", description: "Success message for tab pinning", placeholders: { url: { content: "$1", example: "https://example.com" } } },
    tabPinError: { message: "Fehler beim Anheften des Tabs: $ERROR$", description: "Error message for tab pinning", placeholders: { error: { content: "$1", example: "Invalid tab ID" } } },
    containerRaceCondition: { message: "Verzögerung hinzufügen, um Konflikte mit Containern zu vermeiden", description: "Debug message for containers" },
    allTabsAlreadyPinned: { message: "Alle Tabs sind bereits angeheftet!", description: "Message when all tabs are already pinned" }
  }
};

function updateLocale(locale) {
  const messagesFile = path.join(LOCALES_DIR, locale, 'messages.json');
  
  console.log(`🔄 Mise à jour de ${locale}...`);
  
  try {
    // Charger le fichier existant
    let existingMessages = {};
    if (fs.existsSync(messagesFile)) {
      const content = fs.readFileSync(messagesFile, 'utf8');
      existingMessages = JSON.parse(content);
    }
    
    // Ajouter les nouvelles traductions si elles n'existent pas
    const localeTranslations = newTranslations[locale] || newTranslations.en; // Fallback vers anglais
    let hasChanges = false;
    
    for (const [key, value] of Object.entries(localeTranslations)) {
      if (!existingMessages[key]) {
        existingMessages[key] = value;
        hasChanges = true;
        console.log(`  ✅ Ajouté: ${key}`);
      }
    }
    
    if (hasChanges) {
      // Sauvegarder le fichier mis à jour
      fs.writeFileSync(messagesFile, JSON.stringify(existingMessages, null, 2));
      console.log(`  💾 ${locale} mis à jour avec succès`);
    } else {
      console.log(`  ℹ️  ${locale} déjà à jour`);
    }
    
  } catch (error) {
    console.error(`  ❌ Erreur lors de la mise à jour de ${locale}: ${error.message}`);
  }
}

function main() {
  console.log('🌐 Mise à jour automatique des traductions containers');
  console.log('====================================================');
  
  // Lister toutes les langues disponibles
  const availableLocales = fs.readdirSync(LOCALES_DIR)
    .filter(dir => fs.statSync(path.join(LOCALES_DIR, dir)).isDirectory());
  
  console.log(`📂 Langues trouvées: ${availableLocales.join(', ')}\n`);
  
  // Mettre à jour chaque langue
  for (const locale of availableLocales) {
    updateLocale(locale);
  }
  
  console.log('\n🎉 Mise à jour terminée !');
  console.log('💡 Exécutez le script de validation pour vérifier les résultats');
}

if (require.main === module) {
  main();
} 