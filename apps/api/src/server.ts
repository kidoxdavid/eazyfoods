import { buildApp } from './app.js';
import { config } from './config.js';
import { startJobs } from './jobs.js';
import { grantAdmins } from './services/bootstrap.js';

const app = await buildApp();
for (const e of await grantAdmins(`${config.ADMIN_EMAILS},${config.OWNER_EMAILS}`.split(','), config.NODE_ENV === 'production')) app.log.info(`admin access granted to ${e}`);
await app.listen({ port: config.PORT, host: '0.0.0.0' });
if (!config.DISABLE_BACKGROUND_JOBS) startJobs();

if (config.SENTRY_DSN) {
  // Optional: `npm i @sentry/node` to forward errors. The first-party error log works without it.
  import('@sentry/node' as string).then((S) => S.init({ dsn: config.SENTRY_DSN, environment: config.NODE_ENV }), () => app.log.warn('SENTRY_DSN is set but @sentry/node is not installed'));
}
