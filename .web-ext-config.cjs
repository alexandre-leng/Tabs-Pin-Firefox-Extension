module.exports = {
  // Configuration pour la construction (packaging)
  build: {
    overwriteDest: true,
  },
  // Liste des fichiers à ignorer lors du packaging
  // Note: web-ext ignore déjà .git, node_modules, etc. par défaut
  ignoreFiles: [
    'scripts/',
    'build/',
    'dist/',
    '.vscode/',
    '.cursor/',
    'package.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    'tsconfig.json',
    'tailwind.config.ts',
    'postcss.config.mjs',
    'next.config.mjs',
    'components.json',
    '*.md',
    '.cursorrules',
    '.gitignore',
  ],
};
