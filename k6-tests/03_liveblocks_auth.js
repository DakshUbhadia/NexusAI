/**
 * k6-tests/03_liveblocks_auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT TESTS
 *   POST /api/liveblocks-auth  — issue a Liveblocks room token
 *
 * WHY THIS IS CRITICAL
 *   This endpoint is called:
 *     • Once per user per page load (when entering a project room)
 *     • Again every ~30 min when the Liveblocks token expires
 *   It chains:
 *     1. Clerk  currentUser()  —  external JWT verification
 *     2. Postgres  hasProjectAccess  —  DB query
 *     3. Liveblocks  ensureRoomAccess  —  external Liveblocks API call
 *     4. Liveblocks  identifyUser  —  second external Liveblocks API call
 *   Two external service calls per request make it the highest-latency
 *   endpoint and the most likely to become the system bottleneck.
 *
 * LAPTOP-SAFE RAMP PROFILE
 *   Capped at 30 VUs.  Each VU represents one user opening a room tab.
 */

import http from 'k6/http'
import { sleep, check, group } from 'k6'
import { Trend, Counter } from 'k6/metrics'
import { BASE_URL, authHeaders, ROOM_ID, THRESHOLDS } from './config.js'

const authDuration = new Trend('liveblocks_auth_duration', true)
const errorsTotal = new Counter('liveblocks_auth_errors_total')

export const options = {
  stages: [
    { duration: '30s', target: 5  },
    { duration: '60s', target: 5  },
    { duration: '30s', target: 15 },
    { duration: '60s', target: 15 },
    { duration: '30s', target: 30 },
    { duration: '60s', target: 30 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    ...THRESHOLDS,
    // Liveblocks auth involves two external API calls; allow up to 4 s at p95
    liveblocks_auth_duration: ['p(95)<4000'],
  },
}

export default function () {
  const headers = authHeaders()

  group('POST /api/liveblocks-auth', () => {
    const payload = JSON.stringify({ roomId: ROOM_ID })
    const res = http.post(`${BASE_URL}/api/liveblocks-auth`, payload, { headers })
    authDuration.add(res.timings.duration)

    const ok = check(res, {
      'status is 200': (r) => r.status === 200,
      'response has token': (r) => {
        try {
          const body = JSON.parse(r.body)
          // Liveblocks returns { token: "..." }
          return typeof body.token === 'string' && body.token.length > 0
        } catch {
          return false
        }
      },
    })

    if (!ok) {
      errorsTotal.add(1)
      console.warn(`liveblocks-auth failed: ${res.status} — ${res.body.substring(0, 300)}`)
    }
  })

  // Simulate think time: real users don't re-auth every second
  sleep(Math.random() * 3 + 2)
}
