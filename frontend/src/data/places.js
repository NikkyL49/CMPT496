// SAMPLE pharmacies / clinics / hospitals for the Discovery map.
// These are made up (names, addresses, 555 phone numbers) — there's no
// location data in the dataset yet.
// TODO: replace with a real places source (e.g. a maps API) + the user's location.
// x / y = position on the mock map, as % of its width / height.

export const PLACE_TYPES = [
  { id: 'pharmacy', label: 'Pharmacy', plural: 'Pharmacies' },
  { id: 'hospital', label: 'Hospital', plural: 'Hospitals' },
  { id: 'clinic', label: 'Clinic', plural: 'Clinics' },
]

export const places = [
  {
    id: 'yonge-eglinton-pharmacy',
    name: 'Yonge & Eglinton Pharmacy',
    type: 'pharmacy',
    distance: '1.2 km',
    hours: 'Open until 10:00 pm',
    phone: '(416) 555-0142',
    address: '2201 Yonge Street, Toronto ON',
    x: 12,
    y: 29,
  },
  {
    id: 'midtown-community-pharmacy',
    name: 'Midtown Community Pharmacy',
    type: 'pharmacy',
    distance: '2.0 km',
    hours: 'Open 24 hours',
    phone: '(416) 555-0178',
    address: '45 St Clair Avenue West, Toronto ON',
    x: 36,
    y: 64,
  },
  {
    id: 'bayview-pharmacy',
    name: 'Bayview Village Pharmacy',
    type: 'pharmacy',
    distance: '3.4 km',
    hours: 'Open until 9:00 pm',
    phone: '(416) 555-0164',
    address: '2901 Bayview Avenue, Toronto ON',
    x: 72,
    y: 48,
  },
  {
    id: 'lakeshore-general',
    name: 'Lakeshore General Hospital',
    type: 'hospital',
    distance: '4.5 km',
    hours: 'Emergency open 24 hours',
    phone: '(416) 555-0100',
    address: '600 University Avenue, Toronto ON',
    x: 55,
    y: 33,
  },
  {
    id: 'st-clair-health',
    name: 'St. Clair Health Centre',
    type: 'hospital',
    distance: '2.7 km',
    hours: 'Emergency open 24 hours',
    phone: '(416) 555-0107',
    address: '30 Bond Street, Toronto ON',
    x: 22,
    y: 76,
  },
  {
    id: 'davisville-family-clinic',
    name: 'Davisville Family Clinic',
    type: 'clinic',
    distance: '0.8 km',
    hours: 'Open until 6:00 pm',
    phone: '(416) 555-0119',
    address: '1910 Yonge Street, Toronto ON',
    x: 58,
    y: 80,
  },
  {
    id: 'north-york-walk-in',
    name: 'North York Walk-in Clinic',
    type: 'clinic',
    distance: '3.1 km',
    hours: 'Open until 8:00 pm',
    phone: '(416) 555-0131',
    address: '3300 Yonge Street, Toronto ON',
    x: 84,
    y: 18,
  },
]
