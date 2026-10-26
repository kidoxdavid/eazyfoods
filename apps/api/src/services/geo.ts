/**
 * Driving distance between a store and a delivery address.
 * No routing provider is integrated yet, so this returns null (unknown) and the delivery rule's explicit fallback decides what happens.
 * Wire a provider (Google Routes, Mapbox, OpenRouteService) here and every consumer starts using real route distance: pricing, driver pay and the simulator.
 */
export async function routeDistanceKm(_from: { lat: number; lng: number } | null, _to: { lat: number; lng: number } | null): Promise<number | null> {
  return null;
}
export const routingProviderConfigured = false;
