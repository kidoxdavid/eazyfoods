import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Where to find ffmpeg: FFMPEG_PATH, the bundled ffmpeg-static binary, or one on the PATH. Resolved once. */
let found: Promise<string | null> | null = null;
export function ffmpegPath(): Promise<string | null> {
  found ??= (async () => {
    if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
    try { const m: any = await import('ffmpeg-static'); const p = m.default ?? m; if (typeof p === 'string') return p; } catch { /* optional dependency not installed */ }
    return await new Promise<string | null>((res) => { const c = spawn('ffmpeg', ['-version']); c.on('error', () => res(null)); c.on('exit', (code) => res(code === 0 ? 'ffmpeg' : null)); });
  })();
  return found;
}

function run(bin: string, args: string[], ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const c = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; c.stderr.on('data', (d) => { err = (err + d).slice(-600); });
    const t = setTimeout(() => { c.kill('SIGKILL'); reject(new Error('timeout')); }, ms);
    c.on('error', (e) => { clearTimeout(t); reject(e); });
    c.on('exit', (code) => { clearTimeout(t); code === 0 ? resolve() : reject(new Error(err || `ffmpeg exited ${code}`)); });
  });
}

/**
 * Turn any phone or camera video (MOV, HEVC, 3GP, MKV, big MP4s) into a web-friendly H.264/AAC MP4:
 * at most 720p, fast-start so it plays while loading, rotation applied. Returns null when ffmpeg is not available.
 * Tries a normal quality first and a smaller one if the result is still over maxBytes.
 */
export async function toWebMp4(input: Buffer, maxBytes: number): Promise<Buffer | null> {
  const bin = await ffmpegPath(); if (!bin) return null;
  const dir = await mkdtemp(join(tmpdir(), 'ez-vid-'));
  try {
    const src = join(dir, 'in'), out = join(dir, 'out.mp4');
    await writeFile(src, input);
    for (const [h, crf] of [[720, 27], [480, 31]] as const) {
      await run(bin, ['-y', '-i', src, '-t', '90', '-vf', `scale=-2:'min(${h},ih)'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out], 170_000);
      const buf = await readFile(out);
      if (buf.length <= maxBytes) return buf;
    }
    return Buffer.alloc(0);   // still too big after the smaller try: the caller reports it
  } finally { await rm(dir, { recursive: true, force: true }); }
}
