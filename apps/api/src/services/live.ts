import pg from 'pg';
import { config } from '../config.js';
import type { AuthUser } from '../lib/auth.js';

/**
 * Real-time updates. The database announces which people a change matters to (see migration 044); this relays those announcements to the browsers
 * that are connected. Only a topic travels ("vendor:<id>", "user:<id>", "admin", "drivers"), never the data: the page then asks the API
 * for what it may see. Announcements arrive in bursts, so they are gathered for a moment and sent once.
 */
type Sub = { topics: Set<string>; send: (topics: string[]) => void };
const subs = new Set<Sub>();
let pending = new Set<string>();
let timer: NodeJS.Timeout | null = null;
const WINDOW_MS = 350;

const STAFF_ROLES = ['admin', 'support', 'finance', 'dispatcher', 'catalog', 'marketing'];

/** The topics a signed-in person is allowed to hear about. */
export function topicsFor(user: AuthUser): Set<string> {
  const t = new Set<string>([`user:${user.id}`]);
  for (const r of user.roles) {
    if (r.vendor_id) t.add(`vendor:${r.vendor_id}`);
    if (STAFF_ROLES.includes(r.role)) t.add('admin');
    if (r.role === 'driver') t.add('drivers');
  }
  if (user.acting_vendor) t.add(`vendor:${user.acting_vendor.id}`);
  return t;
}

export function subscribe(topics: Set<string>, send: (topics: string[]) => void) {
  const s: Sub = { topics, send };
  subs.add(s);
  return () => { subs.delete(s); };
}
export const connections = () => subs.size;

function flush() {
  timer = null;
  const batch = pending; pending = new Set();
  for (const s of subs) {
    const hit = [...batch].filter((t) => s.topics.has(t));
    if (hit.length) { try { s.send(hit); } catch { /* the connection is closing */ } }
  }
}

/** Announce a change locally (also what the database listener calls). */
export function emit(topic: string) {
  pending.add(topic);
  timer ??= setTimeout(flush, WINDOW_MS);
}

let stopped = false;
/** Listen to the database's announcements. Reconnects on its own; connected pages also refresh when they reconnect, so nothing is lost for long. */
export function startLiveListener() {
  let client: pg.Client | null = null;
  let backoff = 1000;
  const connect = async () => {
    if (stopped) return;
    client = new pg.Client({ connectionString: config.DATABASE_URL });
    client.on('notification', (m) => { if (m.channel === 'live' && m.payload) emit(m.payload); });
    client.on('error', () => {});
    client.on('end', () => { if (!stopped) setTimeout(connect, backoff = Math.min(backoff * 2, 15000)); });
    try { await client.connect(); await client.query('LISTEN live'); backoff = 1000; }
    catch { client.end().catch(() => {}); }
  };
  void connect();
  return () => { stopped = true; client?.end().catch(() => {}); };
}
