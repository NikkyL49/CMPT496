// frontend/src/data/analysis.js
// Analysis results for visualizations. Swap these imports for API calls later.
import combinationAlignment from "./analysis/analysis1_combination_alignment.json";
import reciprocity from "./analysis/analysis2_reciprocity.json";
import coverageByYear from "./analysis/analysis2_coverage_by_year.json";
import withinDrugCoverage from "./analysis/analysis2_within_drug_coverage.json";

export { combinationAlignment, reciprocity, coverageByYear, withinDrugCoverage };

// Usage:
// "import { reciprocity } from "../data/analysis";"
// reciprocity.rows   the 100 pairs
// reciprocity.meta   column descriptions and summary"