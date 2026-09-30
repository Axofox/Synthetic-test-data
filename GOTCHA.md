# Gotchas

Mistakes made on this project and the rule that prevents each one. Read this before starting work.
Format: what happened, why, fix, rule.

## 1. A firewall answer was reported as API bugs
- **What happened:** the first edge-case run reported 11 "API REJECTS VALID booking" findings.
- **Why:** the sandbox's network proxy blocked the API and answered `403`. The script treated the proxy's answer as the API's answer.
- **Fix:** deleted the results file; added a `GET /ping` check (`assertApiReachable` in `src/api.ts`) that stops before sending anything.
- **Rule:** confirm the system under test was actually reached before trusting any result.

## 2. A length was estimated, not measured
- **What happened:** edge case 12 was described as a 260-character name. It is 250.
- **Fix:** measured it with code and corrected the text.
- **Rule:** measure lengths and counts; never estimate them.

## 3. A check that didn't really run
- **What happened:** the first "is the output identical twice?" check copied the file to the wrong folder, so the comparison failed with "No such file".
- **Fix:** redid it with `sha256sum` on three runs (identical).
- **Rule:** read the output of a verification step; an error means nothing was verified.

## 4. A count reported from memory
- **What happened:** said 9 accepted edge cases came back altered. The real number was 8.
- **Fix:** recounted from the CI log and corrected it.
- **Rule:** take every number from real output, never from memory.

## 5. Truncated logs hid the evidence
- **What happened:** CI run #1 cut each API response to 90 characters, so it said "data altered" without saying how.
- **Fix:** `run-edge-cases.ts` now prints each changed field, e.g. `totalprice: 199.99 -> 199`.
- **Rule:** a finding must show its evidence (sent vs. received), not just a label.

## 6. Every push re-ran the pipeline against the shared server
- **Why:** the workflow runs on every push, and a run posts 225 bookings.
- **Rule:** commits that only change docs get `[skip ci]` in the message.

## Known quirks (not our mistakes, but easy to trip over)
- restful-booker answers a successful DELETE with `201 Created`, not `200` or `204`.
- DELETE needs the token as a cookie (`Cookie: token=...`), not an `Authorization` header.
- Without `Accept: application/json` the API answers in plain text.
- `POST /auth` with wrong credentials still answers `200`, with `{ "reason": "Bad credentials" }`.
- `faker.date.future()` depends on today's date and breaks reproducibility; use fixed `from`/`to` dates.
- The cloud sandbox cannot reach restful-booker or the GitHub artifact storage; run API steps in GitHub Actions.
