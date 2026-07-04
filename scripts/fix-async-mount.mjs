import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src');
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
}

walk(root);

const hookImport = "import { useAsyncMount, useClientMount } from '@/hooks/use-async-mount';";

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  if (content.includes('void load();') || content.includes('void load()')) {
    content = content.replace(
      /useEffect\(\(\) => \{\s*void load\(\);\s*\}, (\[[^\]]*\])\);/g,
      'useAsyncMount(load, $1);',
    );
  }

  if (content.includes('setOrigin(window.location.origin)')) {
    content = content.replace(
      /useEffect\(\(\) => \{\s*setOrigin\(window\.location\.origin\)\s*\}, \[\]\)/g,
      'useClientMount(() => setOrigin(window.location.origin), [])',
    );
  }

  if (content !== original) {
    if (!content.includes("from '@/hooks/use-async-mount'")) {
      const useEffectImport = content.match(/^import \{([^}]+)\} from 'react';/m);
      if (useEffectImport && useEffectImport[1].includes('useEffect')) {
        const names = useEffectImport[1]
          .split(',')
          .map((part) => part.trim())
          .filter((part) => part !== 'useEffect');
        if (names.length === 0) {
          content = content.replace(/^import \{[^}]+\} from 'react';\n/m, `${hookImport}\n`);
        } else {
          content = content.replace(
            /^import \{([^}]+)\} from 'react';/m,
            `import { ${names.join(', ')} } from 'react';\n${hookImport}`,
          );
        }
      } else {
        content = `${hookImport}\n${content}`;
      }
    }
    fs.writeFileSync(file, content);
    console.log('updated', path.relative(process.cwd(), file));
  }
}
