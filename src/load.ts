import { readFileSync } from "node:fs";
import path from "node:path";
import { authenticate, createBooking, deleteBooking, sleep } from "./api.js";
import type { Booking } from "./schema.js";

const DELAY_MS = 500; // pause between requests: it's a shared public server
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity; // e.g. LIMIT=5 for a gentle trial

const file = path.join(import.meta.dirname, "..", "data", "bulk-bookings.json");
const all = JSON.parse(readFileSync(file, "utf8")) as Booking[];
const bookings = all.slice(0, LIMIT);

console.log(`Loading ${bookings.length} bookings (delay ${DELAY_MS} ms between requests)`);

const createdIds: number[] = [];
let failed = 0;

try {
  for (const [i, booking] of bookings.entries()) {
    const res = await createBooking(booking);
    const id = (res.body as { bookingid?: number } | null)?.bookingid;
    if (res.status === 200 && typeof id === "number") {
      createdIds.push(id);
      console.log(`[${i + 1}/${bookings.length}] created bookingid=${id}`);
    } else {
      failed++;
      console.log(`[${i + 1}/${bookings.length}] FAILED status=${res.status} ${res.networkError ?? JSON.stringify(res.body)}`);
    }
    await sleep(DELAY_MS);
  }
} finally {
  // Runs even if the loop above throws, so test data never piles up on the shared server.
  console.log(`\nCleanup: deleting ${createdIds.length} bookings`);
  if (createdIds.length > 0) {
    const token = await authenticate();
    let deleted = 0;
    for (const id of createdIds) {
      const res = await deleteBooking(id, token);
      // restful-booker answers a successful DELETE with 201 (a known quirk).
      if (res.status === 201) deleted++;
      else console.log(`  could not delete bookingid=${id}: status=${res.status}`);
      await sleep(DELAY_MS);
    }
    console.log(`Cleanup done: ${deleted}/${createdIds.length} deleted`);
  }
}

console.log(`\nSummary: created=${createdIds.length} failed=${failed}`);
if (failed > 0) process.exitCode = 1;
