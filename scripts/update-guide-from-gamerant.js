#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const ARTICLE_URL = 'https://gamerant.com/arc-raiders-which-item-safe-sell-should-you-recycle-guide-list/';
const SOURCE_ID = 'GameRantSafeSellNov2025';
const STATIONS = [
  'Scrappy',
  'Gunsmith',
  'Medical Lab',
  'Explosives Station',
  'Gear Bench',
  'Refiner',
  'Utility Station',
];
const NAME_ALIASES = {
  Dartboard: 'dart-board',
  'Diving Goggles': 'diving-googles',
  'Poster of Natural Wonders': 'poster-natural-wonder',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const ITEMS_FILE = path.join(DATA_DIR, 'items-base.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'guide-cheatsheet.json');

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTable(html) {
  const root = parse(html);
  const table = root.querySelector('table');
  if (!table) {
    throw new Error('Unable to find table in GameRant article.');
  }
  const rows = [];
  const trNodes = table.querySelectorAll('tr');
  trNodes.slice(1).forEach((row) => {
    const cells = row.querySelectorAll('th,td').map((cell) => cell.text.replace(/\s+/g, ' ').trim());
    if (cells.length >= 4) {
      rows.push({
        item: cells[0],
        recycles: cells[1],
        sellPrice: cells[2],
        condition: cells[3],
      });
    }
  });
  return rows;
}

function extractStations(condition) {
  const stations = [];
  for (const station of STATIONS) {
    if (condition.toLowerCase().includes(station.toLowerCase())) {
      stations.push(station);
    }
  }
  return stations;
}

function extractQuests(condition) {
  const quests = [];
  const questRegex = /Completing the ([^\.]+?) quest/gi;
  let match;
  while ((match = questRegex.exec(condition))) {
    quests.push(match[1].trim());
  }
  return quests;
}

function classify(condition, quests, stations) {
  const lc = condition.toLowerCase();
  if (quests.length > 0) {
    return 'KEEP_FOR_QUESTS';
  }
  if (lc.includes('project') || lc.includes('blueprint') || lc.includes('craft')) {
    return 'KEEP_FOR_PROJECTS';
  }
  if (stations.length > 0 || lc.includes('upgrade')) {
    return 'WORKSHOP_UPGRADE';
  }
  return 'SAFE_TO_RECYCLE';
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function splitRecycles(recyclesValue) {
  if (!recyclesValue || recyclesValue === '-') {
    return [];
  }
  return recyclesValue
    .split(/\s{2,}|\n|\r|\t|,/)
    .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parsePrice(value) {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return Number(digits);
}

async function main() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const [html, itemsRaw] = await Promise.all([
      fetch(ARTICLE_URL).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch GameRant article: ${res.status}`);
        }
        return res.text();
      }),
      readFile(ITEMS_FILE, 'utf8'),
    ]);

    const tableRows = parseTable(html);
    const itemsPayload = JSON.parse(itemsRaw);
    const baseItems = Array.isArray(itemsPayload?.data) ? itemsPayload.data : [];

    const lookup = new Map();
    for (const item of baseItems) {
      const normalized = normalizeText(item.name ?? item.id);
      lookup.set(item.id, item);
      lookup.set(normalized, item);
    }

    const guide = {};
    const missing = [];

    for (const row of tableRows) {
      const quests = extractQuests(row.condition);
      const stations = extractStations(row.condition);
      const guideCategory = classify(row.condition, quests, stations);
      const recycles = splitRecycles(row.recycles);
      const sellPrice = parsePrice(row.sellPrice);
      const normalizedName = normalizeText(row.item);
      const manualSlug = NAME_ALIASES[row.item];
      const slugCandidate = manualSlug ? manualSlug : slugify(row.item);
      const found = lookup.get(slugCandidate) || lookup.get(normalizedName);
      if (!found) {
        missing.push(row.item);
        continue;
      }

      guide[found.id] = {
        guideCategory,
        stations,
        notes: row.condition.trim(),
        source: SOURCE_ID,
        recycles,
        sellPrice,
        quests,
      };
    }

    await writeFile(OUTPUT_FILE, JSON.stringify(guide, null, 2));
    console.log(`Updated guide for ${Object.keys(guide).length} items -> ${path.relative(process.cwd(), OUTPUT_FILE)}`);
    if (missing.length) {
      console.warn('Missing matches for', missing.length, 'items');
      missing.slice(0, 10).forEach((name) => console.warn(' -', name));
    }
  } catch (error) {
    console.error('Failed to update guide data:', error);
    process.exitCode = 1;
  }
}

main();
