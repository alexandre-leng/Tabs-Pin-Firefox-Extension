#!/usr/bin/env node

/**
 * Script pour ajouter le message "tabsPinned" manquant dans toutes les langues
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LOCALES_DIR = path.join(__dirname, '..', '_locales');

// Nouveau message à ajouter avec ses traductions
const tabsPinnedTranslations = {
  ar: { message: "تم تثبيت $COUNT$ علامة (علامات) تبويب", description: "رسالة نجاح لعلامات التبويب المثبتة" },
  de: { message: "$COUNT$ Tab(s) wurden angeheftet", description: "Erfolgsmeldung für angeheftete Tabs" },
  en: { message: "$COUNT$ tab(s) have been pinned", description: "Success message for pinned tabs" },
  es: { message: "$COUNT$ pestaña(s) han sido fijadas", description: "Mensaje de éxito para pestañas fijadas" },
  fr: { message: "$COUNT$ onglet(s) ont été épinglé(s)", description: "Message de succès pour les onglets épinglés" },
  hi: { message: "$COUNT$ टैब पिन कर दिए गए हैं", description: "पिन किए गए टैब के लिए सफलता संदेश" },
  id: { message: "$COUNT$ tab telah dipasang", description: "Pesan sukses untuk tab yang dipasang" },
  it: { message: "$COUNT$ scheda/e sono state fissate", description: "Messaggio di successo per le schede fissate" },
  ja: { message: "$COUNT$ つのタブがピン留めされました", description: "ピン留めされたタブの成功メッセージ" },
  ko: { message: "$COUNT$개의 탭이 고정되었습니다", description: "고정된 탭에 대한 성공 메시지" },
  nl: { message: "$COUNT$ tabblad(en) zijn vastgezet", description: "Succesbericht voor vastgezette tabbladen" },
  pt: { message: "$COUNT$ aba(s) foram fixadas", description: "Mensagem de sucesso para abas fixadas" },
  ru: { message: "$COUNT$ вкладка(и) были закреплены", description: "Сообщение об успехе для закрепленных вкладок" },
  zh: { message: "$COUNT$ 个标签页已被固定", description: "固定标签页的成功消息" }
};

// Fonction pour ajouter le message manquant à une langue
function addMissingMessage(locale) {
  const localeDir = path.join(LOCALES_DIR, locale);
  const messagesFile = path.join(localeDir, 'messages.json');
  
  if (!fs.existsSync(messagesFile)) {
    console.log(`⚠️  Fichier messages.json non trouvé pour ${locale}`);
    return false;
  }
  
  try {
    const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
    
    // Vérifier si le message existe déjà
    if (messages.tabsPinned) {
      console.log(`✅ ${locale}: "tabsPinned" existe déjà`);
      return true;
    }
    
    // Ajouter le nouveau message
    const translation = tabsPinnedTranslations[locale];
    messages.tabsPinned = {
      message: translation.message,
      description: translation.description,
      placeholders: {
        count: {
          content: "$1",
          example: "3"
        }
      }
    };
    
    // Écrire le fichier mis à jour
    fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2) + '\n', 'utf8');
    console.log(`✅ ${locale}: Message "tabsPinned" ajouté avec succès`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour de ${locale}:`, error.message);
    return false;
  }
}

// Fonction principale
function main() {
  console.log('🚀 Ajout du message "tabsPinned" manquant...\n');
  
  // Obtenir la liste des langues supportées
  const locales = fs.readdirSync(LOCALES_DIR)
    .filter(dir => fs.statSync(path.join(LOCALES_DIR, dir)).isDirectory());
  
  let successCount = 0;
  let totalCount = locales.length;
  
  locales.forEach(locale => {
    if (addMissingMessage(locale)) {
      successCount++;
    }
  });
  
  console.log(`\n📊 Résumé: ${successCount}/${totalCount} langues mises à jour avec succès`);
  
  if (successCount === totalCount) {
    console.log('🎉 Tous les fichiers de localisation ont été mis à jour !');
  } else {
    console.log('⚠️  Certains fichiers n\'ont pas pu être mis à jour.');
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { addMissingMessage }; 