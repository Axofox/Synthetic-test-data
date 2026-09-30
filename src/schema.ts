import { z } from "zod";

// ---------- Layer 1: structure (types and presence) ----------

// strictObject refuses unknown fields (e.g. a licence plate) instead of silently dropping them.
// Reviewer decision: an unknown field is an error, so nobody is encouraged to probe the API.
export const BookingSchema = z.strictObject({
  firstname: z.string(),
  lastname: z.string(),
  totalprice: z.number(),
  depositpaid: z.boolean(),
  bookingdates: z.strictObject({
    checkin: z.string(),
    checkout: z.string(),
  }),
  // The API treats this field as optional, so we do too.
  additionalneeds: z.string().optional(),
});

export type Booking = z.infer<typeof BookingSchema>;

// ---------- Layer 2: business invariants ----------
// Each function takes a structurally valid Booking and returns a list of
// problems. An empty list means the rule holds.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// True only for real calendar dates in YYYY-MM-DD format.
// The regex checks the shape; the Date round-trip rejects things like 2027-02-30
// (JavaScript would roll that over to March 2, so the string would not match).
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

export function checkNamesNotEmpty(b: Booking): string[] {
  const problems: string[] = [];
  if (b.firstname.trim() === "") problems.push("firstname is empty or only whitespace");
  if (b.lastname.trim() === "") problems.push("lastname is empty or only whitespace");
  return problems;
}

export function checkPricePositive(b: Booking): string[] {
  return b.totalprice > 0 ? [] : [`totalprice must be > 0 (got ${b.totalprice})`];
}

export function checkDatesAreIso(b: Booking): string[] {
  const problems: string[] = [];
  const { checkin, checkout } = b.bookingdates;
  if (!isValidIsoDate(checkin)) problems.push(`checkin is not a valid YYYY-MM-DD date (got "${checkin}")`);
  if (!isValidIsoDate(checkout)) problems.push(`checkout is not a valid YYYY-MM-DD date (got "${checkout}")`);
  return problems;
}

// Strictly after: a same-day booking (0 nights) is treated as invalid.
// Only meaningful when both dates are valid, so it skips otherwise
// (the date-format rule already reports that problem).
export function checkCheckoutAfterCheckin(b: Booking): string[] {
  const { checkin, checkout } = b.bookingdates;
  if (!isValidIsoDate(checkin) || !isValidIsoDate(checkout)) return [];
  // YYYY-MM-DD strings sort the same alphabetically as chronologically.
  return checkout > checkin ? [] : [`checkout (${checkout}) must be after checkin (${checkin})`];
}

export const invariants = [
  checkNamesNotEmpty,
  checkPricePositive,
  checkDatesAreIso,
  checkCheckoutAfterCheckin,
];

// ---------- Both layers together ----------

export type ValidationResult =
  | { valid: true; issues: [] }
  | { valid: false; issues: string[] };

export function validateBooking(input: unknown): ValidationResult {
  const parsed = BookingSchema.safeParse(input);
  if (!parsed.success) {
    // Structural failure: report every Zod issue with its field path.
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    return { valid: false, issues };
  }
  const issues = invariants.flatMap((rule) => rule(parsed.data));
  return issues.length === 0 ? { valid: true, issues: [] } : { valid: false, issues };
}
