// Layer 1 manufacturer concordance (the full "workbook" analysis), computed from
// the monograph CSV and written to backend/data/analysis/layer1_concordance.json.
// The backend serves it to researchers (GET /api/analysis/layer1-concordance) and
// the Inconsistency report shows it on each ingredient's page.
//
//   cd backend
//   npm run build:layer1
//
// Method (same as the Analysis 1 draft):
// 1. Profile = Company × Normalized Active Ingredient. A company's strengths are
//    merged: MedDRA term sets are unioned; pregnancy, breastfeeding, kidney and
//    liver guidance take the most common value (a tie → "MIXED/TIE").
// 2. Set concordance: for every pair of manufacturers of an ingredient,
//    Jaccard J(A,B) = |A ∩ B| ÷ |A ∪ B| on adverse event, warning/precaution and
//    contraindication preferred terms (PTs) and system organ classes (SOCs),
//    averaged per ingredient. Pairs where both sets are empty are left out.
// 3. Categorical concordance: modal agreement (largest category ÷ manufacturers)
//    and normalized Shannon entropy H ÷ ln k (k = categories seen; 0 = consensus).
// 4. Consensus per ingredient and PT domain = terms listed by ≥ 50% of
//    manufacturers. Each manufacturer's distance = 1 − mean of its Jaccard with
//    the AE, warning and contraindication consensus. < 0.40 within range,
//    0.40–0.59 review, ≥ 0.60 high-priority review.
// 5. Composite (triage only) = mean of the three PT Jaccards and the four modal
//    agreements. ≥ 0.80 high, 0.60–0.79 moderate, < 0.60 lower.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parse } from "csv-parse/sync"

const here = path.dirname(fileURLToPath(import.meta.url))
const CSV = process.argv[2] ?? path.join(here, "../data/canadian_drug_monographs_all_applicable_meddra_v27.csv")
const OUT = process.argv[3] ?? path.join(here, "../data/analysis/layer1_concordance.json")

const SETS = {
    aePt: "Adverse Event MedDRA Preferred Terms",
    aeSoc: "Adverse Event MedDRA Primary SOCs",
    warningPt: "Warning/Precaution MedDRA Preferred Terms",
    warningSoc: "Warning/Precaution MedDRA Primary SOCs",
    contraPt: "Contraindication MedDRA Preferred Terms",
    contraSoc: "Contraindication MedDRA Primary SOCs",
}
const CATEGORIES = {
    pregnancy: "Pregnancy Recommendation",
    breastfeeding: "Breastfeeding Recommendation",
    kidney: "Kidney Function Dose Adjustment",
    liver: "Liver Function Dose Adjustment",
}
const PT_DOMAINS = ["aePt", "warningPt", "contraPt"]
const CONSENSUS_SHARE = 0.5
const FLAGS = [
    { min: 0.6, label: "High-priority review" },
    { min: 0.4, label: "Review" },
    { min: -1, label: "Within consensus range" },
]
const BANDS = [
    { min: 0.8, label: "High" },
    { min: 0.6, label: "Moderate" },
    { min: -1, label: "Lower / review" },
]

const round = (n, d = 3) => (n == null || Number.isNaN(n) ? null : Math.round(n * 10 ** d) / 10 ** d)
const mean = (xs) => {
    const v = xs.filter((x) => x != null && !Number.isNaN(x))
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}
const splitTerms = (s) =>
    String(s ?? "")
        .split("|")
        .map((t) => t.trim())
        .filter(Boolean)

function jaccard(a, b) {
    if (!a.size && !b.size) return null // both empty: missing, not perfect agreement
    let inter = 0
    a.forEach((t) => b.has(t) && inter++)
    return inter / (a.size + b.size - inter)
}

function mode(values) {
    const counts = new Map()
    values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1))
    const top = Math.max(...counts.values())
    const winners = [...counts].filter(([, c]) => c === top).map(([v]) => v)
    return winners.length === 1 ? winners[0] : "MIXED/TIE"
}

// ---------- profiles ----------
const rows = parse(fs.readFileSync(CSV, "utf8"), { columns: true, bom: true, skip_empty_lines: true })
const profiles = new Map() // "ingredient|company" → profile
for (const r of rows) {
    const ingredient = r["Normalized Active Ingredient"].trim()
    const company = r.Company.trim()
    const key = `${ingredient}|${company}`
    if (!profiles.has(key)) {
        profiles.set(key, {
            ingredient,
            company,
            brands: new Set(),
            records: 0,
            sets: Object.fromEntries(Object.keys(SETS).map((k) => [k, new Set()])),
            raw: Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, []])),
            revised: [],
        })
    }
    const p = profiles.get(key)
    p.records += 1
    p.brands.add(r["Brand Name"].trim())
    for (const [k, col] of Object.entries(SETS)) splitTerms(r[col]).forEach((t) => p.sets[k].add(t))
    for (const [k, col] of Object.entries(CATEGORIES)) p.raw[k].push(r[col].trim() || "BLANK")
    if (r["Revision Date"]) p.revised.push(r["Revision Date"].slice(0, 10))
}

