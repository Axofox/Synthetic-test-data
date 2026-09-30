# Notes for Claude

## Who this project is for
A QA engineer building a portfolio project to explain in job interviews. They must be able to explain every line, so no magic.

## How to explain things
- Plain, non-technical language first. Use everyday analogies (the "hotel" analogy works well: restful-booker = a practice hotel, endpoints = counters, our project = a mystery shopper who cleans up afterwards).
- Explain any jargon the moment it appears (API, JSON, token, endpoint, CI...).
- One file or topic at a time; short answers; ask before moving on.
- End explanations with a one-sentence "interview answer" they can reuse.
- Be honest about what was NOT tested or verified. Never invent results.
- Be encouraging. No question is too basic.

## What they already understand (as of 2026-09-30)
- restful-booker is Mark Winteringham's public practice API (hosted by Ministry of Testing) with deliberate bugs; it resets every 10 minutes. They have seen the home page and the API docs (/apidoc/index.html).
- An API has no clickable website; you send requests and get answers. Create / Read / Update / Delete.
- Our project only used Ping, Auth, CreateBooking and DeleteBooking. It never read or updated bookings.
- Generation and local validation run without the API.
- The findings (invalid bookings accepted, dates stored as "0NaN-aN-aN", 500 errors on missing fields, 199.99 -> 199).
- Security: only basic injection probes (SQL-like, HTML-like names), not a real security test. Privacy: covered by design (all data synthetic, everything deleted).
- The cloud sandbox cannot reach restful-booker; the pipeline runs in GitHub Actions instead.

## Code walkthrough progress
- Done: project map, `src/schema.ts` (two layers: Zod structure + business rules; the Feb-29 date trick).
- Next: `src/generate.ts` (the "cook"), then `src/api.ts` side by side with the API docs, then `load.ts`, `validate-edge-cases.ts`, `run-edge-cases.ts`, the workflow file.

## Ideas they may want later
- Tests for GetBooking (does it return what we created?) and UpdateBooking (are new dates checked?).
- Safe auth checks: delete without a token; read without logging in.
- README note that the site has deliberate bugs.
