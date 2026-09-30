# Synthetic test data pipeline for restful-booker

A small, dependency-light pipeline that shows AI-first test data management against the public practice API
[restful-booker](https://restful-booker.herokuapp.com) (fake data only).

## What it does

1. **Bulk seeded generation** (`src/generate.ts`): 200 valid bookings via Faker with `faker.seed(42)`, so every run is byte-identical. Every record is validated before it is written to `data/bulk-bookings.json`.
2. **LLM edge cases** (`data/edge-cases.json`): 25 hand-designed nasty inputs written by an LLM from the schema and rules. Each has a `reason` and an `expectedValid` flag. The file is committed, not regenerated.
3. **Validation** (`src/schema.ts`, `src/validate-edge-cases.ts`): a Zod schema for structure, plus separate business-rule functions (checkout strictly after checkin, `totalprice > 0`, real `YYYY-MM-DD` calendar dates, names not blank). Every edge case is reported as accepted or rejected and compared with `expectedValid`. Nothing is dropped silently.
4. **Load and cleanup** (`src/load.ts`): POSTs the bulk bookings with a 500 ms delay, logs each `bookingid`, then deletes them (`POST /auth`, `DELETE /booking/:id`) in a `finally` block.
5. **API behaviour check** (`src/run-edge-cases.ts`): sends each edge case to the API, records status and response in `data/edge-case-results.json`, and flags findings (API accepts an invalid booking, rejects a valid one, returns a 5xx, or alters the data). It cleans up afterwards.

`src/api.ts` holds the shared HTTP helpers, including a `GET /ping` preflight so an unreachable API (for example a firewall answering 403) can never be mistaken for the API rejecting a booking.

## How to run

Requires Node 20+.

```bash
npm install
npm run generate          # writes data/bulk-bookings.json
npm run validate          # edge cases vs. Zod schema + invariants (local, no network)
npm run load              # POST bulk bookings, then delete them. LIMIT=5 npm run load for a small trial
npm run run-edge-cases    # send edge cases to the API, write data/edge-case-results.json
npm run typecheck
```

`BASE_URL` can override the API address.

## Results

| Measure | Result | Source |
|---|---|---|
| Bulk records generated | 200 (all valid, identical SHA-256 across 3 runs) | `npm run generate`, run |
| Edge cases | 25 (11 expected valid, 14 expected invalid) | `data/edge-cases.json` |
| Edge cases rejected by my schema | 14 of 25 (11 accepted) | `npm run validate`, run |
| Schema verdict matches `expectedValid` | 25 of 25 | `npm run validate`, run |
| Edge cases where the API surprised us | **Not yet run** | needs `npm run run-edge-cases` |
| Bulk load and cleanup against the API | **Not yet run** | needs `npm run load` |
| Findings | **None recorded yet** | see above |

The API rows are empty on purpose. The environment where this was built blocked outbound access to
`restful-booker.herokuapp.com` (HTTP 403 "Host not in allowlist"), so no API results exist yet. Run the two
API scripts from a machine with internet access and fill in the rows from the real output.

## Limitations

- **LLM output is non-deterministic.** Asking again gives different edge cases, so the file is stored in the repo. The bulk data is reproducible because of the seed; the edge cases are reproducible because they are committed.
- **`expectedValid` comes from my rules, so 25/25 is not independent proof.** It shows the validator implements my intent. The API check is the independent one, and those are judgement calls such as same-day stays being invalid and no maximum name length.
- **Shared practice server.** Other people use it, so requests are spaced 500 ms apart and everything created is deleted. Data can change or disappear at any time, and a failed cleanup can leave records behind (the scripts print leftover ids).
- Prices are only checked to be a number above 0, with no upper bound or currency precision rule.