const byIngredient = new Map()
for (const p of profiles.values()) {
    p.category = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, mode(p.raw[k])]))
    byIngredient.set(p.ingredient, [...(byIngredient.get(p.ingredient) ?? []), p])
}

// ---------- per ingredient ----------
const ingredients = []
const manufacturers = []
let pairCount = 0
for (const [ingredient, list] of [...byIngredient].sort((a, b) => a[0].localeCompare(b[0]))) {
    const n = list.length
    if (n < 2) continue
    pairCount += (n * (n - 1)) / 2

    // 2. pairwise Jaccard per domain
    const jac = {}
    for (const k of Object.keys(SETS)) {
        const values = []
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) values.push(jaccard(list[i].sets[k], list[j].sets[k]))
        jac[k] = round(mean(values))
    }

    // 3. categorical agreement
    const cat = {}
    for (const k of Object.keys(CATEGORIES)) {
        const counts = new Map()
        list.forEach((p) => counts.set(p.category[k], (counts.get(p.category[k]) ?? 0) + 1))
        const top = [...counts].sort((a, b) => b[1] - a[1])[0]
        const kSeen = counts.size
        const h = [...counts.values()].reduce((s, c) => s - (c / n) * Math.log(c / n), 0)
        cat[k] = {
            mode: top[0],
            agreement: round(top[1] / n),
            entropy: round(kSeen > 1 ? h / Math.log(kSeen) : 0),
            categories: Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])),
        }
    }

    // 4. consensus and per-manufacturer distance
    const consensus = {}
    for (const k of PT_DOMAINS) {
        const counts = new Map()
        list.forEach((p) => p.sets[k].forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
        consensus[k] = new Set([...counts].filter(([, c]) => c / n >= CONSENSUS_SHARE).map(([t]) => t))
    }
    for (const p of list) {
        const sim = Object.fromEntries(PT_DOMAINS.map((k) => [k, jaccard(p.sets[k], consensus[k])]))
        const meanSim = mean(Object.values(sim))
        const distance = meanSim == null ? null : 1 - meanSim
        manufacturers.push({
            ingredient,
            company: p.company,
            brands: [...p.brands].sort(),
            records: p.records,
            latestRevision: p.revised.sort().at(-1) ?? null,
            terms: Object.fromEntries(PT_DOMAINS.map((k) => [k, p.sets[k].size])),
            similarity: Object.fromEntries(PT_DOMAINS.map((k) => [k, round(sim[k])])),
            distance: round(distance),
            flag: distance == null ? "Not enough data" : FLAGS.find((f) => distance >= f.min).label,
            guidance: p.category,
        })
    }

    // 5. composite (triage only)
    const composite = mean([...PT_DOMAINS.map((k) => jac[k]), ...Object.keys(CATEGORIES).map((k) => cat[k].agreement)])
    ingredients.push({
        ingredient,
        manufacturers: n,
        jaccard: jac,
        categorical: cat,
        consensusSize: Object.fromEntries(PT_DOMAINS.map((k) => [k, consensus[k].size])),
        composite: round(composite),
        band: composite == null ? null : BANDS.find((b) => composite >= b.min).label,
    })
}

const flagged = manufacturers.filter((m) => m.flag !== "Within consensus range" && m.flag !== "Not enough data")
const out = {
    meta: {
        title: "Layer 1: manufacturer concordance",
        description:
            "How similar manufacturer monographs of the same active ingredient are in adverse events, warnings/precautions, contraindications and population-specific guidance. Regulatory-label content, not patient-level risk.",
        source: path.basename(CSV),
        generatedBy: "backend/scripts/build-layer1.mjs",
        records: rows.length,
        profiles: profiles.size,
        ingredients: byIngredient.size,
        assessableIngredients: ingredients.length,
        pairs: pairCount,
        consensusShare: CONSENSUS_SHARE,
        flags: { review: 0.4, highPriority: 0.6 },
        compositeBands: { high: 0.8, moderate: 0.6 },
        flaggedProfiles: flagged.length,
        notes: [
            "Composite = mean of AE, warning and contraindication PT Jaccard plus pregnancy, breastfeeding, kidney and liver modal agreement. Triage only; read the domain metrics.",
            "Categorical values use the most common value across a company's strengths; ties become MIXED/TIE. SECTION_NOT_FOUND and NO INFORMATION count as their own categories.",
            "Before acting on a flag, check revision date, formulation, strength, indications, extraction and MedDRA coverage.",
        ],
    },
    ingredients: ingredients.sort((a, b) => (a.composite ?? 1) - (b.composite ?? 1)),
    manufacturers: manufacturers.sort((a, b) => (b.distance ?? -1) - (a.distance ?? -1)),
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`)
console.log(
    `Layer 1: ${out.meta.profiles} profiles, ${out.meta.assessableIngredients} ingredients with 2+ manufacturers, ${pairCount} pairs, ${flagged.length} profiles flagged → ${path.relative(process.cwd(), OUT)}`,
)
