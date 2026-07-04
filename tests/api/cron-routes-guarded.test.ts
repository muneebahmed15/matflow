import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const CRON_DIR = join(process.cwd(), 'src', 'app', 'api', 'cron');

function findRouteFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findRouteFiles(full));
    } else if (entry === 'route.ts') {
      files.push(full);
    }
  }
  return files;
}

describe('cron routes are guarded', () => {
  const routes = findRouteFiles(CRON_DIR);

  it('finds cron route files', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it.each(routes)('%s calls requireCronSecret', (route) => {
    const source = readFileSync(route, 'utf8');
    expect(source).toContain('requireCronSecret');
  });
});
