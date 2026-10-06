import express, { type Request, type Response } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

type DrugRecord = Record<string, string>;

type DrugInfo = {
  query: string;
  brandName: string[];
  productIds: string[];
  company: string[];
  ingredients: string[];
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');
const csvFile = path.join(
  projectDir,
  'canadian_drug_monographs_all_applicable_meddra_v27 - canadian_drug_monographs_all_applicable_meddra_v27.csv',
);
const publicDir = path.join(projectDir, 'public');
const app = express();

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('en');
}

function uniqueValues(records: DrugRecord[], field: string): string[] {
  const values = new Map<string, string>();
  for (const record of records) {
    const value = String(record[field] ?? '').trim();
    const key = normalize(value);
    if (key && !values.has(key)) values.set(key, value);
  }
  return [...values.values()];
}

function adverseEvents(records: DrugRecord[]): Map<string, string> {
  const events = new Map<string, string>();
  for (const record of records) {
    for (const event of String(record['Adverse Events'] ?? '').split(',')) {
      const display = event.trim();
      const key = normalize(display);
      if (key && !events.has(key)) events.set(key, display);
    }
  }
  return events;
}

function resolveDrug(query: string, records: DrugRecord[]): DrugRecord[] {
  const key = normalize(query);
  const exactId = records.filter((record) => normalize(record.ID) === key);
  if (exactId.length) return exactId;

  const exactBrand = records.filter((record) => normalize(record['Brand Name']) === key);
  if (exactBrand.length) return exactBrand;

  const ingredientFields = ['Ingredients', 'Normalized Active Ingredient'];
  const exactIngredients = records.filter((record) =>
    ingredientFields.some((field) => normalize(record[field]) === key),
  );
  if (exactIngredients.length) return exactIngredients;

  return records.filter((record) =>
    ['Brand Name', ...ingredientFields].some((field) => normalize(record[field]).includes(key)),
  );
}

function drugInfo(query: string, records: DrugRecord[]): DrugInfo {
  return {
    query,
    brandName: uniqueValues(records, 'Brand Name'),
    productIds: uniqueValues(records, 'ID'),
    company: uniqueValues(records, 'Company'),
    ingredients: uniqueValues(records, 'Ingredients'),
  };
}

function sendError(response: Response, status: number, message: string): void {
  response.status(status).json({ error: message });
}

async function startServer(): Promise<void> {
  const csvText = await readFile(csvFile, 'utf8');
  const parsed = parse(csvText, {
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][];

  if (parsed.length < 2) throw new Error('The drug-monograph CSV has no data rows.');

  const headers = parsed[0].map((header) => String(header).trim());
  const requiredColumns = ['ID', 'Brand Name', 'Company', 'Ingredients', 'Adverse Events'];
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    throw new Error(`Required CSV columns not found: ${missingColumns.join(', ')}`);
  }

  const records: DrugRecord[] = parsed.slice(1).map((fields) =>
    Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ''])),
  );

  app.use(express.json());

  app.get('/api/drugs', (_request: Request, response: Response) => {
    const choices = new Map<string, { id: string; label: string; brandName: string; company: string; ingredients: string }>();
    for (const record of records) {
      const id = String(record.ID ?? '').trim() || String(record['Brand Name'] ?? '').trim();
      if (!id || choices.has(normalize(id))) continue;
      const brandName = String(record['Brand Name'] ?? '').trim();
      const company = String(record.Company ?? '').trim();
      const ingredients = String(record.Ingredients ?? '').trim();
      choices.set(normalize(id), {
        id,
        label: [brandName, id, company].filter(Boolean).join(' — '),
        brandName,
        company,
        ingredients,
      });
    }
    response.json([...choices.values()].sort((a, b) => a.label.localeCompare(b.label)));
  });

  app.post('/api/compare', (request: Request, response: Response) => {
    const drugAQuery = typeof request.body?.drugA === 'string' ? request.body.drugA.trim() : '';
    const drugBQuery = typeof request.body?.drugB === 'string' ? request.body.drugB.trim() : '';
    if (!drugAQuery || !drugBQuery) {
      sendError(response, 400, 'Provide both drugA and drugB as non-empty strings.');
      return;
    }

    const drugARecords = resolveDrug(drugAQuery, records);
    if (!drugARecords.length) {
      sendError(response, 404, `Drug A was not found: ${drugAQuery}`);
      return;
    }
    const drugBRecords = resolveDrug(drugBQuery, records);
    if (!drugBRecords.length) {
      sendError(response, 404, `Drug B was not found: ${drugBQuery}`);
      return;
    }

    const eventsA = adverseEvents(drugARecords);
    const eventsB = adverseEvents(drugBRecords);
    const sharedAdverseEvents = [...eventsA]
      .filter(([key]) => eventsB.has(key))
      .map(([, display]) => display);
    const uniqueToDrugA = [...eventsA]
      .filter(([key]) => !eventsB.has(key))
      .map(([, display]) => display);
    const uniqueToDrugB = [...eventsB]
      .filter(([key]) => !eventsA.has(key))
      .map(([, display]) => display);

    response.json({
      drugA: drugInfo(drugAQuery, drugARecords),
      drugB: drugInfo(drugBQuery, drugBRecords),
      sharedAdverseEvents,
      uniqueToDrugA,
      uniqueToDrugB,
    });
  });

  app.use(express.static(publicDir));

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`Compare Drugs prototype running at http://localhost:${port}`);
  });
}

startServer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Could not start the Compare Drugs prototype: ${message}`);
  process.exitCode = 1;
});