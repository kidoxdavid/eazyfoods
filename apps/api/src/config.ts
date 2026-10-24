import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_DAYS: z.coerce.number().default(30),
  // Payments: 'mock' is a clearly-labelled development provider that exercises the real webhook path. Not allowed in production.
  PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  MOCK_WEBHOOK_SECRET: z.string().default('dev-mock-webhook-secret'),
  // Email: 'log' writes to the console/outbox only. 'resend' needs RESEND_API_KEY and EMAIL_FROM.
  EMAIL_TRANSPORT: z.enum(['log', 'resend']).default('log'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('EAZyfoods <orders@example.invalid>'),
  // Text messages: 'log' only records them. 'twilio' needs the three values below (UNVERIFIED against a live Twilio account).
  SMS_TRANSPORT: z.enum(['log', 'twilio']).default('log'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  PUBLIC_API_URL: z.string().default('http://localhost:4000'),
  SENTRY_DSN: z.string().optional(),
  // Comma-separated emails that are made admins (full access) when the server starts. Set by whoever runs the host; never by a customer. OWNER_EMAILS is the older name and still works.
  ADMIN_EMAILS: z.string().default(''),
  OWNER_EMAILS: z.string().default(''),
  DISABLE_BACKGROUND_JOBS: z.coerce.boolean().default(false),
  // For automated browser tests only: raises per-route rate limits. Refused in production.
  RATE_LIMIT_OFF: z.coerce.boolean().default(false),
});

export const config = schema.parse(process.env);
export const isProd = config.NODE_ENV === 'production';

if (isProd) {
  if (config.RATE_LIMIT_OFF) throw new Error('RATE_LIMIT_OFF is not allowed in production');
  if (config.PAYMENT_PROVIDER === 'mock') throw new Error('PAYMENT_PROVIDER=mock is not allowed in production');
  if (config.PAYMENT_PROVIDER === 'stripe' && (!config.STRIPE_SECRET_KEY || !config.STRIPE_WEBHOOK_SECRET))
    throw new Error('Stripe requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET');
}
