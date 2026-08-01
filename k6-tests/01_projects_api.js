/**
 * k6-tests/01_projects_api.js
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT TESTS
 *   GET  /api/projects  — list all projects for the authenticated user
 *   POST /api/projects  — create a new project
 *
 * WHY THIS IS CRITICAL
 *   Every page-load of the editor home hits GET /api/projects.
 *   This endpoint does a Prisma DB query (Postgres) + Clerk JWT verification
 *   on every request.  Under load it is the first thing to saturate the DB
 *   connection pool.
 *
 * LAPTOP-SAFE RAMP PROFILE
 *   Stage 1  (30 s)  ramp from  0 → 10  VUs   — warm-up
 *   Stage 2  (60 s)  hold at    10       VUs   — baseline
 *   Stage 3  (30 s)  ramp from 10 → 30  VUs   — moderate load
 *   Stage 4  (60 s)  hold at    30       VUs   — sustained moderate
 *   Stage 5  (30 s)  ramp from 30 → 50  VUs   — stress point
 *   Stage 6  (30 s)  hold at    50       VUs   — observe breaking point
 *   Stage 7  (30 s)  ramp down  50 →  0  VUs   — cool-down
 *
 * Total: ~4 min 30 s, max 50 VUs (safe for a laptop running Next.js locally).
 */

import http from 'k6/http'
import { sleep, check, group } from 'k6'
import { Trend, Counter } from 'k6/metrics'
import { BASE_URL, authHeaders, PROJECT_ID, THRESHOLDS } from './config.js'

// ─── Custom metrics ───────────────────────────────────────────────────────────
const listDuration = new Trend('projects_list_duration', true)
const createDuration = new Trend('projects_create_duration', true)
const errorsTotal = new Counter('projects_errors_total')

// ─── Stage config ────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // warm-up
    { duration: '60s', target: 10 },  // baseline
    { duration: '30s', target: 30 },  // ramp up
    { duration: '60s', target: 30 },  // sustained
    { duration: '30s', target: 50 },  // stress
    { duration: '30s', target: 50 },  // observe
    { duration: '30s', target: 0  },  // cool-down
  ],
  thresholds: {
    ...THRESHOLDS,
    projects_list_duration: ['p(95)<1500'],
    projects_create_duration: ['p(95)<2000'],
  },
}

// ─── Main VU function ─────────────────────────────────────────────────────────
export default function () {
  const headers = authHeaders()

  // 1. LIST projects (read-heavy, most common path)
  group('GET /api/projects', () => {
    const res = http.get(`${BASE_URL}/api/projects`, { headers })
    listDuration.add(res.timings.duration)

    const ok = check(res, {
      'status is 200': (r) => r.status === 200,
      'response has data': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body).data)
        } catch {
          return false
        }
      },
    })
    if (!ok) errorsTotal.add(1)
  })

  sleep(1) // think-time between actions

  // 2. CREATE a project (write path — hits Postgres INSERT)
  //    Only 20 % of VUs create a project to avoid polluting the DB.
  if (Math.random() < 0.2) {
    group('POST /api/projects', () => {
      const payload = JSON.stringify({ name: `k6-test-${Date.now()}` })
      const res = http.post(`${BASE_URL}/api/projects`, payload, { headers })
      createDuration.add(res.timings.duration)

      const ok = check(res, {
        'status is 201': (r) => r.status === 201,
        'created project has id': (r) => {
          try {
            return typeof JSON.parse(r.body).data.id === 'string'
          } catch {
            return false
          }
        },
      })
      if (!ok) errorsTotal.add(1)
    })
  }

  sleep(1)
}
