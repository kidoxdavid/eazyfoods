import { describe, expect, it } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { app, login } from './helpers.js';
import { publicDir } from '../src/lib/storage.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 7)]);
describe('uploads survive a wiped disk', () => {
  it('serves the same URL from the database after the local file is deleted, with byte ranges', async () => {
    const owner = (await login('owner1@example.test')).cookie;
    const boundary = '----u' + Math.random().toString(16).slice(2);
    const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n`), PNG, Buffer.from(`\r\n--${boundary}--\r\n`)]);
    const up = await app.inject({ method: 'POST', url: '/api/uploads/image', headers: { cookie: owner, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: body });
    expect(up.statusCode).toBe(200);
    const { url, key } = up.json();
    rmSync(join(publicDir, key));                                   // the host wipes its disk on deploy
    const got = await app.inject({ url });
    expect(got.statusCode).toBe(200); expect(got.headers['content-type']).toBe('image/png'); expect(got.rawPayload.equals(PNG)).toBe(true);
    const part = await app.inject({ url, headers: { range: 'bytes=0-9' } });
    expect(part.statusCode).toBe(206); expect(part.rawPayload.length).toBe(10);
    expect((await app.inject({ url: '/uploads/' + 'f'.repeat(32) + '.png' })).statusCode).toBe(404);
    expect((await app.inject({ url: '/uploads/..%2f..%2fetc%2fpasswd' })).statusCode).toBe(404);
  });
});
