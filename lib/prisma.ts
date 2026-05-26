import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../app/generated/prisma/client'

declare global {
  
  var __prismaClient: PrismaClient | undefined
}

const rawDbUrl = process.env.DATABASE_URL || ''

if (!rawDbUrl) {
  throw new Error('DATABASE_URL is required to initialize PrismaClient')
}

const connectionString = rawDbUrl.replace(/^prisma\+/, '')

const instantiate = () => {
  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({ adapter })
}

const prisma =
  (globalThis.__prismaClient !== undefined && process.env.NODE_ENV === 'development')
    ? globalThis.__prismaClient
    : instantiate()

if (process.env.NODE_ENV === 'development') globalThis.__prismaClient = prisma

export default prisma
