# Financial and delivery control centre: audit and plan

Written before the build, updated as milestones land. Honest about what exists and what does not.

## What exists today (verified in the code)
| Area | Where | State |
|---|---|---|
| Money | `lib/money.ts` | Integer cents, `bps()` rounds half up, `allocate()` splits exactly. No floats in money paths. |
| Quote / checkout | `services/pricing.ts`, `services/checkout.ts` | Server computes everything. Delivery fee = one flat fee per delivery zone (`delivery_zones.fee_cents`, optional free-over). Tax per product class. Tip separate and never taxed. Coupon is platform-funded. |
| Commission | `vendors.commission_bps` or setting `commission.default_bps` | Snapshotted per suborder (`commission_bps`, `commission_cents`) and per line, so history is stable. No scoping, no effective dates, no versions. |
| Driver pay | setting `driver.pay_per_delivery_cents` | One global number copied to `deliveries.earning_cents` when the delivery is created. Tips are separate. No distance, waiting or supplements. |
| Ledger | `services/ledger.ts`, `ledger_entries` | Append-only double entry; a deferred DB trigger rejects an unbalanced transaction. Accounts: cash, vendor payable, commission, delivery revenue, tax, discount expense, driver payable, delivery cost, tips payable, refund loss, store credit. |
| Payments | `payments/provider.ts` | Mock (dev) and Stripe (written from docs, never run against a Stripe account). Signature-verified webhooks, one-time event ids, amount check. |
| Settlements | `services/payouts.ts` | Vendor/driver payouts with hold days, retries, idempotency key per payout. |
| Permissions | `lib/permissions.ts` | Role to permission map; `admin` is the only wildcard. |
| Audit | `audit()` | Every setting change is recorded. |

## Gaps against the master prompt
1. No configurable distance pricing; no distance data at all (addresses have no coordinates; no routing or geocoding provider).
2. Driver pay has no components (distance, waiting, additional pickup, handling).
3. No versioned, effective-dated, scoped rules (global, zone, store, vendor) and no approval step.
4. No simulator that shares the production calculation.
5. No customer service fee.
6. Vendor/driver statements exist as payouts and reports but not as per-order breakdowns from a rules snapshot.
7. Provider reconciliation, tax-provider integration, exceptions queue, wage-compliance reporting: not built.

## Architecture decision
One rules engine, `services/financeRules.ts`, pure functions plus a resolver. Checkout, the delivery job, the admin simulator and (later) the statements all call it. Nothing financial is computed in the browser.

* Table `pricing_rules` (kind, scope, params, status, effective dates, version, maker and approver) and append-only `pricing_rule_events`.
* Kinds: `delivery`, `driver_pay`, `commission`, `service_fee`.
* Scopes and precedence: store or vendor agreement, then zone, then global. Within a scope the newest rule whose effective date has passed wins.
* **Pricing is locked at checkout.** The resolved rule ids, versions, distance method and the amounts are stored on the suborder (`pricing_snapshot`). Driver pay is resolved as of the order's creation time, so later rule changes never alter an order already placed.
* If no active rule exists the old behaviour (zone fee, vendor/default commission, global driver pay) is used unchanged, so turning this on is a deliberate act.
* Seeded profile (your proposed CAD bands and 12% commission) is created as a **draft**: nothing is live until an administrator approves it.
* Distance: no routing provider is integrated. Each delivery rule carries an explicit fallback (`zone_fee`, `straight_line` with a stated factor, or `block`), and the method actually used is recorded on the order. Straight-line is never presented as a route.

## Permission matrix (new)
| Permission | Meaning | Roles |
|---|---|---|
| `pricing.view` | See rules, history, simulator | finance, admin |
| `pricing.edit` | Create or edit draft rules, submit | finance, admin |
| `pricing.approve` | Activate or reject a rule | admin (setting `finance.require_second_approver` forces approver to differ from author) |

## Milestones
1. Audit and design: this document. Done.
2. Rules, versioning, pricing engine, simulator, admin screen: in progress.
3. Driver pay components and vendor/driver statements from snapshots.
4. Ledger extensions (service fee, subsidies), reconciliation, exceptions queue.
5. Customer checkout wording, notifications.
6. Verification and launch readiness.

## Not done or needs a human
* A routing/geocoding provider (Google, Mapbox or OpenRouteService) and its key.
* Legal review of driver classification and wage rules; tax advice for delivery and service charges.
* Stripe verification (see `PAYMENTS.md`).
