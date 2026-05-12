import fs from 'fs';
import path from 'path';

const replacements: [string, string][] = [
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Ã±', 'ñ'],
  ['Ã', 'Á'],
  ['Ã‰', 'É'],
  ['Ã', 'Í'],
  ['Ã“', 'Ó'],
  ['Ãš', 'Ú'],
  ['Ã‘', 'Ñ'],
  ['Â¿', '¿'],
  ['Â¡', '¡'],
  ['Â©', '©'],
  ['â€¢', '•'],
  ['â†’', '→'],
  ['âœ”', '✔'],
];

function walk(dir: string, callback: (file: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        walk(fullPath, callback);
      }
    } else {
      callback(fullPath);
    }
  }
}

const targetDir = process.argv[2] || '.';

console.log(`Buscando archivos en: ${targetDir}`);

walk(targetDir, (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.md')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const [target, replacement] of replacements) {
      if (content.includes(target)) {
        content = content.split(target).join(replacement);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Corregido: ${filePath}`);
    }
  }
});

console.log('Proceso finalizado.');
