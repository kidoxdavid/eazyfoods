/** Mirror of apps/api/src/lib/permissions.ts ROLE_PERMS. Only used to hide what a person cannot use; the API always enforces. */
export const ROLE_PERMS = {
  admin: ['*'],
  support: ['orders.view', 'orders.manage', 'support.manage', 'refunds.request', 'users.view'],
  finance: ['orders.view', 'refunds.approve', 'payouts.manage', 'reports.view', 'ledger.view', 'settings.view', 'audit.view', 'pricing.view', 'pricing.edit'],
  dispatcher: ['dispatch.manage', 'orders.view', 'orders.manage', 'drivers.manage'],
  catalog: ['catalog.manage'],
  marketing: ['marketing.manage', 'content.manage', 'promotions.manage'],
}
export const STAFF_ROLES = ['admin', 'support', 'finance', 'dispatcher', 'catalog', 'marketing']
export const permsOf = (roles = []) => roles.flatMap((r) => ROLE_PERMS[r.role] ?? [])
export const canDo = (roles, ...need) => { const p = permsOf(roles); return p.includes('*') || need.some((n) => p.includes(n)) }
