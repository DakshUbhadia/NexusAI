import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../app/generated/prisma/client'

declare global {
  
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
  const connectionUrl = url.replace(/^prisma\+/, '')

  try {
    const parsedUrl = new URL(connectionUrl)
    const sslMode = parsedUrl.searchParams.get('sslmode')

    if (sslMode === 'prefer' || sslMode === 'require' || sslMode === 'verify-ca') {
      parsedUrl.searchParams.set('sslmode', 'verify-full')
    }

    return parsedUrl.toString()
  } catch {
    return connectionUrl
  }
}

const connectionString = normalizeConnectionString(rawDbUrl)

const instantiate = () => {
  const adapter = new PrismaPg({ 
    connectionString,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 5000,
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

if (globalThis.__prismaClient !== undefined && process.env.NODE_ENV === 'development') {
  if (!hasRequiredDelegates(globalThis.__prismaClient)) {
    try {
      void globalThis.__prismaClient.$disconnect()
    } catch {
      // ignore
    }
    globalThis.__prismaClient = undefined
  }
}

const prisma: PrismaClient = (globalThis.__prismaClient !== undefined && process.env.NODE_ENV === 'development')
  ? globalThis.__prismaClient
  : instantiate()

if (process.env.NODE_ENV === 'development') globalThis.__prismaClient = prisma

export default prisma
