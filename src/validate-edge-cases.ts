import { readFileSync } from "node:fs";
import path from "node:path";
import { validateBooking } from "./schema.js";

interface EdgeCase {
  id: string;
  reason: string;
  expectedValid: boolean;
  booking: unknown; // deliberately untyped: edge cases contain malformed data
}

const file = path.join(import.meta.dirname, "..", "data", "edge-cases.json");
const cases = JSON.parse(readFileSync(file, "utf8")) as EdgeCase[];

let accepted = 0;
let rejected = 0;
const mismatches: string[] = [];

console.log(`Validating ${cases.length} edge cases against the Zod schema + invariants\n`);
console.log("id       validator  expected  match  detail");
console.log("-------  ---------  --------  -----  ------");

for (const c of cases) {
  const result = validateBooking(c.booking);
  if (result.valid) accepted++;
  else rejected++;

  const matches = result.valid === c.expectedValid;
  if (!matches) {
    const direction = result.valid ? "validator ACCEPTED a case expected invalid" : "validator REJECTED a case expected valid";
    mismatches.push(`${c.id}: ${direction} - ${c.reason}`);
  }

  const verdict = (v: boolean) => (v ? "accept" : "reject");
  const detail = result.valid ? "" : result.issues.join(" | ");
  console.log(
    `${c.id.padEnd(7)}  ${verdict(result.valid).padEnd(9)}  ${verdict(c.expectedValid).padEnd(8)}  ${(matches ? "yes" : "NO").padEnd(5)}  ${detail}`,
  );
}

console.log(`\nAccepted by validator: ${accepted}`);
console.log(`Rejected by validator: ${rejected}`);
console.log(`Matches expectedValid: ${cases.length - mismatches.length}/${cases.length}`);

if (mismatches.length > 0) {
  console.log(`\nMISMATCHES (${mismatches.length}):`);
  for (const m of mismatches) console.log(`  - ${m}`);
  process.exitCode = 1;
}
