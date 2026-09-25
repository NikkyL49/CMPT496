# AANU's Project Notes

## First step: analyze the CSV data

Before building the website or its user interface, first inspect and profile the supplied Canadian drug monographs CSV. Use Node.js/JavaScript for this initial analysis so the work fits the planned backend; Python is not needed for this step.

### What the website needs to support

The initial use case is to let someone search for a drug and see its brand/product name, the company that produces it, and its adverse effects. The CSV appears to contain relevant fields such as `Brand Name`, `Company`, `Ingredients`, `Adverse Events`, `Adverse Event MedDRA Preferred Terms`, and `Adverse Event MedDRA Primary SOCs`, along with many other monograph fields.

### Analysis to do

1. Read the CSV with a proper CSV parser (not by splitting lines or fields on commas, because values can contain quoted commas and long text).
2. Report the file's row and column counts, headers, and any malformed or incomplete records.
3. Check missing values and distinct values for the fields needed by search and results: brand/product name, company, ingredients, raw adverse events, and MedDRA adverse-event terms.
4. Look for duplicate records and explain what makes records distinct. In particular, the sample includes separate product-strength rows and repeated brand/ingredient information; do not assume those are duplicate drugs or discard them before understanding the data.
5. Compare the raw `Adverse Events` text with the MedDRA preferred terms and coverage/review fields. Note that these are different representations and identify which can be shown or searched reliably.
6. Check how a search for a drug could match brand names and active ingredients, and whether company/product details vary across matching rows.

### Deliverable for this step

Produce a short data-profile report with the dataset's structure, important quality issues, duplicate/variation findings, and a recommendation for the fields and record granularity to use in the first search results. This can be a terminal report or a small local Node.js analysis script. Do not build the website, backend API, or UI yet. After reviewing the findings, decide how to represent and search the records before moving on to implementation.

### Important note

This is drug-monograph information, not personalized medical advice. Any future display should preserve the source context and avoid implying that listed adverse effects apply equally to every patient.