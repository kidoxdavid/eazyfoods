import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { bad } from './errors.js';
import { pool } from '../db/pool.js';

/**
 * Local-disk storage behind a tiny interface so S3-compatible storage can replace it without touching callers.
 * "public" files are images served at /uploads/*. "private" files (business documents) are never served statically.
 */
const root = resolve(config.UPLOAD_DIR);
export const publicDir = join(root, 'public');
const privateDir = join(root, 'private');
mkdirSync(publicDir, { recursive: true });
mkdirSync(privateDir, { recursive: true });

const SIGS: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'webp', mime: 'image/webp', test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  { ext: 'pdf', mime: 'application/pdf', test: (b) => b.subarray(0, 5).toString() === '%PDF-' },
  { ext: 'mp4', mime: 'video/mp4', test: (b) => b.length > 12 && b.subarray(4, 8).toString() === 'ftyp' },
  { ext: 'webm', mime: 'video/webm', test: (b) => b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
];

/** Identify the real file type from its bytes (the client-supplied name and content-type are never trusted). */
export function sniff(buf: Buffer, allow: ('jpg' | 'png' | 'webp' | 'pdf' | 'mp4' | 'webm')[]) {
  const t = SIGS.find((s) => s.test(buf));
  if (!t || !allow.includes(t.ext as any)) throw bad('unsupported_file', `Unsupported file type. Allowed: ${allow.join(', ')}.`);
  return t;
}

const MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm' };
export const mimeOf = (key: string) => MIME[key.split('.').pop() ?? ''] ?? 'application/octet-stream';

/** Write to disk (fast) and to the database (survives redeploys). */
export async function save(buf: Buffer, ext: string, visibility: 'public' | 'private'): Promise<{ key: string; url: string }> {
  const key = randomBytes(16).toString('hex') + '.' + ext;
  writeFileSync(join(visibility === 'public' ? publicDir : privateDir, key), buf);
  await pool.query('INSERT INTO uploaded_files(key, visibility, mime, data) VALUES ($1,$2,$3,$4)', [key, visibility, mimeOf(key), buf]);
  return { key, url: visibility === 'public' ? `/uploads/${key}` : `private:${key}` };
}

/** The file's bytes from disk, or from the database when the disk was wiped (the disk copy is then restored). */
export async function readStored(key: string, visibility: 'public' | 'private'): Promise<Buffer | null> {
  if (!/^[a-f0-9]{32}\.(jpg|png|webp|pdf|mp4|webm)$/.test(key)) return null;
  const p = join(visibility === 'public' ? publicDir : privateDir, key);
  if (existsSync(p)) return readFileSync(p);
  const r = (await pool.query('SELECT data FROM uploaded_files WHERE key = $1 AND visibility = $2', [key, visibility])).rows[0];
  if (!r) return null;
  try { writeFileSync(p, r.data); } catch { /* read-only disk: serve from the database each time */ }
  return r.data as Buffer;
}

export async function openPrivate(key: string) {
  if (!/^[a-f0-9]{32}\.(jpg|png|webp|pdf)$/.test(key)) throw bad('bad_key', 'Invalid file.');
  return readStored(key, 'private');
}

/** Only accept image URLs that we issued, so a vendor cannot hotlink arbitrary third-party URLs into the catalogue. */
export const isOurImageUrl = (u: string) => /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(u);

/** Same rule for banner videos. */
export const isOurVideoUrl = (u: string) => /^\/uploads\/[a-f0-9]{32}\.(mp4|webm)$/.test(u);
