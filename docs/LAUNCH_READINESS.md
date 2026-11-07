# Launch readiness report

_Written 3 Nov 2026. Covers the whole platform as it stands on `main`. It separates what was **run and passed**, what was **written but never run against the real thing**, and what **only a person can do**._

## 1. Bottom line

| Stage | Ready? | What stands in the way |
|---|---|---|
| **Demo / internal testing** (invented data, mock payments) | **Yes, today** | Nothing. This is what you are doing now. |
| **Private pilot** (3–5 real stores, real customers you know, small orders) | **Not yet** | Stripe has never been run (§4), email is log-only until a provider is set, legal pages are drafts, real device testing is thin. Roughly a week of setup and checking once you decide. |
| **Public launch** | **No** | Everything above, plus legal/tax review, staffed support, backups proven, monitoring, and a few weeks of pilot behaviour. |

The platform's *logic* is well tested. What is untested is everything that needs an outside account or a real phone: payments, email, push notifications on real devices, and your hosting.

## 2. Verified (run and passed, not assumed)

| Check | Result |
|---|---|
| API integration tests against a real Postgres | **250 passed, 1 failing** (see §6: a time-zone test that fails only on this test machine) |
| Browser end-to-end suite (real Chromium, real API and database) | **184 tests: 182 passed on the full run, 2 failed**. Both failures were one test whose search matched the new "Turn on notifications" button by mistake (the test was fixed, not the product, and passes). The full suite has not been re-run since that fix |
| Crawl of every page in all 8 areas (shop visitor, customer, vendor, chef, driver, marketing, finance, admin) on desktop **and** phone | 16 of 16 passed, no console errors |
| Phone-layout audit (no sideways scroll, tap sizes, contrast) | 192 routes audited, 0 critical, 0 high (last full run before the latest changes) |
| Type-checks (API and web), production build | Clean |
| Automated accessibility scan (axe) | Runs in the suite and passes |

**Features with their own automated tests:** checkout and the double-entry ledger; refunds; stock reservations; payouts and holds; vendor onboarding and approval; home-chef rules; pre-order time slots; group orders; order chat; substitutions; nutrition and dietary labels; rewards and EAZY+; saved items; search-as-you-type; sponsored ads in the carousel (including click counting, expiry, video upload and phone-video conversion); marketing ad approval; store time zone saving; push-notification routing (who gets what).

## 3. Written but never run against the real thing

Treat each of these as **unproven until you have done the check beside it**.

| Area | Why unproven | The check |
|---|---|---|
| **Stripe payments** | Only the mock provider has run. The Stripe code was written from the documentation. | §5 below. This is the single biggest risk. |
| **Helcim payments** (`PAYMENT_PROVIDER=helcim`) | Built from Helcim's developer documentation and tested only against a fake Helcim server. Never run against a Helcim account. Helcim has no marketplace payouts, so vendor payouts are manual bank transfers. | The Helcim setup and test checklist in `docs/PAYMENTS.md`, in a Helcim developer test account first. |
| **Stripe Connect payouts to vendors** | Same. | `docs/PAYMENTS.md` payout checklist. |
| **Email** (Resend) | Log-only unless `RESEND_API_KEY` is set; the Resend call has not been run. | Send a real order email, password reset and vendor alert to yourself; check SPF/DKIM so they do not land in spam. |
| **Text messages** (Twilio) | Written, unverified. | Optional. Leave off until needed. |
| **Push notifications** | Built last. Server-side routing is tested; **no real notification has been confirmed arriving on a phone yet**. Your test-send did not arrive, and I made the failure visible and fixed the likeliest cause (a made-up contact address that Apple rejects). | Re-add the app to the Home Screen, turn notifications on, tap "Send a test", and report the message shown. |
| **Phone-video conversion** (ffmpeg) | Tested here. Needs `ffmpeg` on your host; the bundled copy installs automatically in a normal install but is not confirmed on your host. | Upload a real phone video in the vendor Ad Designer on the hosted site. |
| **Home-screen apps** | Each portal now has its own installable setup. Not tested on real iPhones or Androids beyond what you have tried. | Re-add each portal icon and open it. |
| **Real iPhone and Android behaviour** | All browser tests run in desktop Chromium with phone-sized screens. Date pickers, the floating tab bar and Low Power Mode behaviour in particular need your phone. | Walk through the checklist in §7 on a real iPhone and Android. |
| **Alberta time zone** | The database already knows Alberta moves to UTC−6 all year. The server's Node.js (and older browsers) may not, so a winter time could be off by an hour in places. | Check an order time and a store's opening time in January against a real clock; keep Node and Postgres updated on the host. |

