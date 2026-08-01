/**
 * k6-tests/07_mock_load.js
 * ─────────────────────────────────────────────────────────────────────────────
 * MOCK-BACKED LOAD TEST — measures true Next.js + Prisma throughput
 *
 * What this tests (real):
 *   ✅ Next.js serverless routing + middleware
 *   ✅ Prisma ORM query performance (real DB — your Prisma Postgres)
 *   ✅ Request parsing + Zod schema validation
 *   ✅ Project access checks (real DB lookups)
 *   ✅ Next.js concurrent request handling
 *
 * What is mocked (returns instantly, no rate limits):
 *   🧪 Clerk JWT verification  → X-Mock-User-Id header
 *   🧪 Liveblocks identifyUser → local mock server at :4001
 *   🧪 Vercel Blob get/put     → in-memory store at :4001
 *
 * PREREQUISITES
 *   1. Start mock server:   node k6-tests/mock-server.js
 *   2. Start Next.js:       npx dotenv -e .env.load-test -- npm run dev
 *   3. Run this test:       k6 run k6-tests/07_mock_load.js
 *
 * OPTIONAL OVERRIDES
 *   k6 run -e BASE_URL=http://localhost:3000 -e PROJECT_ID=xxx k6-tests/07_mock_load.js
 */

import http from 'k6/http'
import { sleep, check, group } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'

// ─── Environment ─────────────────────────────────────────────────────────────
const BASE_URL   = __ENV.BASE_URL    || 'http://localhost:3000'
const PROJECT_ID = __ENV.PROJECT_ID  || 'cmpm7s6ne0001w8u8q7oumjgm'
const MOCK_USER  = __ENV.MOCK_USER   || 'user_3FObPl3TuTVHOwSQBAih6h3BFcz'

// ─── Custom metrics ───────────────────────────────────────────────────────────
const listProjectsLatency   = new Trend('list_projects_ms',   true)
const canvasReadLatency     = new Trend('canvas_read_ms',     true)
const liveblocksAuthLatency = new Trend('liveblocks_auth_ms', true)
const canvasWriteLatency    = new Trend('canvas_write_ms',    true)
const errorRate             = new Rate('error_rate')
const successfulSaves       = new Counter('canvas_saves_ok')
const totalIterations       = new Counter('completed_journeys')

// ─── Shared headers (the heart of the mock system) ───────────────────────────
function headers(extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    // This header activates LOAD_TEST_MODE identity bypass in every route handler
    'X-Mock-User-Id': MOCK_USER,
    ...extraHeaders,
  }
}

// ─── Reusable canvas payload (matches Zod schema exactly) ────────────────────
function makeCanvasPayload(vu) {
  return JSON.stringify({
    canvas: {
      nodes: [
        {
          id: `mock-node-vu${vu}-${Date.now()}`,
          type: 'canvasNode',
          position: { x: vu * 20, y: 100 },
          data: {
            label: `Load Test VU-${vu}`,
            shape: 'rectangle',
            color: 'violet',
            size: { width: 160, height: 80 },
          },
        },
        {
          id: `mock-node-db-vu${vu}`,
          type: 'canvasNode',
          position: { x: vu * 20 + 200, y: 100 },
          data: {
            label: `Database VU-${vu}`,
            shape: 'cylinder',
            color: 'cyan',
            size: { width: 140, height: 80 },
          },
        },
      ],
      edges: [
        {
          id: `mock-edge-vu${vu}`,
          source: `mock-node-vu${vu}-${Date.now()}`,
          target: `mock-node-db-vu${vu}`,
          type: 'canvasEdge',
          animated: false,
          label: 'queries',
          data: { label: 'queries' },
        },
      ],
    },
  })
}

