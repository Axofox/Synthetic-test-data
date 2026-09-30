import { faker } from "@faker-js/faker";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { validateBooking, type Booking } from "./schema.js";

const COUNT = 200;
const SEED = 42;

// Same seed => same sequence of random values => same 200 bookings every run.
faker.seed(SEED);

const NEEDS = ["Breakfast", "Parking", "Late checkout", "Extra bed", "Airport shuttle", "Quiet room"];

// Format a Date as YYYY-MM-DD (in UTC, so the result doesn't depend on the machine's timezone).
const toIso = (d: Date): string => d.toISOString().slice(0, 10);

function makeBooking(): Booking {
  // Fixed from/to dates keep this deterministic.
  // (faker.date.future() is relative to "now", which would change every day.)
  const checkin = faker.date.between({ from: "2026-01-01T00:00:00Z", to: "2027-12-31T00:00:00Z" });
  const nights = faker.number.int({ min: 1, max: 14 });
  const checkout = new Date(checkin.getTime() + nights * 24 * 60 * 60 * 1000);

  return {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    totalprice: faker.number.int({ min: 50, max: 2000 }),
    depositpaid: faker.datatype.boolean(),
    bookingdates: { checkin: toIso(checkin), checkout: toIso(checkout) },
    additionalneeds: faker.helpers.arrayElement(NEEDS),
  };
}

const bookings = Array.from({ length: COUNT }, makeBooking);

// Validate every record. Collect failures instead of stopping at the first one.
const failures = bookings
  .map((b, index) => ({ index, result: validateBooking(b) }))
  .filter((r) => !r.result.valid);

if (failures.length > 0) {
  console.error(`${failures.length} of ${COUNT} generated bookings are INVALID - not writing file.`);
  for (const f of failures) console.error(`  #${f.index}: ${f.result.issues.join("; ")}`);
  process.exit(1);
}

const outDir = path.join(import.meta.dirname, "..", "data");
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "bulk-bookings.json");
writeFileSync(outFile, JSON.stringify(bookings, null, 2) + "\n");

console.log(`Generated ${bookings.length} bookings (seed ${SEED}), all valid.`);
console.log(`Written to ${path.relative(process.cwd(), outFile)}`);
