import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assertApiReachable, authenticate, createBooking, deleteBooking, sleep } from "./api.js";

const DELAY_MS = 500; // pause between requests: it's a shared public server

interface EdgeCase {
  id: string;
  reason: string;
  expectedValid: boolean;
  booking: unknown;
}

interface Result {
  id: string;
  expectedValid: boolean;
  status: number; // 0 = no response (network error)
  apiVerdict: "accepted" | "rejected" | "no-response";
  bookingid?: number;
  response: unknown;
  findings: string[];
}

// JSON with object keys sorted, so two objects with the same content compare equal
// regardless of key order.
const canonical = (v: unknown): string =>
  JSON.stringify(v, (_key, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
      : val,
  );

const dataDir = path.join(import.meta.dirname, "..", "data");
const cases = JSON.parse(readFileSync(path.join(dataDir, "edge-cases.json"), "utf8")) as EdgeCase[];

const results: Result[] = [];
const createdIds: number[] = [];

// Abort before sending anything (and before writing any results) if the API is not reachable.
try {
  await assertApiReachable();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  console.error("Nothing was sent and no results were written.");
  process.exit(1);
}

console.log(`Sending ${cases.length} edge cases to the API (delay ${DELAY_MS} ms)\n`);

try {
  for (const c of cases) {
    const res = await createBooking(c.booking);
    const returned = res.body as { bookingid?: number; booking?: unknown } | null;
    const bookingid = typeof returned?.bookingid === "number" ? returned.bookingid : undefined;

    const apiVerdict: Result["apiVerdict"] =
      res.status === 0 ? "no-response" : res.status === 200 && bookingid !== undefined ? "accepted" : "rejected";
    if (bookingid !== undefined) createdIds.push(bookingid); // remember it so cleanup can delete it

    const findings: string[] = [];
    if (apiVerdict === "accepted" && !c.expectedValid) findings.push("API ACCEPTS INVALID booking");
    if (apiVerdict === "rejected" && c.expectedValid) findings.push("API REJECTS VALID booking");
    if (res.status >= 500) findings.push(`SERVER ERROR ${res.status} on this input (expected a 4xx)`);
    if (apiVerdict === "accepted" && canonical(returned?.booking) !== canonical(c.booking)) {
      findings.push("DATA ALTERED: API returned a booking different from what was sent");
    }

    results.push({
      id: c.id,
      expectedValid: c.expectedValid,
      status: res.status,
      apiVerdict,
      bookingid,
      response: res.networkError ?? res.body,
      findings,
    });

    const shown = JSON.stringify(res.networkError ?? res.body);
    console.log(
      `${c.id}  expected=${c.expectedValid ? "valid  " : "invalid"}  status=${res.status}  api=${apiVerdict.padEnd(11)}  ${shown.slice(0, 90)}`,
    );
    for (const f of findings) console.log(`         FINDING: ${f}`);
    await sleep(DELAY_MS);
  }
} finally {
  // Always clean up, even if the loop above threw.
  if (createdIds.length > 0) {
    console.log(`\nCleanup: deleting ${createdIds.length} bookings created by the edge cases`);
    try {
      const token = await authenticate();
      let deleted = 0;
      for (const id of createdIds) {
        const res = await deleteBooking(id, token);
        if (res.status === 201) deleted++; // restful-booker returns 201 for a successful DELETE
        else console.log(`  could not delete bookingid=${id}: status=${res.status}`);
        await sleep(DELAY_MS);
      }
      console.log(`Cleanup done: ${deleted}/${createdIds.length} deleted`);
    } catch (err) {
      console.log(`Cleanup FAILED (${err instanceof Error ? err.message : err}). Leftover bookingids: ${createdIds.join(", ")}`);
    }
  }
}

writeFileSync(path.join(dataDir, "edge-case-results.json"), JSON.stringify(results, null, 2) + "\n");

const noResponse = results.filter((r) => r.apiVerdict === "no-response").length;
const accepted = results.filter((r) => r.apiVerdict === "accepted").length;
const rejected = results.filter((r) => r.apiVerdict === "rejected").length;
const withFindings = results.filter((r) => r.findings.length > 0);

console.log(`\nAPI accepted: ${accepted}  rejected: ${rejected}  no response: ${noResponse}`);
console.log(`Cases with findings: ${withFindings.length}`);
for (const r of withFindings) console.log(`  ${r.id}: ${r.findings.join("; ")}`);
if (noResponse > 0) console.log(`\nWARNING: ${noResponse} case(s) got no response and could not be evaluated.`);

if (withFindings.length > 0 || noResponse > 0) process.exitCode = 1;
