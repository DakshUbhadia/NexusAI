/**
 * k6-tests/config.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared config for every NexusAI k6 test.
 *
 * HOW TO GET YOUR SESSION TOKEN
 * ──────────────────────────────
 * 1. Open Chrome and log in to the app (http://localhost:3000).
 * 2. Open DevTools → Application → Cookies → http://localhost:3000.
 * 3. Copy the value of the cookie named  __session  (or __clerk_db_jwt).
 *    It is a long JWT string starting with "eyJ…".
 * 4. Paste it as the value of SESSION_TOKEN below, OR export it as an
 *    environment variable and run k6 with:
 *       k6 run -e SESSION_TOKEN="eyJ..." script.js
 *
 * ⚠ The token expires after ~1 hour.  Re-copy it if tests start failing
 *   with 401 responses.
 */

// ─── Target ──────────────────────────────────────────────────────────────────
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// ─── Auth ────────────────────────────────────────────────────────────────────
// Paste your Clerk __session cookie value here, or pass via -e SESSION_TOKEN=…
export const SESSION_TOKEN = __ENV.SESSION_TOKEN || 'PASTE_YOUR_SESSION_TOKEN_HERE'

// A real project ID from your DB (used by canvas + liveblocks-auth tests).
// Get it from: http://localhost:3000/editor → open any project → copy the ID
// from the URL  /editor/<THIS_PART>
export const PROJECT_ID = __ENV.PROJECT_ID || 'PASTE_A_REAL_PROJECT_ID_HERE'

// The room ID is the same as the project ID for NexusAI.
export const ROOM_ID = __ENV.ROOM_ID || PROJECT_ID

// ─── Common request params ───────────────────────────────────────────────────
export function authHeaders() {
  return {
    'Content-Type': 'application/json',
    // Clerk reads the session from the cookie header.
    Cookie: `__session=${SESSION_TOKEN}`,
    // Also include Authorization header for better API recognition
    Authorization: `Bearer ${SESSION_TOKEN}`,
  }
}

// ─── Shared thresholds (imported per-test as needed) ─────────────────────────
export const THRESHOLDS = {
  // 95 % of all requests must finish in under 2 s
  http_req_duration: ['p(95)<2000'],
  // No more than 5 % of requests may fail
  http_req_failed: ['rate<0.05'],
}
