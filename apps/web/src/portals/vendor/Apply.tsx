import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { post } from '../../api';
import { useAuth } from '../../auth';
import { useAction, useApi } from '../../hooks';
import { Button, Field, Input, Notice, Textarea, formValues } from '../../ui';
import { useToast } from '../../toast';
import type { Region } from '../../api';

export default function Apply() {
  const toast = useToast(); const { reload } = useAuth();
  const regions = useApi<Region[]>('/regions');
  const [sp] = useSearchParams();
  const [kind, setKind] = useState<'store' | 'chef'>(sp.get('kind') === 'chef' ? 'chef' : 'store');
  const chef = kind === 'chef';
  const [picked, setPicked] = useState<string[]>([]);
  const a = useAction(async (v: Record<string, string>) => {
    await post('/vendor/apply', { ...v, kind, cuisines: chef ? (v.cuisines ?? '').split(',').map((c) => c.trim()).filter(Boolean).slice(0, 8) : [], regions: picked, contact_email: v.contact_email || undefined, description: v.description || undefined, legal_name: v.legal_name || undefined, business_number: v.business_number || undefined });
    toast('Application started. Finish the setup checklist to submit it.'); await reload();
  });
  return (
    <div className="wrap stack lg" style={{ maxWidth: 720, margin: '24px auto' }}>
      <div className="seg" role="group" aria-label="What would you like to do?"><button type="button" className={!chef ? 'on' : ''} aria-pressed={!chef} onClick={() => setKind('store')}>Sell groceries</button><button type="button" className={chef ? 'on' : ''} aria-pressed={chef} onClick={() => setKind('chef')}>Cook and sell meals</button></div>
      {chef && <div><h1>Cook with EAZyfoods</h1><p className="muted">Sell home-cooked meals made to order. You set your menu, your daily portions and your hours; customers order from the same basket as groceries. We need your food-premises permit and food-handler certificate, which our team verifies before you can go live. Your street address is never shown publicly.</p>
        <Notice tone="warn">Selling prepared food is regulated. Check what permit your kitchen needs with Alberta Health Services before applying. EAZyfoods does not give legal advice.</Notice></div>}
      {!chef && <div><h1>Sell on EAZyfoods</h1>
        <p className="muted">Showcase your African groceries online, take orders in one place, and manage stock and prices yourself. Customers find your store by region and product. EAZyfoods charges a commission on completed orders; the rate is shown in the vendor agreement. We cannot promise any amount of sales — results depend on your products, prices and availability.</p></div>}
      <form className="panel" onSubmit={(e) => a.run(formValues(e))}>
        <h2>Tell us about your business</h2>
        {a.error && <Notice tone="error">{a.error}</Notice>}
        <div className="form-grid">
          <Field label="Business name"><Input name="business_name" required minLength={2} /></Field>
          <Field label="Legal name (optional)"><Input name="legal_name" /></Field>
          <Field label="Business / GST number (optional now)"><Input name="business_number" /></Field>
          <Field label="Phone"><Input name="phone" type="tel" required minLength={7} /></Field>
          <Field label="Contact email (optional)"><Input name="contact_email" type="email" /></Field>
          <Field label={chef ? 'Kitchen name' : 'Store name'}><Input name="store_name" required minLength={2} /></Field>
          {chef && <Field label="Cuisines you cook" hint="Separate with commas, e.g. Nigerian, West African"><Input name="cuisines" required /></Field>}
          <Field label={chef ? 'Home or kitchen address (kept private)' : 'Street address'}><Input name="address_line" required minLength={3} /></Field>
          <Field label="City"><Input name="city" defaultValue="Calgary" required /></Field>
          <Field label="Postal code"><Input name="postal_code" required placeholder="T2A 0A0" /></Field>
        </div>
        <Field label={chef ? 'About your cooking (optional)' : 'About your store (optional)'}><Textarea name="description" maxLength={1000} /></Field>
        <fieldset style={{ border: 0, padding: 0, margin: '0 0 14px' }}><legend className="label" style={{ fontWeight: 600, fontSize: '.9rem' }}>{chef ? 'Regions your cooking comes from' : 'Regional specialties'}</legend>
          <div className="pill-list">{regions.data?.map((r) => (
            <label key={r.slug} className="check"><input type="checkbox" checked={picked.includes(r.slug)} onChange={(e) => setPicked(e.target.checked ? [...picked, r.slug] : picked.filter((x) => x !== r.slug))} />{r.name}</label>))}</div></fieldset>
        <Button type="submit" size="lg" busy={a.busy}>Start application</Button>
      </form>
    </div>
  );
}