## 4. Things that only a person can do (cannot be automated)

1. **Decide the commercial numbers** in `docs/DECISIONS.md`: commission (12%), delivery fee ($5.99 per store), driver pay ($4.50), GST handling, payout hold days.
2. **Legal review** of the Terms, Privacy Policy and Vendor Agreement (all drafts). **Home-chef selling** needs Alberta food-premises and liability advice before any real cook sells.
3. **Accountant review** of every product's tax class and GST on delivery and on the marketplace fee.
4. **Recruit and verify pilot stores**: real catalogues, real product photos, verified documents, reviewed product-name aliases.
5. **Driver arrangements**: contractor or employee, insurance, vehicle requirements, background checks.
6. **Staff the operation**: someone owns support, refunds, payouts and ad approvals every day (§8).
7. **Real-device testing and a screen-reader pass.**

## 5. Setup (what has to be configured on the host)

### 5.1 Required settings (environment variables)
| Variable | Value for a real launch |
|---|---|
| `NODE_ENV` | `production`. The server refuses to start in production with the mock payment provider. |
| `DATABASE_URL` | A managed Postgres **with point-in-time recovery**. |
| `WEB_ORIGIN` | The exact public address, e.g. `https://eazyfoods.ca`. Also used as the push-notification identity. |
| `PAYMENT_PROVIDER` | `stripe` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` | From Stripe (test keys first). |
| `EMAIL_TRANSPORT` | `resend`, with `RESEND_API_KEY` and a real `EMAIL_FROM` (the current default is a placeholder). |
| `ADMIN_EMAILS` | Your own email(s): made admin at start-up once the account exists. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | **Set these** so push notifications survive a database reset. Generate once with `npx web-push generate-vapid-keys`. |
| `SENTRY_DSN` | Recommended: error alerts. |
| `UPLOAD_DIR` / object storage | Uploads are also stored in the database so they survive a wiped disk; move to object storage before volume. |

### 5.2 Current demo hosting is not a launch setup
`render.yaml` is deliberately a **demo**: `NODE_ENV=development`, mock payments, `DEMO_ALWAYS_OPEN=1` (stores always open), free plan. Before a pilot: switch to production settings, use a paid always-on web service and paid Postgres (free tiers sleep and have limits; check the provider's current terms), and **do not run the seed in production** (it creates invented stores).

### 5.3 First-day steps
1. Build and deploy; run migrations (`npm run migrate`; there are 51).
2. Create your owner/admin account (set `ADMIN_EMAILS`).
3. Admin: set commercial settings, delivery zones (postal areas, fees, ETAs), review policy pages, homepage content, collections.
4. Admin → System: database OK, payments does **not** say MOCK, no stale holds, email outbox empty.
5. Remove or hide all demo data: stores marked "Demo store" must not be visible.
6. Install each portal on your phone (Store, Driver, Admin, Marketing, Finance), turn notifications on in each, send a test.

## 6. Stripe go-live checks (do in this order; never skip to live keys)

**A. Account**
- Confirm Stripe Connect is available to your business in Canada, the fund flow (separate charges and transfers vs destination charges), who is merchant of record, and who carries dispute liability.
- Statement descriptor, receipt emails and business details set.

**B. Test mode**
1. Create test keys; add a webhook endpoint `POST /api/webhooks/payments` for `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`; set the three Stripe variables and `PAYMENT_PROVIDER=stripe`.
2. Run each of these and confirm the order, ledger and emails are right: successful card; **3-D Secure** card; **declined** card (no paid order must exist); **expired hold then late success**; **full refund**; **partial refund**; **dispute event**; **duplicate webhook delivery** (must not double-book); **vendor payout transfer** to a test connected account; payout **failure then retry** (exactly once).
3. Connect a test vendor end to end (hosted onboarding) and confirm payout status becomes `enabled`.
4. **Reconcile**: Stripe's balance report against the ledger's provider cash account for the test period. Import processing fees (not yet imported, so "net marketplace revenue" currently overstates margin).
5. Confirm the platform balance holds funds before transfers are made.

**C. Live**
1. Switch to live keys and a live webhook secret.
2. Place one small real order with your own card; mark it delivered; refund it; reconcile all three against Stripe and the ledger.
3. Only then open to the pilot stores.

## 7. Real-device checklist (iPhone Safari and Android Chrome, plus the home-screen apps)
- Shop: browse, search-as-you-type, basket, time-slot dropdowns, checkout, order tracking, saved items, group order link.
- Home-screen app: opens full screen, tab bar sits correctly, date pickers do not spill, carousel video starts (the first tap on iPhone Low Power Mode).
- Each portal: sign in, main task, sign out. Vendor: add product, upload a phone photo and a phone video, create an ad, change store time zone.
- Notifications: enable, test send, then a real event (place an order and watch the store phone).
- Offline: open with no signal and confirm the friendly offline page.

## 8. Operating the platform day to day

**Every day**
- Admin → Advertising / marketing → Ad Approvals: approve or reject new ads (notifications tell you).
- Vendor applications and documents: verify before approving. Home chefs also need a food-premises permit and food-handler certificate.
- Refund requests (finance approves); support tickets; the exception queue.
- Dispatch: unassigned deliveries; driver messages.
- Admin → System: outbox empty, no errors, integrations healthy.

**Every week**
- Payouts: review held, awaiting-approval and failed payouts before approving.
- Low-stock and silent-store alerts; vendor messages.
- Review ad spend, impressions, clicks against budgets.
- Check Stripe reconciliation and disputes.

**Ongoing**
- Backups: PITR on, and **rehearse a restore** (`docs/BACKUP_RECOVERY.md`) before the pilot.
- Keep Node, Postgres and dependencies updated (this also keeps time-zone data current). `npm audit` clean at high severity.
- Staff roles: least privilege; there is **no two-factor sign-in for staff yet**, so use long unique passwords.
- Privacy: named privacy officer, retention schedule, an erase process exists (`services/erase`) but is not scheduled automatically.

## 9. Known issues and gaps (honest list)
1. **One failing API test** (`preorders… skips closure days`): the test machine's Postgres and Node disagree on Alberta clock data by one hour. Not a product fault, but it is the same mismatch the time-zone risk in §3 describes.
2. **Push on iPhone**: needs iOS 16.4+, must be opened from the Home Screen icon; Low Power Mode and Focus can delay or silence it; driver-to-customer chat does not exist yet, so nothing is sent for it.
3. **No real photography**: until stores upload photos the shop shows illustrated placeholders.
4. **Seed data is invented** (stores, prices, recipes); recipes are unreviewed drafts.
5. Local-disk uploads (single API instance), no malware scanning on uploads, no staff 2FA, no automated data-retention enforcement.
6. Cook payouts are the shared manual-or-automatic flow; per-dish reviews and referrals are not built.
7. Browser tests run on the dev server with the mock payment provider; **there is no staging environment**, so the first real run of production settings would be the pilot unless you stand one up.

## 10. Recommended order of work
1. Stand up a **staging** copy with production-style settings and managed Postgres; run the full test suite there.
2. Stripe test mode, §6 B, with a written log of each result.
3. Resend with your domain (SPF/DKIM); set the VAPID keys.
4. Real-device walkthrough (§7) and fix what it finds.
5. Legal, accountant and food-safety reviews in parallel.
6. Pilot stores, real catalogues and photos; backup restore drill.
7. Live Stripe with one small real order; open the pilot; review daily for two weeks.
