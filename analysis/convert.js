// convert.js
// Converts the analysis tabs (exported from Google Sheets as CSV) into JSON files
// ready for visualization. Each JSON file has:
//   meta: what the table is, where it came from, and a description of every column
//   rows: one object per spreadsheet row, with the sheet row number kept for tracing
//
// Usage:  node convert.js [inputFolder] [outputFolder]
// Default: node convert.js ./csv ./json
//
// Export each tab with File > Download > Comma-separated values (.csv)
// and save them in the input folder using the file names in TABLES below.

const fs = require("fs");
const path = require("path");

const inputDir = process.argv[2] || "./csv";
const outputDir = process.argv[3] || "./json";

// ---------- CSV parsing (handles quoted cells with commas or line breaks) ----------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ---------- Value converters ----------

const clean = (v) => (v === undefined ? "" : String(v).trim());

const convert = {
  text: (v) => (clean(v) === "" ? null : clean(v)),

  integer: (v) => {
    const n = parseInt(clean(v).replace(/,/g, ""), 10);
    return Number.isNaN(n) ? null : n;
  },

  // "43.03%" -> 0.4303 ; "0.4303" -> 0.4303
  percent: (v) => {
    const s = clean(v);
    if (s === "") return null;
    const n = parseFloat(s.replace("%", ""));
    if (Number.isNaN(n)) return null;
    return s.includes("%") ? round(n / 100, 4) : round(n, 4);
  },

  // Numbers like 0.27 or -1.00; text such as "none" or "No variation" becomes null
  decimal: (v) => {
    const n = parseFloat(clean(v));
    return Number.isNaN(n) ? null : round(n, 4);
  },

  // 2023 -> 2023 ; "No date" -> null (label kept in a separate field)
  year: (v) => {
    const n = parseInt(clean(v), 10);
    return Number.isNaN(n) ? null : n;
  },
};

function round(n, places) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

