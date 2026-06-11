import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../app/generated/prisma/client'

declare global {
  
  var __prismaClient: PrismaClient | undefined
}

const rawDbUrl = process.env.DATABASE_URL || ''

if (!rawDbUrl) {
  throw new Error('DATABASE_URL is required to initialize PrismaClient')
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
  const adapter = new PrismaPg({ connectionString })

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

const prisma: PrismaClient = (globalThis.__prismaClient !== undefined && process.env.NODE_ENV === 'development')
  ? (hasRequiredDelegates(globalThis.__prismaClient)
    ? globalThis.__prismaClient
    : instantiate())
  : instantiate()

if (process.env.NODE_ENV === 'development') globalThis.__prismaClient = prisma

export default prisma
