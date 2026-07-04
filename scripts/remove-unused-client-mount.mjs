import fs from 'fs';
import path from 'path';

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) {
      let content = fs.readFileSync(full, 'utf8');
      if (!content.includes('useClientMount') || /useClientMount\s*\(/.test(content)) continue;
      const next = content
        .replace(/,\s*useClientMount/g, '')
        .replace(/useClientMount,\s*/g, '');
      if (next !== content) {
        fs.writeFileSync(full, next);
        console.log('fixed', full);
      }
    }
  }
}

walk(path.join(process.cwd(), 'src'));
