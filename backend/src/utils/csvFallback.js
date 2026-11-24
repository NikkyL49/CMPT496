import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parse } from "csv-parse/sync"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH =
    process.env.CSV_PATH ||
    path.join(__dirname, "../../data/canadian_drug_monographs_all_applicable_meddra_v27.csv")

let cache = null

// Read and parse the CSV once, then keep it in memory
export function loadCsv() {
    if (cache) return cache
    const raw = fs.readFileSync(CSV_PATH, "utf8")
    cache = parse(raw, {
        columns: true,          // first row = field names
        bom: true,              // strip the byte-order mark
        skip_empty_lines: true,
    })
    console.log(`CSV fallback loaded: ${cache.length} rows`)
    return cache
}