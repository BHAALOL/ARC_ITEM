#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const API_URL = 'https://metaforge.app/api/arc-raiders/items';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'items-base.json');

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function fetchItems(page = 1) {
  const url = new URL(API_URL);
  url.searchParams.set('page', String(page));
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch items: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchAllPages() {
  const aggregated = [];
  let page = 1;
  let pagination;
  let maxValue;

  while (true) {
    const payload = await fetchItems(page);
    if (!Array.isArray(payload?.data)) {
      throw new Error(`Unexpected response format on page ${page}`);
    }
    aggregated.push(...payload.data);
    pagination = payload.pagination;
    maxValue = payload.maxValue ?? maxValue;
    if (!pagination?.hasNextPage) {
      break;
    }
    page += 1;
  }

  return {
    data: aggregated,
    fetchedAt: new Date().toISOString(),
    maxValue: maxValue ?? null,
    pagination: {
      page: 1,
      limit: aggregated.length,
      total: aggregated.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
    sourcePagination: pagination ?? null,
  };
}

async function saveItems(payload) {
  const formatted = JSON.stringify(payload, null, 2);
  await writeFile(OUTPUT_FILE, formatted, 'utf8');
}

async function main() {
  try {
    await ensureDataDir();
    const payload = await fetchAllPages();
    await saveItems(payload);
    const relPath = path.relative(process.cwd(), OUTPUT_FILE) || OUTPUT_FILE;
    console.log(`Saved ${payload.data.length} items to ${relPath}`);
  } catch (error) {
    console.error('Unable to update items:', error.message);
    process.exitCode = 1;
  }
}

main();
