#!/usr/bin/env node

/**
 * Script de build pour packager l'extension TabsFlow Firefox
 * Crée un fichier .xpi prêt pour la distribution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const BUILD_DIR = path.join(PROJECT_ROOT, 'build');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

// Fichiers et dossiers à inclure dans l'extension
const INCLUDE_PATTERNS = [
  'manifest.json',
  'background/**/*',
  'popup/**/*',
  'options/**/*',
  'lib/**/*',
  'assets/**/*',
  '_locales/**/*',
  'LICENSE',
  'README.md'
];

// Fichiers et dossiers à exclure
const EXCLUDE_PATTERNS = [
  'node_modules/**/*',
  'scripts/**/*',
  'scripts',  // Exclure explicitement le dossier scripts
  'build/**/*',
  'build',    // Exclure explicitement le dossier build
  'dist/**/*',
  'dist',     // Exclure explicitement le dossier dist
  '.git/**/*',
  '.git',     // Exclure explicitement le dossier .git
  '.vscode/**/*',
  '.cursor/**/*',
  '*.log',
  '*.tmp',
  '.DS_Store',
  'Thumbs.db',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'tsconfig.json',
  'tailwind.config.ts',
  'postcss.config.mjs',
  'next.config.mjs',
  'components.json',
  'TROUBLESHOOTING.md',
  'CONTAINER_SUPPORT.md',
  'CHANGELOG.md',
  'RELEASE_NOTES_*.md',
  'EXTENSION_STATUS.md',
  'BUILD_GUIDE.md',
  'SOLUTION_ERREUR_CONNEXION.md',
  'AMELIORATIONS_BUILD.md',
  '.cursorrules',
  '.gitignore'
];

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

function readManifest() {
  const manifestPath = path.join(PROJECT_ROOT, 'manifest.json');
  try {
    const content = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log('red', `❌ Erreur lors de la lecture du manifest: ${error.message}`);
    process.exit(1);
  }
}

function validateManifest(manifest) {
  log('cyan', '🔍 Validation du manifest...');
  
  const requiredFields = ['name', 'version', 'description', 'manifest_version'];
  const missingFields = requiredFields.filter(field => !manifest[field]);
  
  if (missingFields.length > 0) {
    log('red', `❌ Champs manquants dans le manifest: ${missingFields.join(', ')}`);
    return false;
  }
  
  if (manifest.manifest_version !== 2) {
    log('red', `❌ Version de manifest non supportée: ${manifest.manifest_version}`);
    return false;
  }
  
  log('green', `✅ Manifest valide (v${manifest.version})`);
  return true;
}

function cleanDirectories() {
  log('cyan', '🧹 Nettoyage des répertoires...');
  
  [BUILD_DIR, DIST_DIR].forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
      log('yellow', `  🗑️  Supprimé: ${path.relative(PROJECT_ROOT, dir)}`);
    }
  });
  
  // Créer les répertoires
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
  
  log('green', '✅ Répertoires préparés');
}

function copyFiles() {
  log('cyan', '📁 Copie des fichiers...');
  
  const filesToCopy = [];
  
  // Parcourir le répertoire racine
  function scanDirectory(dir, relativePath = '') {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const relativeName = path.join(relativePath, entry).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);
      
      // Vérifier si le fichier doit être exclu
      const shouldExclude = EXCLUDE_PATTERNS.some(pattern => {
        // Exclusion exacte pour les dossiers racine
        if (pattern === relativeName || pattern === entry) {
          return true;
        }
        
        // Pour les dossiers racine, vérifier aussi le nom simple
        if (relativePath === '' && 
            (pattern === entry || 
             pattern.startsWith(entry + '/') || 
             pattern.startsWith(entry + '/**'))) {
          return true;
        }
        
        // Exclusion par pattern avec wildcards
        const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
        return regex.test(relativeName);
      });
      
      if (shouldExclude) {
        continue;
      }
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, relativeName);
      } else {
        filesToCopy.push({
          source: fullPath,
          dest: path.join(BUILD_DIR, relativeName)
        });
      }
    }
  }
  
  scanDirectory(PROJECT_ROOT);
  
  // Copier les fichiers
  let copiedCount = 0;
  for (const { source, dest } of filesToCopy) {
    const destDir = path.dirname(dest);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(source, dest);
    copiedCount++;
  }
  
  log('green', `✅ ${copiedCount} fichiers copiés`);
}

