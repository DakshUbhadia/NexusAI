/**
 * k6-tests/04_full_user_journey.js
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT TESTS
 *   A realistic end-to-end user session:
 *     1. GET  /api/projects          — load editor home
 *     2. POST /api/liveblocks-auth   — enter a project room
 *     3. GET  /api/projects/:id/canvas — load saved canvas
 *     4. PUT  /api/projects/:id/canvas — autosave (runs 3× to simulate 9 s)
 *     5. GET  /api/projects          — return to home
 *
 * WHY THIS IS THE MOST IMPORTANT TEST
 *   This is the only test that measures the REAL combined load on every
 *   subsystem simultaneously (Clerk, Postgres, Vercel Blob, Liveblocks).
 *   Run this to find the TRUE concurrent user capacity.
 *
 * LAPTOP-SAFE RAMP PROFILE
 *   Capped at 25 VUs.  Each VU = one complete user session running in a loop.
 *   The 3–6 s sleep between steps means actual RPS stays low per VU.
 */

import http from 'k6/http'
import { sleep, check, group } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'
import { BASE_URL, authHeaders, PROJECT_ID, ROOM_ID, THRESHOLDS } from './config.js'

// ─── Custom metrics ───────────────────────────────────────────────────────────
const sessionDuration = new Trend('full_session_duration_ms', true)
const stepSuccess = new Rate('step_success_rate')
const totalErrors = new Counter('journey_errors_total')

// ─── Minimal canvas payload ───────────────────────────────────────────────────
const CANVAS_PAYLOAD = JSON.stringify({
  canvas: {
    nodes: [
      {
        id: 'k6-journey-node',
        type: 'canvasNode',
        position: { x: 200, y: 200 },
        data: {
          label: 'Load Test',
          shape: 'rectangle',
          color: 'violet',
          size: { width: 160, height: 80 },
        },
      },
    ],
    edges: [],
  },
})

export const options = {
  stages: [
    { duration: '10s', target: 5  },  // quick warm-up
    { duration: '30s', target: 25 },  // stress peak
    { duration: '10s', target: 0  },  // cool-down
  ],
  thresholds: {
    ...THRESHOLDS,
    step_success_rate: ['rate>0.92'],   // 92 % of all individual steps must pass
    full_session_duration_ms: ['p(95)<15000'], // full session under 15 s at p95
  },
}

// ─── Main VU function ─────────────────────────────────────────────────────────
export default function () {
  const headers = authHeaders()
  const sessionStart = Date.now()

  // ── Step 1: Load editor home ──────────────────────────────────────────────
  let ok
  group('1. List projects (home)', () => {
    const res = http.get(`${BASE_URL}/api/projects`, { headers })
    ok = check(res, {
      '[home] status 200': (r) => r.status === 200,
      '[home] has data array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).data) } catch { return false }
      },
    })
    stepSuccess.add(ok)
    if (!ok) totalErrors.add(1)
  })

  sleep(2)

  // ── Step 2: Authenticate into a project room ──────────────────────────────
  group('2. Liveblocks auth (enter room)', () => {
    const res = http.post(
      `${BASE_URL}/api/liveblocks-auth`,
      JSON.stringify({ roomId: ROOM_ID }),
      { headers },
    )
    ok = check(res, {
      '[lb-auth] status 200': (r) => r.status === 200,
    })
    stepSuccess.add(ok)
    if (!ok) totalErrors.add(1)
  })

  sleep(1)

  // ── Step 3: Load saved canvas ─────────────────────────────────────────────
  group('3. Load canvas', () => {
    const res = http.get(`${BASE_URL}/api/projects/${PROJECT_ID}/canvas`, { headers })
    ok = check(res, {
      '[canvas-get] status 200': (r) => r.status === 200,
    })
    stepSuccess.add(ok)
    if (!ok) totalErrors.add(1)
  })

  sleep(1)

  // ── Step 4: Autosave canvas (3 × to simulate 9 s of editing) ─────────────
  for (let i = 0; i < 3; i++) {
    group(`4.${i + 1}. Autosave canvas`, () => {
      const res = http.put(
        `${BASE_URL}/api/projects/${PROJECT_ID}/canvas`,
        CANVAS_PAYLOAD,
        { headers },
      )
      ok = check(res, {
        '[canvas-put] status 200': (r) => r.status === 200,
      })
      stepSuccess.add(ok)
      if (!ok) totalErrors.add(1)
    })
    sleep(3) // autosave fires every ~3 s
  }

  // ── Step 5: Return to home ────────────────────────────────────────────────
  group('5. Return to home', () => {
    const res = http.get(`${BASE_URL}/api/projects`, { headers })
    ok = check(res, {
      '[home-return] status 200': (r) => r.status === 200,
    })
    stepSuccess.add(ok)
    if (!ok) totalErrors.add(1)
  })

  // Record total session time
  sessionDuration.add(Date.now() - sessionStart)

  sleep(2) // think time before next loop
}
