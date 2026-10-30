// Real pharmacies / clinics / hospitals for the Discovery map, from
// OpenStreetMap through the free Overpass API (no API key needed).
// Map tiles also come from OpenStreetMap (see Discovery.jsx), and postal code /
// address search uses OpenStreetMap's free Nominatim geocoder.
//
// These are shared public services: keep queries small (one radius, a
// capped result count) and only re-query when the user asks for a new area.

export const PLACE_TYPES = [
  { id: 'pharmacy', label: 'Pharmacy', plural: 'Pharmacies' },
  { id: 'hospital', label: 'Hospital', plural: 'Hospitals' },
  { id: 'clinic', label: 'Clinic', plural: 'Clinics' },
]

// Used when the browser can't or won't share the user's location
export const DEFAULT_CENTER = { lat: 43.6532, lng: -79.3832, label: 'Toronto' }

export const RADIUS_KM = 5

// Free public servers are often busy: try the main one, then mirrors.
// Each try gives up after TRY_TIMEOUT_MS so a hung server can't freeze the map.
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const TRY_TIMEOUT_MS = 20000
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

// Ask the browser where the user is. Resolves { lat, lng, accuracyM } or null
// (denied, unsupported, timed out) — never rejects, so the map can fall back.
// accuracyM is how far off the browser thinks it could be. On a laptop with no
// GPS it's often 1–20 km, because the position is guessed from the network.
export function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60 * 1000 },
    )
  })
}

// Postal code or address → { lat, lng, label }, or null if nothing matched.
// Limited to Canada, like the drug data (Health Canada monographs).
export async function geocode(text) {
  const params = new URLSearchParams({ q: text, format: 'jsonv2', limit: '1', countrycodes: 'ca' })
  const res = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error("Couldn't look up that address. Try again in a moment.")
  const [hit] = await res.json()
  if (!hit) return null
  return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name.split(',').slice(0, 2).join(',') }
}

// Straight-line distance in km between two { lat, lng } points
function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

// OSM tags the same kind of place several ways (amenity=pharmacy,
// healthcare=pharmacy, shop=chemist for drugstores like Shoppers), so check them all.
function placeType(t) {
  if (t.amenity === 'pharmacy' || t.healthcare === 'pharmacy' || t.shop === 'chemist') return 'pharmacy'
  if (t.amenity === 'hospital' || t.healthcare === 'hospital') return 'hospital'
  if (/^(clinic|doctors)$/.test(t.amenity) || /^(clinic|doctor|centre)$/.test(t.healthcare)) return 'clinic'
  return null
}

function formatAddress(t) {
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
  return [street, t['addr:city'], t['addr:postcode']].filter(Boolean).join(', ')
}

// Places within RADIUS_KM of center, nearest first.
// Each: { id, name, type, lat, lng, distanceKm, address, phone, hours, website }
export async function fetchNearbyPlaces(center, { signal } = {}) {
  const a = `around:${RADIUS_KM * 1000},${center.lat},${center.lng}`
  // A cap per type, so a downtown full of pharmacies can't push the hospitals out.
  // ( ... ); merges the tag variants and drops duplicates.
  const query = `[out:json][timeout:25];
(nwr["amenity"="pharmacy"](${a});nwr["healthcare"="pharmacy"](${a});nwr["shop"="chemist"](${a}););
out center tags 120;
(nwr["amenity"="hospital"](${a});nwr["healthcare"="hospital"](${a}););
out center tags 30;
(nwr["amenity"~"^(clinic|doctors)$"](${a});nwr["healthcare"~"^(clinic|doctor|centre)$"](${a}););
out center tags 100;`

  let res
  for (const url of OVERPASS_URLS) {
    try {
      const trySignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(TRY_TIMEOUT_MS)]) : AbortSignal.timeout(TRY_TIMEOUT_MS)
      res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal: trySignal })
      if (res.ok) break
    } catch (err) {
      if (signal?.aborted) throw err // the user moved on; a timeout just means try the next server
      res = null
    }
  }
  if (!res?.ok) {
    throw new Error("The free map service is busy right now. Try again in a minute.")
  }
  const { elements = [] } = await res.json()

  const seen = new Set()
  return elements
    .map((el) => {
      const t = el.tags ?? {}
      const lat = el.lat ?? el.center?.lat
      const lng = el.lon ?? el.center?.lon
      const type = placeType(t)
      const id = `${el.type}/${el.id}`
      if (lat == null || !type || seen.has(id)) return null
      seen.add(id) // a place tagged two ways can come back in two groups
      return {
        id,
        name: t.name || t.brand || `Unnamed ${type}`,
        type,
        lat,
        lng,
        distanceKm: distanceKm(center, { lat, lng }),
        address: formatAddress(t),
        phone: t.phone || t['contact:phone'] || '',
        hours: t.opening_hours || '',
        website: t.website || t['contact:website'] || '',
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}