function validateBuild() {
  log('cyan', '🔍 Validation du build...');
  
  const requiredFiles = [
    'manifest.json',
    'background/background.js',
    'popup/popup.html',
    'popup/popup.js',
    'popup/popup.css',
    'options/options.html',
    'options/options.js',
    'options/options.css',
    'lib/container-utils.js'
  ];
  
  let allValid = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(BUILD_DIR, file);
    if (!fs.existsSync(filePath)) {
      log('red', `  ❌ Fichier manquant: ${file}`);
      allValid = false;
    }
  }
  
  // Vérifier les traductions
  const localesDir = path.join(BUILD_DIR, '_locales');
  if (fs.existsSync(localesDir)) {
    const locales = fs.readdirSync(localesDir);
    if (locales.length < 4) {
      log('yellow', `  ⚠️  Seulement ${locales.length} langues trouvées`);
    } else {
      log('green', `  ✅ ${locales.length} langues incluses`);
    }
  }
  
  if (!allValid) {
    log('red', '❌ Validation du build échouée');
    return false;
  }
  
  log('green', '✅ Build validé');
  return true;
}

/**
 * Crée un fichier ZIP en utilisant Node.js pur (solution de fallback)
 */
function createZipWithNode(sourceDir, outputPath) {
  try {
    // Essayer d'importer le module 'archiver' si disponible
    const archiver = require('archiver');
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        log('blue', `  📦 Archive créée avec archiver (${archive.pointer()} bytes)`);
        resolve(true);
      });
      
      archive.on('error', (err) => {
        reject(err);
      });
      
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  } catch (error) {
    // Si archiver n'est pas disponible, utiliser une solution basique
    log('yellow', '  ⚠️  Module archiver non disponible, utilisation de la méthode basique');
    return createZipBasic(sourceDir, outputPath);
  }
}

/**
 * Crée un ZIP en utilisant des commandes système natives
 */
function createZipBasic(sourceDir, outputPath) {
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // Essayer plusieurs méthodes Windows
    const methods = [
      // Méthode 1: PowerShell avec Import-Module explicite
      () => {
        const psCommand = `Import-Module Microsoft.PowerShell.Archive -Force; Compress-Archive -Path '${BUILD_DIR}\\*' -DestinationPath '${outputPath}' -Force`;
        execSync(`powershell -ExecutionPolicy Bypass -Command "${psCommand}"`, { stdio: 'pipe' });
      },
      
      // Méthode 2: PowerShell 7+ si disponible
      () => {
        const psCommand = `Compress-Archive -Path '${BUILD_DIR}\\*' -DestinationPath '${outputPath}' -Force`;
        execSync(`pwsh -Command "${psCommand}"`, { stdio: 'pipe' });
      },
      
      // Méthode 3: 7-Zip si disponible
      () => {
        execSync(`7z a "${outputPath}" "${BUILD_DIR}\\*"`, { stdio: 'pipe' });
      },
      
      // Méthode 4: WinRAR si disponible
      () => {
        execSync(`rar a "${outputPath}" "${BUILD_DIR}\\*"`, { stdio: 'pipe' });
      },
      
      // Méthode 5: tar (disponible sur Windows 10+)
      () => {
        execSync(`tar -czf "${outputPath}" -C "${BUILD_DIR}" .`, { stdio: 'pipe' });
      }
    ];
    
    for (const [index, method] of methods.entries()) {
      try {
        log('blue', `  🔄 Tentative méthode Windows ${index + 1}...`);
        method();
        log('green', `  ✅ Archive créée avec la méthode ${index + 1}`);
        return true;
      } catch (error) {
        log('yellow', `  ⚠️  Méthode ${index + 1} échouée: ${error.message}`);
        continue;
      }
    }
    
    return false;
  } else {
    // Unix/Linux/Mac
    try {
      execSync(`cd "${sourceDir}" && zip -r "${outputPath}" .`, { stdio: 'pipe' });
      log('green', '  ✅ Archive créée avec zip');
      return true;
    } catch (error) {
      log('red', `  ❌ Erreur avec zip: ${error.message}`);
      
      // Fallback avec tar
      try {
        execSync(`tar -czf "${outputPath}" -C "${sourceDir}" .`, { stdio: 'pipe' });
        log('green', '  ✅ Archive créée avec tar');
        return true;
      } catch (tarError) {
        log('red', `  ❌ Erreur avec tar: ${tarError.message}`);
        return false;
      }
    }
  }
}

/**
 * Fonction principale pour créer le fichier XPI
 */
