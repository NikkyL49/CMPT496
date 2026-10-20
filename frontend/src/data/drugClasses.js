// Drug class for each "Normalized Active Ingredient" in the MedDRA CSV.
// The CSV has no drug class column, so this table supplies it. Combination
// products belong to every class they contain.
// If a new ingredient shows up in the data, add it here (it will show
// "Unclassified" until then). Worth a check by the team's pharmacology person.
export const DRUG_CLASSES = {
  Amlodipine: ['Dihydropyridine calcium channel blocker'],
  Diltiazem: ['Non-dihydropyridine calcium channel blocker'],

  Atorvastatin: ['Statin (HMG-CoA reductase inhibitor)'],
  Fluvastatin: ['Statin (HMG-CoA reductase inhibitor)'],
  Lovastatin: ['Statin (HMG-CoA reductase inhibitor)'],
  Pravastatin: ['Statin (HMG-CoA reductase inhibitor)'],
  Rosuvastatin: ['Statin (HMG-CoA reductase inhibitor)'],
  Simvastatin: ['Statin (HMG-CoA reductase inhibitor)'],

  Apixaban: ['Factor Xa inhibitor (anticoagulant)'],
  Rivaroxaban: ['Factor Xa inhibitor (anticoagulant)'],

  Cilazapril: ['ACE inhibitor'],
  Enalapril: ['ACE inhibitor'],
  Enalaprilat: ['ACE inhibitor'],
  Fosinopril: ['ACE inhibitor'],
  Lisinopril: ['ACE inhibitor'],
  'Lisinopril + Hydrochlorothiazide': ['ACE inhibitor', 'Thiazide diuretic'],
  Perindopril: ['ACE inhibitor'],
  Quinapril: ['ACE inhibitor'],
  Ramipril: ['ACE inhibitor'],
  Trandolapril: ['ACE inhibitor'],

  Candesartan: ['Angiotensin II receptor blocker (ARB)'],
  Losartan: ['Angiotensin II receptor blocker (ARB)'],
  Telmisartan: ['Angiotensin II receptor blocker (ARB)'],

  Bisoprolol: ['Beta blocker'],
  Metoprolol: ['Beta blocker'],

  Furosemide: ['Loop diuretic'],

  Metformin: ['Biguanide (antidiabetic)'],
  Canagliflozin: ['SGLT2 inhibitor (antidiabetic)'],
  Dapagliflozin: ['SGLT2 inhibitor (antidiabetic)'],
  Empagliflozin: ['SGLT2 inhibitor (antidiabetic)'],
  'Canagliflozin + Metformin': ['SGLT2 inhibitor (antidiabetic)', 'Biguanide (antidiabetic)'],
  'Dapagliflozin + Metformin': ['SGLT2 inhibitor (antidiabetic)', 'Biguanide (antidiabetic)'],
  'Empagliflozin + Metformin': ['SGLT2 inhibitor (antidiabetic)', 'Biguanide (antidiabetic)'],
  Dulaglutide: ['GLP-1 receptor agonist'],
  Liraglutide: ['GLP-1 receptor agonist'],
  Semaglutide: ['GLP-1 receptor agonist'],
  'Insulin Degludec + Liraglutide': ['Long-acting insulin', 'GLP-1 receptor agonist'],

  Esomeprazole: ['Proton pump inhibitor'],
  Omeprazole: ['Proton pump inhibitor'],
  Pantoprazole: ['Proton pump inhibitor'],
  Rabeprazole: ['Proton pump inhibitor'],

  Paroxetine: ['SSRI antidepressant'],
  Diazepam: ['Benzodiazepine'],
  Lorazepam: ['Benzodiazepine'],

  Amoxicillin: ['Penicillin antibiotic'],
  'Amoxicillin + Clavulanate': ['Penicillin antibiotic', 'Beta-lactamase inhibitor'],
  Ampicillin: ['Penicillin antibiotic'],
  Cloxacillin: ['Penicillin antibiotic'],
  'Penicillin V': ['Penicillin antibiotic'],
  Cephalexin: ['Cephalosporin antibiotic'],
  Azithromycin: ['Macrolide antibiotic'],
  Ciprofloxacin: ['Fluoroquinolone antibiotic'],
  'Ciprofloxacin + Dexamethasone': ['Fluoroquinolone antibiotic', 'Corticosteroid'],
  'Ciprofloxacin + Fluocinolone Acetonide': ['Fluoroquinolone antibiotic', 'Corticosteroid'],
  Levofloxacin: ['Fluoroquinolone antibiotic'],
  Moxifloxacin: ['Fluoroquinolone antibiotic'],
  Norfloxacin: ['Fluoroquinolone antibiotic'],
  Fosfomycin: ['Phosphonic acid antibiotic'],
  Nitrofurantoin: ['Nitrofuran antibiotic'],
  'Sulfamethoxazole + Trimethoprim': ['Sulfonamide antibiotic', 'Dihydrofolate reductase inhibitor'],
}

export function classesFor(ingredient) {
  return DRUG_CLASSES[ingredient] ?? ['Unclassified']
}
