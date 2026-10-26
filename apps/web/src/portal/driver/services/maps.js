/**
 * Google Maps directions from the driver's current location (no start point given, so Maps uses where they are).
 * Before pickup the destination is the store; after pickup it is the customer's address.
 */
export const beforePickup = (delivery) => delivery?.status === 'accepted'

export function directionsUrl(delivery) {
  const toStore = beforePickup(delivery)
  const a = toStore ? delivery?.pickup_address : delivery?.delivery_address
  const parts = a ? [a.street, a.city, a.state || 'Alberta', a.postal_code, 'Canada'].filter((x) => x && !/shown after you accept/i.test(x)) : []
  const lat = toStore ? delivery?.pickup_latitude : delivery?.delivery_latitude
  const lng = toStore ? delivery?.pickup_longitude : delivery?.delivery_longitude
  const dest = lat && lng ? `${lat},${lng}` : parts.join(', ')
  if (!dest) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`
}