async function createXPI(manifest) {
  log('cyan', '📦 Création du fichier XPI...');
  
  const version = manifest.version;
  const xpiFileName = `tabsflow-firefox-${version}.xpi`;
  const xpiPath = path.join(DIST_DIR, xpiFileName);
  
  try {
    // Essayer d'abord avec archiver (Node.js)
    try {
      await createZipWithNode(BUILD_DIR, xpiPath);
    } catch (error) {
      log('yellow', `  ⚠️  Archiver non disponible ou a échoué: ${error.message}`);
      log('blue', '  🔄 Passage aux méthodes système...');
      
      // Fallback sur les méthodes système
      const success = createZipBasic(BUILD_DIR, xpiPath);
      if (!success) {
        throw new Error('Toutes les méthodes de création d\'archive ont échoué');
      }
    }
    
    // Vérifier que le fichier a été créé
    if (!fs.existsSync(xpiPath)) {
      throw new Error('Le fichier XPI n\'a pas été créé');
    }
    
    const stats = fs.statSync(xpiPath);
    const sizeKB = Math.round(stats.size / 1024);
    
    log('green', `✅ XPI créé: ${xpiFileName} (${sizeKB} KB)`);
    return xpiPath;
    
  } catch (error) {
    log('red', `❌ Erreur lors de la création du XPI: ${error.message}`);
    log('cyan', '💡 Solutions possibles:');
    log('white', '   1. Installez le module archiver: npm install archiver');
    log('white', '   2. Installez 7-Zip et ajoutez-le au PATH');
    log('white', '   3. Assurez-vous que PowerShell est disponible');
    log('white', '   4. Sur Linux/Mac, installez zip: apt-get install zip ou brew install zip');
    return null;
  }
}

function generateBuildInfo(manifest, xpiPath) {
  log('cyan', '📄 Génération des informations de build...');
  
  const buildInfo = {
    name: manifest.name,
    version: manifest.version,
    buildDate: new Date().toISOString(),
    filename: path.basename(xpiPath),
    size: fs.statSync(xpiPath).size,
    manifest_version: manifest.manifest_version,
    permissions: manifest.permissions || [],
    locales: fs.readdirSync(path.join(BUILD_DIR, '_locales')).length,
    files: countFilesRecursive(BUILD_DIR),
    platform: process.platform,
    nodeVersion: process.version
  };
  
  const infoPath = path.join(DIST_DIR, 'build-info.json');
  fs.writeFileSync(infoPath, JSON.stringify(buildInfo, null, 2));
  
  log('green', `✅ Informations sauvées: ${path.relative(PROJECT_ROOT, infoPath)}`);
  
  return buildInfo;
}

function countFilesRecursive(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      count += countFilesRecursive(fullPath);
    } else {
      count++;
    }
  }
  
  return count;
}

async function main() {
  log('magenta', '🚀 Build TabsFlow Firefox Extension');
  log('white', '=====================================');
  
  const startTime = Date.now();
  
  // 1. Lire et valider le manifest
  const manifest = readManifest();
  if (!validateManifest(manifest)) {
    process.exit(1);
  }
  
  // 2. Nettoyer les répertoires
  cleanDirectories();
  
  // 3. Copier les fichiers
  copyFiles();
  
  // 4. Valider le build
  if (!validateBuild()) {
    process.exit(1);
  }
  
  // 5. Créer le fichier XPI
  const xpiPath = await createXPI(manifest);
  if (!xpiPath) {
    process.exit(1);
  }
  
  // 6. Générer les informations de build
  const buildInfo = generateBuildInfo(manifest, xpiPath);
  
  // 7. Résumé final
  const duration = Date.now() - startTime;
  log('white', '\n📊 Résumé du build:');
  log('green', `✅ Extension: ${manifest.name} v${manifest.version}`);
  log('green', `✅ Fichier: ${path.relative(PROJECT_ROOT, xpiPath)}`);
  log('green', `✅ Taille: ${Math.round(buildInfo.size / 1024)} KB`);
  log('green', `✅ Fichiers: ${buildInfo.files}`);
  log('green', `✅ Langues: ${buildInfo.locales}`);
  log('green', `✅ Plateforme: ${buildInfo.platform}`);
  log('green', `✅ Durée: ${duration}ms`);
  
  log('white', '\n🎉 Build terminé avec succès !');
  log('cyan', `💡 Testez l'extension: Firefox → about:debugging → "Ce Firefox" → "Charger un module temporaire..." → Sélectionnez ${path.basename(xpiPath)}`);
}

if (require.main === module) {
  main().catch(error => {
    log('red', `❌ Erreur fatale: ${error.message}`);
    process.exit(1);
  });
} 