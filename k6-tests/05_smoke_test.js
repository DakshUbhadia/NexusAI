/**
 * k6-tests/05_smoke_test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT TESTS
 *   A single-VU sanity check across all endpoints.
 *   Run this FIRST to verify your SESSION_TOKEN and PROJECT_ID are correct
 *   before running the full stress tests.
 *
 * HOW TO RUN
 *   k6 run -e SESSION_TOKEN="eyJ..." -e PROJECT_ID="abc123" k6-tests/05_smoke_test.js
 *
 * EXPECTED OUTPUT
 *   All checks should show ✓ (green).
 *   If any show ✗ (red), fix your config before running heavier tests.
 */

import http from 'k6/http'
import { check, group } from 'k6'
import { BASE_URL, authHeaders, PROJECT_ID, ROOM_ID } from './config.js'

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    // Smoke test must pass 100 % — zero tolerance
    checks: ['rate==1.0'],
  },
}

export default function () {
  const headers = authHeaders()

  console.log(`\n🔍 Smoke-testing NexusAI at ${BASE_URL}`)
  console.log(`   PROJECT_ID: ${PROJECT_ID}`)
  console.log(`   ROOM_ID:    ${ROOM_ID}\n`)

  // ── 1. Projects list ──────────────────────────────────────────────────────
  group('GET /api/projects', () => {
    const res = http.get(`${BASE_URL}/api/projects`, { headers })
    check(res, {
      'status is 200 (not 401 — token is valid)': (r) => r.status === 200,
      'returns a data array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).data) } catch { return false }
      },
    })
    if (res.status !== 200) {
      console.error(`❌ GET /api/projects → ${res.status}: ${res.body.substring(0, 400)}`)
    }
  })

  // ── 2. Canvas load ────────────────────────────────────────────────────────
  group('GET /api/projects/:id/canvas', () => {
    const res = http.get(`${BASE_URL}/api/projects/${PROJECT_ID}/canvas`, { headers })
    check(res, {
      'status is 200 (not 404 — project ID is valid)': (r) => r.status === 200,
      'body has data key': (r) => {
        try { return 'data' in JSON.parse(r.body) } catch { return false }
      },
    })
    if (res.status !== 200) {
      console.error(`❌ GET canvas → ${res.status}: ${res.body.substring(0, 400)}`)
    }
  })

  // ── 3. Liveblocks auth ────────────────────────────────────────────────────
  group('POST /api/liveblocks-auth', () => {
    const res = http.post(
      `${BASE_URL}/api/liveblocks-auth`,
      JSON.stringify({ roomId: ROOM_ID }),
      { headers },
    )
    check(res, {
      'status is 200': (r) => r.status === 200,
      'response has Liveblocks token': (r) => {
        try { return typeof JSON.parse(r.body).token === 'string' } catch { return false }
      },
    })
    if (res.status !== 200) {
      console.error(`❌ liveblocks-auth → ${res.status}: ${res.body.substring(0, 400)}`)
    }
  })

  // ── 4. Canvas save (minimal payload) ─────────────────────────────────────
  group('PUT /api/projects/:id/canvas', () => {
    const payload = JSON.stringify({
      canvas: {
        nodes: [{
          id: 'smoke-node',
          type: 'canvasNode',
          position: { x: 0, y: 0 },
          data: { label: 'smoke', shape: 'rectangle', color: 'cyan', size: { width: 100, height: 50 } },
        }],
        edges: [],
      },
    })
    const res = http.put(`${BASE_URL}/api/projects/${PROJECT_ID}/canvas`, payload, { headers })
    check(res, {
      'status is 200': (r) => r.status === 200,
    })
    if (res.status !== 200) {
      console.error(`❌ PUT canvas → ${res.status}: ${res.body.substring(0, 400)}`)
    }
  })

  console.log('\n✅ Smoke test complete. Check the output above for any red ✗ marks.')
}
