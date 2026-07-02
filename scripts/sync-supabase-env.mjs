#!/usr/bin/env node
/**
 * Writes Supabase keys from `supabase status -o json` into .env.local.
 * Run after `npm run db:start` (requires Docker).
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const envPath = join(root, '.env.local');
const examplePath = join(root, '.env.example');

const LOCAL_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SERVICE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

function loadEnvFile(path) {
  if (!existsSync(path)) return '';
  return readFileSync(path, 'utf8');
}

function upsertEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

let url = 'http://127.0.0.1:54321';
let anon = LOCAL_ANON;
let service = LOCAL_SERVICE;

try {
  const raw = execSync('npx supabase status -o json', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const status = JSON.parse(raw);
  if (status.API_URL) url = status.API_URL;
  if (status.ANON_KEY) anon = status.ANON_KEY;
  if (status.SERVICE_ROLE_KEY) service = status.SERVICE_ROLE_KEY;
  console.log('Read keys from local Supabase instance.');
} catch {
  console.warn('Supabase not running — using default local dev keys.');
  console.warn('Start with: npm run db:start (requires Docker Desktop)');
}

let content = loadEnvFile(envPath) || loadEnvFile(examplePath);
content = upsertEnvVar(content, 'NEXT_PUBLIC_SUPABASE_URL', url);
content = upsertEnvVar(content, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', anon);
content = upsertEnvVar(content, 'SUPABASE_SERVICE_ROLE_KEY', service);
if (!/^NEXT_PUBLIC_APP_URL=/m.test(content)) {
  content = upsertEnvVar(content, 'NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
}

writeFileSync(envPath, content);
console.log(`Updated ${envPath}`);
console.log(`  NEXT_PUBLIC_SUPABASE_URL=${url}`);
