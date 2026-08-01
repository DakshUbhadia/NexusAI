/**
 * k6-tests/02_canvas_api.js
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT TESTS
 *   GET /api/projects/:projectId/canvas  — load saved canvas (DB + Vercel Blob)
 *   PUT /api/projects/:projectId/canvas  — save canvas (DB write + Blob upload)
 *
 * WHY THIS IS CRITICAL
 *   Canvas autosave fires every ~3 s while a user is in a project room.
 *   Each PUT call:
 *     1. Verifies Clerk session (Clerk API)
 *     2. Queries Postgres for project access
 *     3. Uploads JSON to Vercel Blob (external network I/O)
 *     4. Updates Postgres with the new blob URL
 *   This is the most I/O-intensive local endpoint.
 *
 * LAPTOP-SAFE RAMP PROFILE
 *   Capped at 20 VUs — each VU represents one open editor tab autosaving.
 *   20 concurrent saves is a realistic upper bound for a small team.
 */

import http from 'k6/http'
import { sleep, check, group } from 'k6'
import { Trend, Counter } from 'k6/metrics'
import { BASE_URL, authHeaders, PROJECT_ID, THRESHOLDS } from './config.js'

const getCanvasDuration = new Trend('canvas_get_duration', true)
const putCanvasDuration = new Trend('canvas_put_duration', true)
const errorsTotal = new Counter('canvas_errors_total')

// A minimal valid canvas payload matching canvasFlowSchema
const CANVAS_PAYLOAD = JSON.stringify({
  canvas: {
    nodes: [
      {
        id: 'k6-node-1',
        type: 'canvasNode',
        position: { x: 100, y: 100 },
        data: {
          label: 'k6 Test Node',
          shape: 'rectangle',
          color: 'cyan',
          size: { width: 160, height: 80 },
        },
      },
    ],
    edges: [],
  },
})

export const options = {
  stages: [
    { duration: '30s', target: 5  },  // warm-up
    { duration: '60s', target: 5  },  // baseline
    { duration: '30s', target: 15 },  // ramp up
    { duration: '60s', target: 15 },  // sustained
    { duration: '30s', target: 20 },  // stress
    { duration: '60s', target: 20 },  // observe
    { duration: '30s', target: 0  },  // cool-down
  ],
  thresholds: {
    ...THRESHOLDS,
    canvas_get_duration: ['p(95)<2000'],
    // Blob uploads are slower — allow up to 5 s at p95
    canvas_put_duration: ['p(95)<5000'],
  },
}

export default function () {
  const headers = authHeaders()
  const url = `${BASE_URL}/api/projects/${PROJECT_ID}/canvas`

  // 1. GET canvas (simulates room load)
  group('GET canvas', () => {
    const res = http.get(url, { headers })
    getCanvasDuration.add(res.timings.duration)

    const ok = check(res, {
      'status is 200': (r) => r.status === 200,
      'body has data key': (r) => {
        try {
          return 'data' in JSON.parse(r.body)
        } catch {
          return false
        }
      },
    })
    if (!ok) errorsTotal.add(1)
  })

  sleep(3) // simulate autosave interval (3 s)

  // 2. PUT canvas (simulates autosave — every VU does this)
  group('PUT canvas (autosave)', () => {
    const res = http.put(url, CANVAS_PAYLOAD, { headers })
    putCanvasDuration.add(res.timings.duration)

    const ok = check(res, {
      'status is 200': (r) => r.status === 200,
    })
    if (!ok) {
      errorsTotal.add(1)
      console.warn(`PUT canvas failed: ${res.status} – ${res.body.substring(0, 200)}`)
    }
  })

  sleep(1)
}
