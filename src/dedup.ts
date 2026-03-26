import fs from 'fs';
import path from 'path';
import { PublishedRecord } from './types.js';

const DATA_DIR = process.env.DATA_DIR || './data';
const PUBLISHED_FILE = path.join(DATA_DIR, 'published.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getPublished(): PublishedRecord[] {
  ensureDataDir();
  if (!fs.existsSync(PUBLISHED_FILE)) {
    return [];
  }
  const raw = fs.readFileSync(PUBLISHED_FILE, 'utf-8');
  return JSON.parse(raw);
}

function savePublished(records: PublishedRecord[]): void {
  ensureDataDir();
  fs.writeFileSync(PUBLISHED_FILE, JSON.stringify(records, null, 2));
}

/** Check if an article was already published (by Drive file ID or title). */
export function isPublished(articleId: string, articleTitle: string): boolean {
  const published = getPublished();
  return published.some(
    (p) => p.id === articleId || p.title.toLowerCase() === articleTitle.toLowerCase(),
  );
}

/** Mark an article as published. */
export function markPublished(record: PublishedRecord): void {
  const published = getPublished();
  published.push(record);
  savePublished(published);
  console.log(`[dedup] Marked as published: "${record.title}" (${record.id})`);
}

/** Seed published records (for recovery). Merges with existing data. */
export function seedPublished(records: PublishedRecord[]): { added: number; skipped: number } {
  const existing = getPublished();
  let added = 0;
  let skipped = 0;

  for (const record of records) {
    const alreadyExists = existing.some(
      (e) => e.id === record.id || e.title.toLowerCase() === record.title.toLowerCase(),
    );
    if (!alreadyExists) {
      existing.push(record);
      added++;
    } else {
      skipped++;
    }
  }

  savePublished(existing);
  return { added, skipped };
}
