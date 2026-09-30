# Rules for the AI working on this project

## Before starting any work
- Read `GOTCHA.md` and do not repeat any mistake listed there.

## How to explain
- Plain, non-technical language first, with everyday analogies. Explain jargon the moment it appears.
- One file or topic at a time. Short answers. Ask before moving on.
- End an explanation with a one-sentence answer that could be used in a job interview.
- Every line of code must be explainable: no magic, no unexplained tricks.

## How to work
- Never invent results. Run the code and report the real output.
- Say clearly what was NOT tested or verified.
- Measure, don't estimate: count lengths, rows and findings from real output.
- Before trusting an API result, confirm the API itself was reached (a proxy or firewall answer is not an API answer).
- Be gentle with the shared practice server: delays between requests, always clean up, and add `[skip ci]` to commits that only change docs.
- Never put personal information in the repository.
- AI-generated test cases must be reviewed blind by a human, using `REVIEW-TEMPLATE.md`, before they are trusted.

## When a mistake happens
- Add an entry to `GOTCHA.md`: what went wrong, why, how it was fixed, and the rule that prevents it.
