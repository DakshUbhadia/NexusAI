/**
 * mock-server.js — Local mock for Liveblocks and Vercel Blob
 * ─────────────────────────────────────────────────────────────
 * Run with: node k6-tests/mock-server.js
 *
 * Handles:
 *   POST /mock/liveblocks/identify  → returns a fake Liveblocks JWT
 *   GET  /mock/blob/:path           → returns stored canvas JSON
 *   PUT  /mock/blob/:path           → stores canvas JSON in memory
 *
 * Zero npm dependencies — uses only Node.js built-ins.
 */
'use strict'
const http = require('http')
const PORT = 4001
// In-memory blob store: pathname → JSON string
const blobStore = new Map()
// A fixed fake Liveblocks-format token so identifyUser never calls the real API
const FAKE_LB_TOKEN = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiJtb2NrLXVzZXIiLCJpYXQiOjE2MDAwMDAwMDB9',
  'mock_signature_load_test_only',
].join('.')
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}
function json(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname
  // ── POST /mock/liveblocks/identify ────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/mock/liveblocks/identify') {
    // Simulates what Liveblocks identifyUser returns
    json(res, 200, { token: FAKE_LB_TOKEN })
    return
  }
  // ── GET /mock/blob/* ──────────────────────────────────────────────────────
  if (req.method === 'GET' && pathname.startsWith('/mock/blob/')) {
    const blobPath = pathname.slice('/mock/blob/'.length)
    const stored = blobStore.get(blobPath)
    if (!stored) {
      // Return empty canvas — same shape as what the real route returns on null
      json(res, 200, { data: { canvas: null } })
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(stored)
    return
  }
  // ── PUT /mock/blob/* ──────────────────────────────────────────────────────
  if (req.method === 'PUT' && pathname.startsWith('/mock/blob/')) {
    const blobPath = pathname.slice('/mock/blob/'.length)
    const body = await readBody(req)
    blobStore.set(blobPath, body)
    const mockBlobUrl = `http://localhost:${PORT}/mock/blob/${blobPath}`
    json(res, 200, {
      url: mockBlobUrl,
      pathname: blobPath,
      contentType: 'application/json',
    })
    return
  }
  // ── Health check ──────────────────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/health') {
    json(res, 200, { status: 'ok', blobEntries: blobStore.size })
    return
  }
  json(res, 404, { error: 'Not found' })
})
server.listen(PORT, () => {
  console.log(`\n🧪 Mock server running at http://localhost:${PORT}`)
  console.log('   POST /mock/liveblocks/identify  → fake Liveblocks token')
  console.log('   GET  /mock/blob/:path           → in-memory blob read')
  console.log('   PUT  /mock/blob/:path           → in-memory blob write')
  console.log('   GET  /health                    → status\n')
})
process.on('SIGINT', () => {
  console.log('\n🛑 Mock server shutting down.')
  server.close()
  process.exit(0)
})