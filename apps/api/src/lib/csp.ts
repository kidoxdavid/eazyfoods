/** Which outside hosts the content security policy lets the card form use, by payment provider. The mock provider needs none. */
export type PayCsp = { script: string[]; frame: string[]; connect: string[]; img: string[] };
export function paymentCsp(provider: string): PayCsp {
  if (provider === 'stripe') return {
    script: ['https://js.stripe.com'],
    frame: ['https://js.stripe.com', 'https://hooks.stripe.com', 'https://m.stripe.network'],
    connect: ['https://api.stripe.com', 'https://m.stripe.network', 'https://q.stripe.com'],
    img: ['https://*.stripe.com'],
  };
  if (provider === 'helcim') return { script: ['https://secure.helcim.app'], frame: ['https://secure.helcim.app'], connect: ['https://secure.helcim.app'], img: [] };
  return { script: [], frame: [], connect: [], img: [] };
}
