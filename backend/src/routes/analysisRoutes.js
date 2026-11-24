import express from "express"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { requireAuth } from "../middleware/requireAuth.js"
import { requireRole } from "../middleware/requireRole.js"

// Analysis results for the Analysis page and the Inconsistency report.
// Researchers only: the files live in backend/data/analysis and are no longer
// bundled into the website, so other visitors can't download them.
//
//   GET /api/analysis/:name   e.g. /api/analysis/reciprocity
//
// To add a table: put its JSON in backend/data/analysis and add it below.

const router = express.Router()
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../data/analysis")

// URL name → file (a fixed list, so no other file can be requested)
const TABLES = {
    "combination-alignment": "analysis1_combination_alignment.json",
    reciprocity: "analysis2_reciprocity.json",
    "coverage-by-year": "analysis2_coverage_by_year.json",
    "within-drug-coverage": "analysis2_within_drug_coverage.json",
    "layer1-concordance": "layer1_concordance.json",
}

const cache = new Map() // read each file once

router.use(requireAuth, requireRole("Researcher"))

router.get("/:name", async (req, res, next) => {
    const file = Object.hasOwn(TABLES, req.params.name) ? TABLES[req.params.name] : null
    if (!file) return res.status(404).json({ message: "Unknown analysis table." })
    try {
        if (!cache.has(file)) cache.set(file, JSON.parse(await fs.readFile(path.join(DIR, file), "utf8")))
        res.set("Cache-Control", "private, max-age=300")
        res.status(200).json(cache.get(file))
    } catch (err) {
        next(err)
    }
})

export default router