// ─── Load profile ─────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '60s', target: 50 },
    { duration: '120s', target: 100 },
    { duration: '120s', target: 200 },
    { duration: '120s', target: 500 },
    { duration: '60s', target: 250 },
    { duration: '60s', target: 0  },
  ],
  thresholds: {
    // The only real bottleneck now is Prisma — not third-party rate limits
    error_rate:            ['rate<0.01'],  // < 1% errors (very tight)
    list_projects_ms:      ['p(95)<500'],  // DB SELECT should be fast
    canvas_read_ms:        ['p(95)<800'],  // DB lookup + mock blob read
    liveblocks_auth_ms:    ['p(95)<300'],  // DB access check + mock token
    canvas_write_ms:       ['p(95)<1000'], // DB access check + mock blob write + DB update
    http_req_failed:       ['rate<0.01'],  // < 1% HTTP failures
  },
}

// ─── Main VU scenario: full 4-step user journey ───────────────────────────────
export default function () {
  const h = headers()

  // ── Step 1: List all projects (Clerk bypass + Prisma SELECT) ─────────────
  group('1. List Projects (Prisma read)', () => {
    const start = Date.now()
    const res = http.get(`${BASE_URL}/api/projects`, { headers: h, timeout: '30s' })
    listProjectsLatency.add(Date.now() - start)

    const ok = check(res, {
      '[list] status 200':    (r) => r.status === 200,
      '[list] has data array': (r) => {
        try { return Array.isArray(JSON.parse(r.body).data) } catch { return false }
      },
    })
    errorRate.add(!ok)
  })

  sleep(Math.random() * 0.5 + 0.2) // 0.2–0.7s think time

  // ── Step 2: Load canvas state (Prisma lookup + mock blob read) ────────────
  group('2. Load Canvas (Prisma + mock blob)', () => {
    const start = Date.now()
    const res = http.get(`${BASE_URL}/api/projects/${PROJECT_ID}/canvas`, {
      headers: h,
      timeout: '30s',
    })
    canvasReadLatency.add(Date.now() - start)

    const ok = check(res, {
      '[canvas-get] status 200':   (r) => r.status === 200,
      '[canvas-get] has data key': (r) => {
        try { return 'data' in JSON.parse(r.body) } catch { return false }
      },
    })
    errorRate.add(!ok)
  })

  sleep(Math.random() * 0.5 + 0.2)

  // ── Step 3: Authenticate room (Prisma access check + mock Liveblocks) ─────
  group('3. Liveblocks Auth (Prisma access check + mock token)', () => {
    const start = Date.now()
    const res = http.post(
      `${BASE_URL}/api/liveblocks-auth`,
      JSON.stringify({ roomId: PROJECT_ID }),
      { headers: h, timeout: '30s' },
    )
    liveblocksAuthLatency.add(Date.now() - start)

    const ok = check(res, {
      '[lb-auth] status 200':  (r) => r.status === 200,
      '[lb-auth] has token':   (r) => {
        try { return typeof JSON.parse(r.body).token === 'string' } catch { return false }
      },
    })
    errorRate.add(!ok)
  })

  sleep(Math.random() * 0.5 + 0.2)

  // ── Step 4: Autosave canvas (Prisma access check + mock blob write + DB update)
  group('4. Autosave Canvas (Prisma write + mock blob write)', () => {
    const start = Date.now()
    const res = http.put(
      `${BASE_URL}/api/projects/${PROJECT_ID}/canvas`,
      makeCanvasPayload(__VU),
      { headers: h, timeout: '30s' },
    )
    canvasWriteLatency.add(Date.now() - start)

    const ok = check(res, {
      '[canvas-put] status 200': (r) => r.status === 200,
    })
    errorRate.add(!ok)

    if (ok) {
      successfulSaves.add(1)
    } else {
      const body = res.body ? res.body.substring(0, 300) : `timeout/network error: ${res.error}`
      console.error(`❌ PUT canvas VU${__VU} → ${res.status}: ${body}`)
    }
  })

  sleep(Math.random() * 0.5 + 0.2)
  totalIterations.add(1)
}
