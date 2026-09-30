# Review template: checking AI-generated test cases

Use this whenever an AI (or one person) has written test cases with expected answers, such as `data/edge-cases.json`.

**The idea:** a second person judges every case *without seeing the expected answers*. Where the two judgements differ, there is something to look at: a missing rule, an unclear requirement, or a plain mistake.

**Short version:** AI generates, a human reviews blind, code verifies.

---

## Roles

| Role | Job |
|---|---|
| **Author** | wrote the cases and the expected answers (often the AI) |
| **Reviewer** | judges each case independently; must not see the expected answers until step 4 |
| **Decider** | Product Owner (PO) or UX; settles the judgement calls the review uncovers |

---

## Step 1: Prepare (author)

- [ ] Write down the rules the cases are judged against, in plain language.
- [ ] Make a copy of the cases **without** the expected answers and reasons. The reasons often give the answer away.
- [ ] Group the cases into small rounds of about 5, by topic (dates, names, prices...).

## Step 2: Judge blind (reviewer)

For every case, before looking at anything else, answer:

| # | Input (what is being tested) | My verdict (OK / not OK / ask PO) | Why |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

"Ask PO" is a valid answer. It means the rules don't decide the case and someone has to make a business decision.

## Step 3: The checklist (reviewer, for every case)

- [ ] Does the case's description match what is really in the data? (Measure; don't trust the description.)
- [ ] Is only **one** thing unusual in the case? If two things are wrong, a rejection doesn't tell you which one caused it.
- [ ] Is everything else in the case normal?
- [ ] Is it about what the **system stores** or what the **user sees**? Keep these separate (e.g. dates are stored as `2026-06-15` but can be shown as `15.06.2026`).

## Step 4: Compare (both)

Reveal the expected answers and fill in:

| # | Reviewer | Author | Match? | Type of difference |
|---|---|---|---|---|
| 1 | | | ✅ / ❌ / 🤔 | |

Sort every difference into one type:

| Type | Meaning | What to do |
|---|---|---|
| **Mistake** | one side missed a fact | correct it; if the author was wrong, add it to `GOTCHA.md` |
| **Missing rule** | the rules don't cover the case | write the new rule down; add or change cases |
| **Judgement call** | both answers are defensible | send it to the PO/UX; record the decision |
| **Rule too strict** | the rule rejects something that should be allowed | discuss; change the rule if agreed |

## Step 5: Coverage (both)

Reading only checks what is *there*. This table finds what is *missing*.

| Rule | Cases that test it | Gap? |
|---|---|---|
| | | |

A rule with no cases means it is untested. Also check for **pairs**, e.g. a blank first name is tested, but is a blank last name?

## Step 6: Check a few by hand (reviewer)

- [ ] Pick 2 or 3 cases and send them to the real system yourself (e.g. with Postman).
- [ ] Compare what came back with what the pipeline reported.

This confirms the results without trusting the pipeline's own code.

## Step 7: Record the outcome

| Measure | Result |
|---|---|
| Cases reviewed | |
| Agreed | |
| Differed | |
| Sent to PO/UX | |
| Mistakes found | |
| New rules proposed | |
| Rules found too strict | |

- [ ] Update the rules, cases and docs.
- [ ] Add every mistake to `GOTCHA.md`.
- [ ] Note the date and who reviewed.

---

## Tips

- Keep rounds small. Fatigue makes reviewers agree with everything.
- Ask the reviewer *why*, not only *what*. The reasons are where the gaps show up.
- A difference is not a failure of either person. It is the review doing its job.
