import { describe, expect, it } from 'vitest';
import { app } from './helpers.js';
import { paymentCsp } from '../src/lib/csp.js';

describe('security rules allow video files to come from the app host (needed by the Vercel front door)', () => {
  it('media-src allows self and the app host; scripts stay locked down', async () => {
    const csp = String((await app.inject({ url: '/health' })).headers['content-security-policy']);
    expect(csp).toMatch(/media-src 'self' https:\/\/eazyfoods\.onrender\.com/);
    expect(csp).toMatch(/script-src 'self' 'wasm-unsafe-eval'(;|$)/);
  });
});

describe('the card form of the chosen payment provider is allowed through the security rules, and nothing else is', () => {
  it('Stripe gets its script, frames and API; Helcim gets its secure host; the mock provider gets nothing', async () => {
    const stripe = paymentCsp('stripe');
    expect(stripe.script).toEqual(['https://js.stripe.com']);
    expect(stripe.frame).toEqual(expect.arrayContaining(['https://js.stripe.com', 'https://hooks.stripe.com']));
    expect(stripe.connect).toContain('https://api.stripe.com');
    expect(paymentCsp('helcim').script).toEqual(['https://secure.helcim.app']);
    expect(paymentCsp('mock')).toEqual({ script: [], frame: [], connect: [], img: [] });
    const csp = String((await app.inject({ url: '/health' })).headers['content-security-policy']);
    expect(csp).not.toMatch(/stripe|helcim/);        // the test server runs the mock provider
    expect(csp).toMatch(/img-src 'self' data:(;|$)/);
  });
});

