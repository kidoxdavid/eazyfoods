import { beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { app, call, login, openAllStores } from './helpers.js';
import { pool } from '../src/db/pool.js';

const S1 = 'demo-calgary-west-african-market';
beforeAll(openAllStores);
const who = async (e: string) => (await login(e)).cookie;
async function up(cookie: string, url: string, bytes: Buffer, mime: string, filename: string) {
  const b = '----t' + randomUUID();
  const body = Buffer.concat([Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`), bytes, Buffer.from(`\r\n--${b}--\r\n`)]);
  const r = await app.inject({ method: 'POST', url, payload: body, headers: { cookie, 'content-type': `multipart/form-data; boundary=${b}` } });
  return { status: r.statusCode, body: r.json() };
}
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypmp42'), Buffer.alloc(64)]);

describe('ads can carry a video', () => {
  it('a vendor uploads an MP4, attaches it to an ad, and once approved the public ad feed serves it; the image endpoint still refuses video', async () => {
    const owner = await who('owner1@example.test'), admin = await who('admin@example.test');
    const sid = (await pool.query('SELECT id FROM stores WHERE slug=$1', [S1])).rows[0].id;
    expect((await up(owner, '/api/uploads/image', MP4, 'video/mp4', 'a.mp4')).status).toBe(400);          // the old (wrong) route
    const v = await up(owner, '/api/uploads/video', MP4, 'video/mp4', 'a.mp4');
    expect(v.status).toBe(200); expect(v.body.url).toMatch(/^\/uploads\/[a-f0-9]{32}\.mp4$/);
    const ad = await call(owner, 'POST', '/api/vendor/ads', { store_id: sid, placement: 'home_banner', title: 'Video ad test', video_url: v.body.url, cpc_cents: 50, budget_cents: 2000, starts_at: new Date(Date.now() - 1000), ends_at: new Date(Date.now() + 864e5) });
    expect(ad.status).toBe(201);
    expect((await call(owner, 'GET', `/api/vendor/ads/${ad.body.id}`)).body.video_url).toBe(v.body.url);
    expect((await call(owner, 'POST', '/api/vendor/ads', { store_id: sid, placement: 'home_banner', title: 'Hotlinked', video_url: 'https://evil.example/x.mp4', cpc_cents: 50, budget_cents: 2000, starts_at: new Date(), ends_at: new Date(Date.now() + 864e5) })).status).toBe(400);
    expect((await call(admin, 'PATCH', `/api/admin/ads/${ad.body.id}`, { status: 'approved' })).status).toBe(200);
    const feed = await app.inject({ url: '/api/ads?placement=home_banner' });
    expect(feed.json().find((a: any) => a.id === ad.body.id)?.video_url).toBe(v.body.url);
    await pool.query('DELETE FROM ad_campaigns WHERE id = $1', [ad.body.id]);
  });
});

describe('phone videos', () => {
  it('a big .mov (over 25 MB) is accepted and stored as a small web MP4 that really plays', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ez-mov-')), mov = join(dir, 'phone.mov');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '25', '-c:v', 'libx264', '-b:v', '16M', '-c:a', 'aac', '-f', 'mov', mov]);
    const bytes = readFileSync(mov); expect(bytes.length).toBeGreaterThan(25 * 1024 * 1024);
    const owner = await who('owner1@example.test');
    const r = await up(owner, '/api/uploads/video', bytes, 'video/quicktime', 'IMG_0001.MOV');
    expect(r.status).toBe(200); expect(r.body.url).toMatch(/\.mp4$/);
    const got = await app.inject({ url: r.body.url });
    expect(got.rawPayload.length).toBeLessThan(25 * 1024 * 1024);
    const out = join(dir, 'out.mp4'); execFileSync('sh', ['-c', `cat > ${out}`], { input: got.rawPayload });
    const info = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,height', '-of', 'csv=p=0', out]).toString().trim();
    expect(info).toBe('h264,720');
  }, 240_000);
  it('something that is not a video is still refused', async () => {
    const owner = await who('owner1@example.test');
    expect((await up(owner, '/api/uploads/video', Buffer.from('hello world, not a video at all'), 'video/mp4', 'x.mp4')).status).toBe(400);
  });
});
