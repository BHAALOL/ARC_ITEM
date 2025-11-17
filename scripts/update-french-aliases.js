#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const API_URL = 'https://arctracker.io/api/items';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const ALIASES_FILE = path.join(DATA_DIR, 'item-aliases.json');

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function fetchTranslations() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch ARC Tracker items: ${res.status} ${res.statusText}`);
  }
  const payload = await res.json();
  if (!payload || !Array.isArray(payload.items)) {
    throw new Error('Unexpected payload format from ARC Tracker API.');
  }
  const translations = new Map();
  for (const entry of payload.items) {
    if (!entry?.id) continue;
    const slug = String(entry.id).replace(/_/g, '-');
    const french = entry?.name?.fr;
    if (typeof french === 'string' && french.trim().length > 0) {
      translations.set(slug, french.trim());
    }
  }
  if (translations.size === 0) {
    throw new Error('ARC Tracker payload did not have any French names.');
  }
  return translations;
}

async function loadExisting() {
  try {
    const raw = await readFile(ALIASES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function normalizeAliases(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((alias) => (typeof alias === 'string' ? alias.trim() : ''))
        .filter(Boolean),
    ),
  );
}

function mergeData(existing, translations) {
  const merged = { ...existing };
  for (const [slug, frenchName] of translations.entries()) {
    const previous = existing[slug];
    const aliases = normalizeAliases(previous?.aliases);
    merged[slug] = {
      ...previous,
      name_fr: frenchName,
      ...(aliases.length > 0 ? { aliases } : {}),
    };
  }
  return Object.fromEntries(Object.keys(merged).sort().map((key) => [key, merged[key]]));
}

async function saveAliases(data) {
  const formatted = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(ALIASES_FILE, formatted, 'utf8');
}

async function main() {
  try {
    await ensureDataDir();
    const [existing, translations] = await Promise.all([loadExisting(), fetchTranslations()]);
    const merged = mergeData(existing, translations);
    await saveAliases(merged);
    console.log(
      `Updated French aliases for ${translations.size} items -> ${path.relative(
        process.cwd(),
        ALIASES_FILE,
      )}`,
    );
  } catch (error) {
    console.error('Failed to update French aliases:', error.message);
    process.exitCode = 1;
  }
}

main();
