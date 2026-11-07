import { config } from '../config.js';
import { MockProvider } from './mock.js';
import { StripeProvider } from './stripe.js';
import { HelcimProvider } from './helcim.js';

export type NormalizedEvent = {
  id: string;
  type: 'payment_succeeded' | 'payment_failed' | 'dispute_opened' | 'other';
  providerPaymentId?: string;
  /** The processor's own id for the charge, kept so a refund can name it (Helcim). */
  providerTransactionId?: string;
  amountCents?: number;
  failureMessage?: string;
  raw: unknown;
};

export interface PaymentProvider {
  readonly name: 'mock' | 'stripe' | 'helcim';
  createPayment(a: { amountCents: number; currency: string; orderNumber: string; email: string; idempotencyKey: string }): Promise<{ providerPaymentId: string; clientSecret: string; /** Server-only value used to verify the result (Helcim secretToken). */ providerSecret?: string }>;
  cancelPayment(providerPaymentId: string): Promise<void>;
  /** Throws if the signature is invalid. */
  parseWebhook(raw: Buffer, headers: Record<string, string | string[] | undefined>): NormalizedEvent | Promise<NormalizedEvent>;
  refund(a: { providerPaymentId: string; amountCents: number; idempotencyKey: string; providerTransactionId?: string | null; originalAmountCents?: number }): Promise<{ providerRefundId: string }>;
  transfer?(a: { destinationAccount: string; amountCents: number; idempotencyKey: string }): Promise<{ transferId: string }>;
  /** Connect onboarding for payees (hosted by the provider, so we never handle bank details or identity documents). */
  createConnectAccount?(a: { email: string; businessName: string; vendorId: string }): Promise<{ accountId: string }>;
  createOnboardingLink?(a: { accountId: string; returnUrl: string; refreshUrl: string }): Promise<{ url: string }>;
  getAccountStatus?(accountId: string): Promise<{ payoutsEnabled: boolean; detailsSubmitted: boolean; requirementsDue: string[] }>;
}

let provider: PaymentProvider | undefined;
export function getProvider(): PaymentProvider {
  provider ??= config.PAYMENT_PROVIDER === 'stripe' ? new StripeProvider() : config.PAYMENT_PROVIDER === 'helcim' ? new HelcimProvider() : new MockProvider();
  return provider;
}
/** Tests only: swap the provider (for example a Helcim adapter pointed at a fake Helcim server). Pass undefined to go back to the configured one. */
export function setProviderForTests(p: PaymentProvider | undefined) { provider = p; }
