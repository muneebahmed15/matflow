import fs from 'fs';
import path from 'path';

const actionsDir = path.join(process.cwd(), 'src/app/(dashboard)/actions');
const skip = new Set(['index.ts', '_shared.ts', 'page-data.ts', 'events.ts']);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isUsed(name, body) {
  return new RegExp(`\\b${escapeRegExp(name)}\\b`).test(body);
}

function parseNamedImports(specifier) {
  return specifier
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const typed = part.startsWith('type ');
      const cleaned = typed ? part.slice(5).trim() : part;
      const [importName, localName = importName] = cleaned.split(/\s+as\s+/).map((s) => s.trim());
      return { importName, localName, typed };
    });
}

function pruneFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sharedIdx = content.indexOf("from './_shared'");
  if (sharedIdx === -1) return false;

  const splitAt = content.lastIndexOf('\n', sharedIdx);
  const importsSection = content.slice(0, splitAt + 1);
  const body = content.slice(splitAt + 1);

  const kept = [];
  const importRegex = /import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"];?/g;
  let cursor = 0;
  let match;

  while ((match = importRegex.exec(importsSection)) !== null) {
    if (match.index > cursor) {
      kept.push(importsSection.slice(cursor, match.index));
    }

    const isTypeImport = Boolean(match[1]);
    const names = parseNamedImports(match[2]);
    const used = names.filter(({ localName }) => isUsed(localName, body));

    if (used.length > 0) {
      const rendered = used
        .map(({ importName, localName, typed }) => {
          const name = importName === localName ? importName : `${importName} as ${localName}`;
          return typed && !isTypeImport ? `type ${name}` : name;
        })
        .join(', ');
      const prefix = isTypeImport ? 'import type' : 'import';
      kept.push(`${prefix} { ${rendered} } from '${match[3]}';\n`);
    }

    cursor = match.index + match[0].length;
  }

  kept.push(importsSection.slice(cursor));
  const next = kept.join('') + body;
  if (next === content) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

for (const file of fs.readdirSync(actionsDir)) {
  if (!file.endsWith('.ts') || skip.has(file)) continue;
  const filePath = path.join(actionsDir, file);
  if (pruneFile(filePath)) {
    console.log(`pruned ${file}`);
  }
}
