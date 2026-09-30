// Thin wrappers around the restful-booker endpoints, shared by load.ts and run-edge-cases.ts.

export const BASE_URL = process.env.BASE_URL ?? "https://restful-booker.herokuapp.com";

// Public credentials from the practice API's own documentation.
const USERNAME = "admin";
const PASSWORD = "password123";

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface ApiResponse {
  status: number; // HTTP status code, or 0 if the request never got a response
  body: unknown; // parsed JSON if the response was JSON, otherwise the raw text
  networkError?: string; // set only when status is 0
}

async function request(
  method: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResponse> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        // Without this, restful-booker replies in plain text instead of JSON.
        Accept: "application/json",
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(15_000), // never hang forever
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // Not JSON (e.g. "Created", "Bad Request"). Keep the raw text.
    }
    return { status: res.status, body };
  } catch (err) {
    // Network failure or timeout. Report it as data instead of throwing.
    const cause = err instanceof Error && err.cause instanceof Error ? ` (${err.cause.message})` : "";
    const message = (err instanceof Error ? err.message : String(err)) + cause;
    return { status: 0, body: null, networkError: message };
  }
}

// Preflight: confirm we are really talking to the API before doing anything.
// Without this, a proxy or firewall answering 403 would look like "the API rejected our booking"
// and produce false findings. A healthy restful-booker answers GET /ping with a 2xx.
export async function assertApiReachable(): Promise<void> {
  const res = await request("GET", "/ping");
  if (res.status < 200 || res.status >= 300) {
    const detail = res.networkError ?? JSON.stringify(res.body);
    throw new Error(`API not reachable: GET ${BASE_URL}/ping returned status ${res.status}: ${detail}`);
  }
}

// POST /booking. `payload` is `unknown` on purpose: edge cases send deliberately malformed data.
export const createBooking = (payload: unknown) => request("POST", "/booking", { body: payload });

// POST /auth returns { token } on success, or { reason: "Bad credentials" } with HTTP 200 on failure.
export async function authenticate(): Promise<string> {
  const res = await request("POST", "/auth", { body: { username: USERNAME, password: PASSWORD } });
  const token = (res.body as { token?: string } | null)?.token;
  if (!token) {
    throw new Error(`Authentication failed: HTTP ${res.status} ${res.networkError ?? JSON.stringify(res.body)}`);
  }
  return token;
}

// DELETE authenticates with a cookie, not an Authorization header.
export const deleteBooking = (id: number, token: string) =>
  request("DELETE", `/booking/${id}`, { headers: { Cookie: `token=${token}` } });
