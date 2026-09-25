import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const csvFile = path.join(
  scriptDir,
  'canadian_drug_monographs_all_applicable_meddra_v27 - canadian_drug_monographs_all_applicable_meddra_v27.csv',
);
const query = process.argv.slice(2).join(' ').trim();

const profileFields = [
  'ID',
  'Brand Name',
  'Company',
  'Ingredients',
  'Normalized Active Ingredient',
  'Adverse Events',
  'Adverse Event MedDRA Preferred Terms',
  'Adverse Event MedDRA Primary SOCs',
  'Adverse Event Review/Unmapped Unique Terms',
  'Adverse Event MedDRA Coverage (Unique Terms)',
];

function normalized(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('en');
}

function shorten(value, maxLength = 240) {
  const text = String(value ?? '').trim();
  if (!text) return '(empty)';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function uniqueCount(records, field) {
  return new Set(records.map((record) => normalized(record[field])).filter(Boolean)).size;
}

function repeatedGroups(records, field) {
  const groups = new Map();
  for (const record of records) {
    const value = String(record[field] ?? '').trim();
    if (!value) continue;
    const key = normalized(value);
    const group = groups.get(key) ?? { value, records: [] };
    group.records.push(record);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.records.length > 1)
    .sort((a, b) => b.records.length - a.records.length);
}

try {
  const csvText = await readFile(csvFile, 'utf8');
  const parsedRows = parse(csvText, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  if (parsedRows.length === 0) {
    throw new Error('The CSV is empty.');
  }

  const headers = parsedRows[0].map((header) => String(header).trim());
  const rows = parsedRows.slice(1);
  const requiredColumns = [
    'Brand Name',
    'Company',
    'Ingredients',
    'Adverse Events',
    'Adverse Event MedDRA Preferred Terms',
  ];
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`Required CSV columns not found: ${missingColumns.join(', ')}`);
  }

  const malformedRows = rows
    .map((fields, index) => ({ csvRow: index + 2, actual: fields.length }))
    .filter(({ actual }) => actual !== headers.length);
  const records = rows.map((fields) =>
    Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ''])),
  );

  console.log('DRUG MONOGRAPH CSV PROFILE');
  console.log(`File: ${path.basename(csvFile)}`);
  console.log(`Columns: ${headers.length}`);
  console.log(`Data rows: ${records.length}`);
  console.log(`Rows with a different number of fields: ${malformedRows.length}`);
  console.log(`Headers: ${headers.join(' | ')}`);

  if (malformedRows.length > 0) {
    console.log('\nRows with field-count issues (first 10):');
    console.table(malformedRows.slice(0, 10));
  }

  console.log('\nKey-field completeness and distinct values:');
  console.table(
    profileFields
      .filter((field) => headers.includes(field))
      .map((field) => ({
        field,
        emptyRows: records.filter((record) => !String(record[field] ?? '').trim()).length,
        distinctNonEmptyValues: uniqueCount(records, field),
      })),
  );

  const exactRowCounts = new Map();
  for (const fields of rows) {
    const key = JSON.stringify(fields);
    exactRowCounts.set(key, (exactRowCounts.get(key) ?? 0) + 1);
  }
  const exactDuplicateGroups = [...exactRowCounts.values()].filter((count) => count > 1).length;
  const exactDuplicateExtraRows = [...exactRowCounts.values()]
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count - 1, 0);
  console.log('\nExact-row duplicates:');
  console.log(`Duplicate groups: ${exactDuplicateGroups}; extra repeated rows: ${exactDuplicateExtraRows}`);

  for (const field of ['ID', 'Brand Name', 'Record Key']) {
    if (!headers.includes(field)) continue;
    const groups = repeatedGroups(records, field);
    console.log(`\nRepeated ${field} values: ${groups.length} values appear on multiple rows.`);
    console.table(
      groups.slice(0, 8).map(({ value, records: groupRecords }) => ({
        value,
        rows: groupRecords.length,
        productsOrStrengths: groupRecords
          .map((record) => [record.ID, record.Dosage].filter(Boolean).join(' / '))
          .filter(Boolean)
          .slice(0, 4)
          .join('; '),
      })),
    );
  }

  const noMappedTerms = records.filter(
    (record) => !String(record['Adverse Event MedDRA Preferred Terms'] ?? '').trim(),
  ).length;
  const reviewCounts = records
    .map((record) => Number(record['Adverse Event Review/Unmapped Unique Terms']))
    .filter(Number.isFinite);
  const rowsWithUnmappedTerms = reviewCounts.filter((count) => count > 0).length;
  console.log('\nAdverse-event mapping checks:');
  console.log(`Rows without MedDRA preferred terms: ${noMappedTerms}`);
  console.log(
    `Rows with a non-zero unmapped-unique-term count: ${rowsWithUnmappedTerms} of ${records.length}`,
  );
  if (reviewCounts.length > 0) {
    console.log(
      `Unmapped-unique-term count range: ${Math.min(...reviewCounts)}–${Math.max(...reviewCounts)}`,
    );
  }

  if (query) {
    const searchFields = ['Brand Name', 'Ingredients', 'Normalized Active Ingredient', 'ID'];
    const matchingRecords = records.filter((record) =>
      searchFields.some((field) => normalized(record[field]).includes(normalized(query))),
    );
    console.log(`\nSearch for ${JSON.stringify(query)}: ${matchingRecords.length} matching rows`);
    console.table(
      matchingRecords.slice(0, 10).map((record) => ({
        product: record.ID || record['Brand Name'],
        brand: record['Brand Name'],
        company: record.Company,
        ingredients: record.Ingredients,
        dosage: record.Dosage,
        adverseEvents: shorten(record['Adverse Events']),
        medDraTerms: shorten(record['Adverse Event MedDRA Preferred Terms']),
      })),
    );
    if (matchingRecords.length > 10) {
      console.log(`Showing the first 10 of ${matchingRecords.length} matches.`);
    }
  } else {
    console.log('\nTip: pass a drug name or ingredient to see matching products and adverse events.');
  }
} catch (error) {
  console.error(`Could not analyze the CSV: ${error.message}`);
  process.exitCode = 1;
}
