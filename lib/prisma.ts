import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'

// ---------------------------------------------------------------------------
// Prisma v7 requires a driver adapter for the new `prisma-client` generator.
// We use @prisma/adapter-pg which wraps the `pg` Pool.
//
// Connection to pooled.db.prisma.io (Prisma Postgres's managed pooler):
//   - The pooler runs in transaction mode, so each query may land on a
//     different backend connection.
//   - We set max: 1 so the client-side pg pool stays out of the way and lets
//     the server-side pooler do all the multiplexing.  This also eliminates
//     the "Server has closed the connection" error that occurred when multiple
//     idle pg sockets were silently dropped by the server.
//   - idleTimeoutMillis: 0  → pg never closes the socket on its own side,
//     so we don't end up with stale pool entries the server already closed.
//   - connectionTimeoutMillis: 20_000 → enough headroom for the pooler cold-
//     start (~8 s on a free plan).
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined
}

const rawDbUrl = process.env.DATABASE_URL
if (!rawDbUrl) {
  throw new Error(
    'DATABASE_URL environment variable is required but was not set. ' +
      'Check your .env.local or deployment environment configuration.'
  )
}

function normalizeConnectionString(url: string): string {
  // Strip the prisma+ protocol prefix if present (used by Prisma Accelerate).
  let normalized = url.replace(/^prisma\+/, '')

  // pg-connection-string v3 deprecates sslmode=require in favour of
  // sslmode=verify-full (same security, no warning).
  normalized = normalized.replace(/([?&])sslmode=require(&|$)/, '$1sslmode=verify-full$2')

  return normalized
}

const connectionString = normalizeConnectionString(rawDbUrl)

const instantiate = (): PrismaClient => {
  const adapter = new PrismaPg({
    connectionString,
    // One connection per process — the server-side pooler handles multiplexing.
    max: 1,
    // Never let the client-side pool close idle sockets; the pooler will
    // signal EOF when it wants to reclaim a backend, and the retry logic in
    // editor-projects.ts recovers from that transparently.
    idleTimeoutMillis: 0,
    // 20 s is enough for a pooler cold-start on the free Prisma Postgres plan.
    connectionTimeoutMillis: 20_000,
  })

  return new PrismaClient({ adapter })
}

function hasRequiredDelegates(client: PrismaClient): boolean {
  const candidate = client as unknown as {
    project?: { findMany?: unknown }
    taskRun?: { findMany?: unknown }
    projectSpec?: { findMany?: unknown }
  }

  return (
    typeof candidate.project?.findMany === 'function' &&
    typeof candidate.taskRun?.findMany === 'function' &&
    typeof candidate.projectSpec?.findMany === 'function'
  )
}

// In development, reuse the singleton across hot-reloads so we don't
// exhaust the pooler's connection limit on every file save.
if (globalThis.__prismaClient !== undefined && process.env.NODE_ENV === 'development') {
  if (!hasRequiredDelegates(globalThis.__prismaClient)) {
    try {
      void globalThis.__prismaClient.$disconnect()
    } catch {
      // ignore – best-effort cleanup
    }
    globalThis.__prismaClient = undefined
  }
}

const prisma: PrismaClient =
  globalThis.__prismaClient !== undefined && process.env.NODE_ENV === 'development'
    ? globalThis.__prismaClient
    : instantiate()

if (process.env.NODE_ENV === 'development') globalThis.__prismaClient = prisma

export default prisma
