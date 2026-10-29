import { z } from 'zod';

/**
 * Looks a barcode up in Open Food Facts, a free public product database, so a vendor scanning an unknown item
 * gets the name, brand, size and picture filled in instead of typing them. Best effort: any failure means "not found".
 * The picture is only a link to their site; the vendor still uploads their own photo before the product goes live.
 */
export type BarcodeSuggestion = { barcode: string; name: string; brand: string; quantity: string; description: string; image_url: string; source: 'openfoodfacts' };

const BASE = () => process.env.BARCODE_LOOKUP_URL || 'https://world.openfoodfacts.org/api/v2/product';
export const barcodeCode = z.string().trim().regex(/^\d{6,14}$/, 'A barcode is 6 to 14 digits.');

export async function lookupBarcode(code: string): Promise<BarcodeSuggestion | null> {
  try {
    const r = await fetch(`${BASE()}/${code}.json?fields=product_name,brands,quantity,generic_name,ingredients_text,image_front_url`, {
      headers: { 'user-agent': 'EAZyfoods/1.0 (vendor barcode lookup)' }, signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as any;
    const p = j?.product;
    if (j?.status !== 1 || !p?.product_name) return null;
    const brand = String(p.brands ?? '').split(',')[0].trim();
    return {
      barcode: code, name: String(p.product_name).trim().slice(0, 160), brand, quantity: String(p.quantity ?? '').trim().slice(0, 40),
      description: String(p.generic_name ?? '').trim().slice(0, 500), image_url: typeof p.image_front_url === 'string' ? p.image_front_url : '', source: 'openfoodfacts',
    };
  } catch { return null; }
}
