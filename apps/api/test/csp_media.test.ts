import { describe, expect, it } from 'vitest';
import { app } from './helpers.js';

describe('security rules allow video files to come from the app host (needed by the Vercel front door)', () => {
  it('media-src allows self and the app host; scripts stay locked down', async () => {
    const csp = String((await app.inject({ url: '/health' })).headers['content-security-policy']);
    expect(csp).toMatch(/media-src 'self' https:\/\/eazyfoods\.onrender\.com/);
    expect(csp).toMatch(/script-src 'self' 'wasm-unsafe-eval'(;|$)/);
  });
});