// Column index (0-based) to sheet letter: 0 -> A, 26 -> AA
function columnLetter(index) {
  let s = "";
  let n = index + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ---------- Table definitions ----------
// Columns are mapped by POSITION in the exported CSV, so duplicate header names
// (like the breastfeeding and pregnancy blocks in Analysis 1) stay distinct.

const CATEGORY_NOTE =
  "Most common category across products. 'Not in dataset' = no single-ingredient products; " +
  "NO INFORMATION and SECTION_NOT_FOUND = category missing.";
const MATCH_NOTE =
  "Same / Different compare the combination with the component. " +
  "'Missing data' = one side is NO INFORMATION or SECTION_NOT_FOUND. 'Not in dataset' = component has no single-ingredient products.";

const TABLES = [
  {
    input: "analysis1_pairs.csv",
    output: "analysis1_combination_alignment.json",
    title: "Analysis 1: Combination vs. component alignment",
    sheetTab: "Analysis 1: Pairs",
    description:
      "For each combination product, the most common breastfeeding and pregnancy recommendation " +
      "compared with each of its components.",
    keepRow: (cells) => clean(cells[0]).includes("+"),
    columns: [
      { key: "combination", label: "Combination", type: "text", description: "Combination product (cleaned ingredient name)" },
      { key: "component1", label: "Component 1", type: "text", description: "First component" },
      { key: "component2", label: "Component 2", type: "text", description: "Second component" },
      { key: "combinationProducts", label: "Combination Products", type: "integer", description: "Products of the combination" },
      { key: "component1Products", label: "Component 1 Products", type: "integer", description: "Single-ingredient products of component 1 (0 = only exists inside combinations)" },
      { key: "component2Products", label: "Component 2 Products", type: "integer", description: "Single-ingredient products of component 2" },
      { key: "breastfeedingCombination", label: "Most Common Category (Across Products)", type: "text", description: "Breastfeeding: " + CATEGORY_NOTE },
      { key: "breastfeedingComponent1", label: "Common Category 1", type: "text", description: "Breastfeeding: component 1. " + CATEGORY_NOTE },
      { key: "breastfeedingComponent2", label: "Common Category 2", type: "text", description: "Breastfeeding: component 2. " + CATEGORY_NOTE },
      { key: "breastfeedingMatch1", label: "Matching Common? (1)", type: "text", description: "Breastfeeding, combination vs component 1. " + MATCH_NOTE },
      { key: "breastfeedingMatch2", label: "Matching Common? (2)", type: "text", description: "Breastfeeding, combination vs component 2. " + MATCH_NOTE },
      { key: "pregnancyCombination", label: "Most Common Category", type: "text", description: "Pregnancy: " + CATEGORY_NOTE },
      { key: "pregnancyComponent1", label: "Common Category 1", type: "text", description: "Pregnancy: component 1. " + CATEGORY_NOTE },
      { key: "pregnancyComponent2", label: "Common Category 2", type: "text", description: "Pregnancy: component 2. " + CATEGORY_NOTE },
      { key: "pregnancyMatch1", label: "Matching Common?(1)", type: "text", description: "Pregnancy, combination vs component 1. " + MATCH_NOTE },
      { key: "pregnancyMatch2", label: "Matching Common?(2)", type: "text", description: "Pregnancy, combination vs component 2. " + MATCH_NOTE },
    ],
    summarize: (rows) => {
      const count = (keys) => {
        const out = {};
        rows.forEach((r) => keys.forEach((k) => { out[r[k]] = (out[r[k]] || 0) + 1; }));
        return out;
      };
      return {
        breastfeedingMatchCounts: count(["breastfeedingMatch1", "breastfeedingMatch2"]),
        pregnancyMatchCounts: count(["pregnancyMatch1", "pregnancyMatch2"]),
      };
    },
  },

  {
    input: "analysis2_reciprocity.csv",
    output: "analysis2_reciprocity.json",
    title: "Analysis 2: Interaction reciprocity",
    sheetTab: "Analysis 2: Reciprocity",
    description:
      "Drug pairs where at least one drug's labels name the other in their Drug Interactions text, " +
      "with the share of each drug's products that name the other.",
    keepRow: (cells) => clean(cells[0]) !== "" && clean(cells[4]) !== "",
    columns: [
      { key: "drugA", label: "Drug A", type: "text", description: "First drug in the pair (for one-way pairs, the side that names the other)" },
      { key: "drugB", label: "Drug B", type: "text", description: "Second drug in the pair" },
      { key: "aToB", label: "A -> B", type: "decimal", description: "Share of Drug A's products whose interaction text names Drug B (0 to 1)" },
      { key: "bToA", label: "B -> A", type: "decimal", description: "Share of Drug B's products naming Drug A (0 to 1). null = Drug B has no single-ingredient labels to check ('none' in the sheet)" },
      { key: "status", label: "Status", type: "text", description: "Two-way, One-way, or One-way (In combination)" },
    ],
    extraFields: (cells) => ({
      bToAAvailable: clean(cells[3]).toLowerCase() !== "none",
    }),
    extraColumns: [
      { key: "bToAAvailable", type: "boolean", description: "Derived: false when B -> A was 'none' in the sheet" },
    ],
    summarize: (rows) => {
      const byStatus = {};
      rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
      const testable = rows.filter((r) => r.bToAAvailable);
      const twoWay = testable.filter((r) => r.status === "Two-way").length;
      return {
        pairs: rows.length,
        byStatus,
        testablePairs: testable.length,
        twoWayShareOfTestable: testable.length ? round(twoWay / testable.length, 4) : null,
      };
    },
  },

  {
    input: "analysis2_coverage_by_year.csv",
    output: "analysis2_coverage_by_year.json",
    title: "Analysis 2: Interaction coverage by revision year",
    sheetTab: "Analysis 2: Coverage by Year",
    description:
      "Average coverage (share of a product's expected interaction partners that its label names), " +
      "grouped by the year the label was last revised. Pools all single-ingredient drugs.",
    keepRow: (cells) => clean(cells[0]) !== "" && clean(cells[0]) !== "Grand Total" && !clean(cells[0]).startsWith("Revision"),
    columns: [
      { key: "revisionYear", label: "Revision Year (Helper)", type: "year", description: "Year of the label's latest revision. null = no usable date (see revisionYearLabel)" },
      { key: "averageCoverage", label: "Coverage by Year", type: "percent", description: "Average coverage for products revised that year (0 to 1)" },
      { key: "products", label: "COUNTA of Record Key", type: "integer", description: "Number of products in that year" },
    ],
    extraFields: (cells) => ({ revisionYearLabel: clean(cells[0]) }),
    extraColumns: [
      { key: "revisionYearLabel", type: "text", description: "Year as shown in the sheet, including 'No date'" },
    ],
    // Notes typed in column D and the Grand Total row go into meta instead of rows
    collectExtras: (allCells) => {
      const notes = allCells.map((c) => clean(c[3])).filter((s) => s !== "" );
      const total = allCells.find((c) => clean(c[0]) === "Grand Total");
      return {
        notes,
        grandTotal: total ? { averageCoverage: convert.percent(total[1]), products: convert.integer(total[2]) } : null,
      };
    },
    summarize: (rows) => {
      const period = (from, to) => {
        const sel = rows.filter((r) => r.revisionYear !== null && r.revisionYear >= from && r.revisionYear <= to);
        const products = sel.reduce((s, r) => s + r.products, 0);
        const weighted = sel.reduce((s, r) => s + r.averageCoverage * r.products, 0);
        return { from, to, products, averageCoverage: products ? round(weighted / products, 4) : null };
      };
      return { periods: [period(2018, 2021), period(2022, 2025)] };
    },
  },

  {
    input: "analysis2_within_drug.csv",
    output: "analysis2_within_drug_coverage.json",
    title: "Analysis 2: Within-drug coverage check",
    sheetTab: "Analysis 2: Within-drug Coverage Check",
    description:
      "For each drug, the correlation between revision year and coverage across its own products, " +
      "so differences between drugs do not affect the result.",
    keepRow: (cells) => clean(cells[0]) !== "" && clean(cells[0]) !== "Drug" && !Number.isNaN(parseInt(clean(cells[1]), 10)),
    columns: [
      { key: "drug", label: "Drug", type: "text", description: "Active ingredient (cleaned Ingredients column)" },
      { key: "productsScored", label: "Products Scored", type: "integer", description: "Products with both a revision year and a coverage score" },
      { key: "correlation", label: "Correlation", type: "decimal", description: "Pearson correlation of revision year and coverage (-1 to 1). null = 'No variation'" },
      { key: "earliestYear", label: "Earliest (Year)", type: "year", description: "Oldest revision year among scored products" },
      { key: "latestYear", label: "Latest (Year)", type: "year", description: "Most recent revision year among scored products" },
      { key: "averageCoverage", label: "Average Coverage", type: "percent", description: "Average coverage across the drug's products (0 to 1)" },
    ],
    extraFields: (cells, row) => ({
      correlationStatus: row.correlation === null ? "no_variation" : "calculated",
    }),
    extraColumns: [
      { key: "correlationStatus", type: "text", description: "Derived: 'calculated' or 'no_variation'" },
    ],
    summarize: (rows) => {
      const calc = rows.filter((r) => r.correlation !== null);
      const big = calc.filter((r) => r.productsScored >= 10);
      const weightSum = calc.reduce((s, r) => s + r.productsScored, 0);
      const weighted = calc.reduce((s, r) => s + r.correlation * r.productsScored, 0);
      return {
        drugs: rows.length,
        positive: calc.filter((r) => r.correlation > 0).length,
        negative: calc.filter((r) => r.correlation < 0).length,
        noVariation: rows.length - calc.length,
        positiveWith10PlusProducts: big.filter((r) => r.correlation > 0).length,
        negativeWith10PlusProducts: big.filter((r) => r.correlation < 0).length,
        weightedAverageCorrelation: weightSum ? round(weighted / weightSum, 4) : null,
      };
    },
  },
];

// ---------- Conversion ----------

function convertTable(table) {
  const file = path.join(inputDir, table.input);
  if (!fs.existsSync(file)) {
    console.warn(`Skipped: ${table.input} not found in ${inputDir}`);
    return;
  }

  const allCells = parseCsv(fs.readFileSync(file, "utf8"));
  const rows = [];

  allCells.forEach((cells, i) => {
    if (i === 0) return;                 // header row
    if (!table.keepRow(cells)) return;   // blank rows, totals, legend text

    const row = { id: rows.length + 1, sheetRow: i + 1 };
    table.columns.forEach((col, c) => { row[col.key] = convert[col.type](cells[c]); });
    if (table.extraFields) Object.assign(row, table.extraFields(cells, row));
    rows.push(row);
  });

  const columns = [
    { key: "id", type: "integer", description: "Row number in this JSON file" },
    { key: "sheetRow", type: "integer", description: "Row number in the spreadsheet tab, for tracing back" },
    ...table.columns.map((col, c) => ({
      key: col.key,
      label: col.label,
      sheetColumn: columnLetter(c),
      type: col.type === "percent" ? "number (0 to 1)" : col.type,
      description: col.description,
    })),
    ...(table.extraColumns || []),
  ];

  const meta = {
    title: table.title,
    description: table.description,
    sheetTab: table.sheetTab,
    sourceFile: table.input,
    generatedAt: new Date().toISOString(),
    rowCount: rows.length,
    columns,
    ...(table.collectExtras ? table.collectExtras(allCells) : {}),
    summary: table.summarize ? table.summarize(rows) : undefined,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, table.output), JSON.stringify({ meta, rows }, null, 2));
  console.log(`Wrote ${table.output} (${rows.length} rows)`);
}

TABLES.forEach(convertTable);
