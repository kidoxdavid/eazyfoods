# Financial rules: how to operate them

All delivery fees, driver pay, vendor commission and (later) customer service fees come from **one rules engine** (`apps/api/src/services/financeRules.ts`). Checkout, the delivery job, the admin simulator and the statements call the same functions. Change a rule in **Admin → Pricing & rules** and every surface follows.

## Rule lifecycle
`draft` → `pending_approval` → `active` (→ `retired`). A rejected rule goes back to editing. Active rules cannot be edited: create a **new version**. Every step is written to an append-only history (`pricing_rule_events`) and the audit log.

* **Permissions:** `pricing.view`, `pricing.edit` (finance and admin), `pricing.approve` (admin). Setting `finance.require_second_approver` forces the approver to be a different person from the author.
* **Never back-dated.** An approved rule takes effect from now or a future time. Approving a rule ends the previous rule in the same scope at that moment.
* **Stale edits are refused** (409) if someone else changed the draft meanwhile.

## Which rule applies
Store agreement, then vendor agreement, then delivery zone, then global. Within a scope, the newest rule whose start time has passed. If no rule exists, the old behaviour continues (zone fee, vendor or default commission, global driver pay), so nothing changes until a rule is approved. A global commission rule does not override a vendor's own negotiated rate unless a store or vendor rule says so.

## Locking
Pricing is locked at checkout. The suborder stores `pricing_snapshot` (rule ids and versions, distance and how it was measured, fee, commission basis). Driver pay is resolved as of the order's creation time and stored in `deliveries.pay_breakdown`. Later rule changes do not touch placed orders. Refunds and ledger postings use the stored amounts.

## Distance
Delivery distance bands use **inclusive upper limits**: with bands up to 3, 5, 8 km, 3.0 km is band 1 and 3.1 km is band 2. **No routing service is connected yet**: addresses have no coordinates and `services/geo.ts` returns "unknown". Each distance rule therefore says what to do (`zone_fee`, `straight_line` x factor, or `block`), and the method actually used is recorded on the order. Straight-line is never presented as a driving route. Connecting a provider changes only `geo.ts` (plus geocoding addresses).

## Proposed starting profile
Migration 038 inserts your proposed bands (CAD 4.99/5.99/7.99/9.99/11.99, driver 5.00/5.75/7.00/8.50/10.00, maximum 15 km) and a 12% commission as **drafts**. They are assumptions, not proven rates, and are not live until approved. Run the simulator first.

## Simulator
`POST /api/admin/pricing/simulate` and the Simulator tab: same calculation as production, invented inputs, creates and charges nothing. Processing cost is an assumption and labelled as such. Tips and tax are pass-through, never revenue.

## Settlements, statements and reconciliation
* **Preview before paying** (Finance window → Settlements → Preview a vendor): merchandise, commission, net payable, what is still inside the hold period, earlier payouts, any active hold, how it will be paid (provider transfer or bank transfer), and a ledger-versus-orders difference if there is one.
* **Approval above a threshold**: setting `payout.approval_threshold_cents` (0 = off). Above it a payout is created as *awaiting approval*, nothing is sent, and a different person with `payouts.approve` (admin) must approve it. The author cannot approve their own. An approver can also cancel it; the orders return to unpaid. Finance cannot pay it around the approval.
* **Holds**: finance can place a hold on a vendor or driver (payouts are refused, automatic payouts skip them); only an approver can release it.
* **Statements**: `GET /api/vendor/statement` and `GET /api/driver/statement` (own records only) and `GET /api/admin/statements/{vendor|driver}/:id`. Vendor net = merchandise - commission + refund adjustments; driver base pay and tips are separate. Totals come from the same ledger entries as the payouts.
* **Reconciliation** (`GET /api/admin/reconciliation`): unbalanced ledger transactions; succeeded payments, refunds, payouts and driver earnings with no (or a different) ledger entry; orders marked paid without a confirmed payment; vendor balance vs their unpaid orders; payouts stuck over 3 days or waiting for approval over a day. It **never** posts a balancing entry. Finance records what they did (acknowledged, resolved, note); the difference stays listed until the records are corrected.
* **Matching the provider**: `GET /api/admin/reconciliation/movements.csv` lists every payment, refund and payout with its provider reference and whether it is in the ledger, to compare with the provider's own report. A direct comparison with the provider's balance is **not** automated.

## Not done yet
Waiting-time pay (needs a store-arrival event), additional-pickup and handling inputs from real orders, customer service fee in checkout and the ledger, promotion subsidy rules, tax provider, automated comparison with the payment provider's reports, provider-confirmed payout states beyond the existing transfer result, chargeback handling, driver wage-compliance reporting, notifications for settlement events, a routing provider. See `FINANCE_AUDIT.md`.
