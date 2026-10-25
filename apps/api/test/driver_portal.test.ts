import { describe, expect, it } from 'vitest';
import { call, login } from './helpers.js';

const asDriver = (c: string, m: string, u: string, p?: unknown) => call(c, m, u, p, { 'x-area': 'driver' });

describe('driver application and portal profile', () => {
  it('a new driver applies with details and documents, edits the profile, messages the team; documents are private', async () => {
    const email = `drv${Date.now()}@example.test`;
    const reg = await call(null, 'POST', '/api/auth/register-staff', { email, password: 'a-long-password-1', full_name: 'Ada Driver', area: 'driver' }, { 'x-area': 'driver' });
    expect(reg.status).toBeLessThan(300);
    const cookie = String(reg.headers['set-cookie']).split(';')[0];
    expect((await asDriver(cookie, 'GET', '/api/driver/me')).body.status).toBe('none');

    const ok = await asDriver(cookie, 'POST', '/api/driver/apply', { phone: '4035550123', first_name: 'Ada', last_name: 'Driver', street_address: '1 Test St', city: 'Calgary', state: 'Alberta', postal_code: 'T2P1J9',
      vehicle_type: 'car', vehicle_make: 'Toyota', vehicle_model: 'Corolla', vehicle_year: 2019, license_plate: 'ABC123', preferred_delivery_zones: ['Zone 1'],
      documents: { driver_license: { url: 'private:x.pdf', validity: '2030-01-01' }, insurance: { url: 'private:y.pdf', validity: '2020-01-01' } } });
    expect(ok.status).toBe(201);
    const me = (await asDriver(cookie, 'GET', '/api/driver/me')).body;
    expect(me).toHaveProperty('document_expired'); expect(me).toMatchObject({ first_name: 'Ada', last_name: 'Driver', city: 'Calgary', vehicle_make: 'Toyota', vehicle_year: '2019', verification_status: 'pending', is_active: false });
    expect((await asDriver(cookie, 'PUT', '/api/driver/profile', { phone: '4035550999', vehicle_color: 'Blue', payout_email: 'ada@example.test' })).status).toBe(200);
    expect((await asDriver(cookie, 'GET', '/api/driver/me')).body).toMatchObject({ phone: '4035550999', vehicle_color: 'Blue', payout_email: 'ada@example.test' });
    expect((await asDriver(cookie, 'GET', '/api/driver/documents')).body.documents.driver_license.url).toBe('private:x.pdf');

    expect((await asDriver(cookie, 'POST', '/api/driver/messages', { body: 'Hello team' })).status).toBe(201);
    expect((await asDriver(cookie, 'GET', '/api/driver/messages')).body.map((m: any) => m.body)).toContain('Hello team');

    // a not-yet-approved driver gets no jobs, and another person cannot read this driver's documents
    expect((await asDriver(cookie, 'GET', '/api/driver/jobs')).status).toBe(403);
    const other = (await login('customer@example.test')).cookie;
    expect([401, 403, 404]).toContain((await call(other, 'GET', '/api/driver/documents/driver_license/file')).status);
    expect([401, 403]).toContain((await call(other, 'POST', '/api/driver/files')).status);

    // staff see the application, the document list (never the file paths) and answer the driver
    const admin = (await login('admin@example.test')).cookie;
    const list = (await call(admin, 'GET', '/api/admin/drivers')).body as any[];
    const row = list.find((d) => d.email === email);
    expect(row.unread_messages).toBe(1);
    const detail = (await call(admin, 'GET', `/api/admin/drivers/${row.id}`)).body;
    expect(detail).toMatchObject({ city: 'Calgary', vehicle_make: 'Toyota', license_plate: 'ABC123', payout_email: 'ada@example.test' });
    expect(detail.documents.driver_license).toEqual({ on_file: true, validity: '2030-01-01' });
    expect(JSON.stringify(detail)).not.toContain('private:');
    expect((await call(admin, 'POST', `/api/admin/drivers/${row.id}/messages`, { body: 'Please upload a newer insurance slip' })).status).toBe(201);
    expect((await asDriver(cookie, 'GET', '/api/driver/messages')).body.map((m: any) => m.body)).toContain('Please upload a newer insurance slip');
    expect([401, 403]).toContain((await call(other, 'GET', `/api/admin/drivers/${row.id}`)).status);
  });
});
