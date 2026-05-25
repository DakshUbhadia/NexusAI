import { PrismaClient } from '../app/generated/prisma/client'

declare global {
  
  var __prismaClient: PrismaClient | undefined
}

const rawDbUrl = process.env.DATABASE_URL || ''

if (rawDbUrl.startsWith('prisma+')) {
  process.env.DATABASE_URL = rawDbUrl.replace(/^prisma\+/, '')
}

// @ts-expect-error: generated client may require adapter, but runtime accepts no-arg instantiation here
const instantiate = () => new PrismaClient()

const prisma =
  (globalThis.__prismaClient !== undefined && process.env.NODE_ENV === 'development')
    ? globalThis.__prismaClient
    : instantiate()

if (process.env.NODE_ENV === 'development') globalThis.__prismaClient = prisma

export default prisma
