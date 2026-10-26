/** Google Maps directions from the driver's current location (no start point given, so Maps uses where they are) to the delivery address. */
export function directionsUrl(delivery) {
  const a = delivery?.delivery_address
  const parts = a ? [a.street, a.city, a.state || 'Alberta', a.postal_code, 'Canada'].filter((x) => x && !/shown after you accept/i.test(x)) : []
  const dest = delivery?.delivery_latitude && delivery?.delivery_longitude ? `${delivery.delivery_latitude},${delivery.delivery_longitude}` : parts.join(', ')
  if (!dest) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`
}
