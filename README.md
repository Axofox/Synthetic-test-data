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

The same steps run in GitHub Actions (`.github/workflows/pipeline.yml`) on every push, so the pipeline also runs where the API is reachable. The edge-case step exits 1 when it finds something, so the workflow keeps going and uploads `edge-case-results.json` as a run artifact.

`BASE_URL` can override the API address.

## Results

Real output from GitHub Actions runs [#1](https://github.com/Axofox/Synthetic-test-data/actions/runs/36697089440) and [#2](https://github.com/Axofox/Synthetic-test-data/actions/runs/36698220892) on 2026-09-30. Both runs gave the same verdicts. The field-level changes come from run #2, the first one that printed them.

| Measure | Result |
|---|---|
| Bulk records generated | 200, all valid, identical SHA-256 across 3 local runs |
| Bulk load | 200 created, 0 failed; cleanup deleted 200/200 (run #1) |
| Edge cases | 25 (11 expected valid, 14 expected invalid) |
| Rejected by my schema | 14 of 25 (matches `expectedValid` 25/25) |
| Accepted by the API | 22 of 25 (the other 3 got HTTP 500) |
| Edge cases where the API surprised us | 15 of 25 |
| Edge-case cleanup | 22/22 deleted |

### Findings

**A. The API accepts bookings my rules call invalid (11 cases, HTTP 200)**

| Case | Input | What the API did |
|---|---|---|
| edge-01 | same-day checkin/checkout | accepted |
| edge-03 | checkin `2027-02-29` (not a leap year) | accepted, silently changed to `2027-03-01` |
| edge-05 | checkout before checkin | accepted |
| edge-07 | dates `15/06/2026` (DD/MM/YYYY) | accepted, stored both dates as `0NaN-aN-aN` |
| edge-08 | month 13 (`2026-13-01`) | accepted, stored both dates as `0NaN-aN-aN` |
| edge-09 | datetime `2026-06-15T10:00:00Z` | accepted, cut to `2026-06-15` |
| edge-14 | firstname `"   "` | accepted, stored as empty string `""` |
| edge-17 | totalprice `0` | accepted |
| edge-18 | totalprice `-100` | accepted |
| edge-24 | totalprice `"500"` (string) | accepted, converted to number `500` |
| edge-25 | depositpaid `"yes"` (string) | accepted, converted to `true` |

**B. Server errors instead of a 4xx client error (3 cases, HTTP 500 "Internal Server Error")**

edge-21 (missing lastname), edge-22 (firstname `null`), edge-23 (missing bookingdates).
A missing or null field should give a 400 with a message, not crash the server.

**C. A valid booking was changed silently (1 case)**

edge-20: totalprice `199.99` came back as `199`. The API drops the cents without an error.

**What worked:** all 11 valid cases were accepted. Unicode, apostrophes, a 250-character name, emoji, SQL-like and HTML-like strings, a huge price and year 9999 came back unchanged, except for the decimal price in C.

The worst finding is `0NaN-aN-aN`. The API reports success but stores a date that isn't a date, so the bad data only shows up later, when something reads it.

## Limitations

- **LLM output is non-deterministic.** Asking again gives different edge cases, so the file is stored in the repo. The bulk data is reproducible because of the seed; the edge cases are reproducible because they are committed.
- **`expectedValid` comes from my rules, so 25/25 is not independent proof.** It shows the validator implements my intent. The API check is the independent one, and those are judgement calls such as same-day stays being invalid and no maximum name length.
- **Shared practice server.** Other people use it, so requests are spaced 500 ms apart and everything created is deleted. Data can change or disappear at any time, and a failed cleanup can leave records behind (the scripts print leftover ids).
- Prices are only checked to be a number above 0, with no upper bound or currency precision rule.
