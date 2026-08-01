import 'server-only'

import { currentUser } from '@clerk/nextjs/server'
import { headers } from 'next/headers'

import prisma from '@/lib/prisma'

export type ClerkIdentity = {
  userId: string
  primaryEmail: string | null
}

type AccessProject = {
  id: string
  name: string
}

function buildAccessFilter(identity: ClerkIdentity) {
  if (!identity.primaryEmail) {
    return {
      ownerId: identity.userId,
    }
  }

  const normalizedEmail = identity.primaryEmail.toLowerCase()

  return {
    OR: [
      { ownerId: identity.userId },
      {
        collaborators: {
          some: {
            email: normalizedEmail,
          },
        },
      },
    ],
  }
}

// Returns a mock identity from the X-Mock-User-Id request header when
// LOAD_TEST_MODE=true. Never called in production — the env var is never set.
async function getMockIdentityFromHeader(): Promise<ClerkIdentity | null> {
  const headerStore = await headers()
  const mockUserId = headerStore.get('x-mock-user-id')
  if (!mockUserId) return null
  return { userId: mockUserId, primaryEmail: null }
}

export async function getCurrentClerkIdentity(): Promise<ClerkIdentity | null> {
  if (process.env.LOAD_TEST_MODE === 'true') {
    return getMockIdentityFromHeader()
  }

  const user = await currentUser()

  if (!user?.id) {
    return null
  }

  const primaryEmail =
    user.emailAddresses.find((emailAddress) => emailAddress.id === user.primaryEmailAddressId)?.emailAddress ?? null

  return {
    userId: user.id,
    primaryEmail,
  }
}

export async function hasProjectAccess(identity: ClerkIdentity, projectId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...buildAccessFilter(identity),
    },
    select: {
      id: true,
    },
  })

  return Boolean(project)
}

export async function getAccessibleProject(identity: ClerkIdentity, projectId: string): Promise<AccessProject | null> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...buildAccessFilter(identity),
    },
    select: {
      id: true,
      name: true,
    },
  })

  return project
}
