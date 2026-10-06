// Placeholder data for the Overview page until the backend API exists.

export const stats = {
  source: 'Health Canada monograph data',
  meddraVersion: 'MedDRA v27',
  productCount: 4586,
}

export const searchFilters = [
  'By ingredient',
  'By condition',
  'By contradiction',
  'By drug class',
]

export const inconsistencyCount = 248

export const recentMonographs = [
  {
    id: 'ach-amlodipine',
    brand: 'ACH-AMLODIPINE',
    ingredient: 'Amlodipine',
    company: 'Accord Healthcare Inc',
    revised: '2023-09-21',
    adverseEvents: 82,
    divergence: 2.2,
  },
  {
    id: 'aa-diltiaz',
    brand: 'AA-DILTIAZ',
    ingredient: 'Diltiazem',
    company: 'Aa Pharma Inc',
    revised: '2025-11-07',
    adverseEvents: 101,
    divergence: 2.3,
  },
  {
    id: 'apo-simvastatin',
    brand: 'APO-SIMVASTATIN',
    ingredient: 'Simvastatin',
    company: 'Apotex Inc',
    revised: '2024-02-20',
    adverseEvents: 59,
    divergence: 5.8,
  },
  {
    id: 'apixaban',
    brand: 'APIXABAN',
    ingredient: 'Apixaban',
    company: 'Accord Healthcare Inc',
    revised: '2025-07-17',
    adverseEvents: 62,
    divergence: 5.2,
  },
  {
    id: 'tecta',
    brand: 'TECTA',
    ingredient: 'Pantoprazole',
    company: 'Auro Pharma Inc',
    revised: '2026-08-16',
    adverseEvents: 106,
    divergence: 3.1,
  },
]
