import 'server-only'

import { currentUser } from '@clerk/nextjs/server'

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

  return {
    OR: [
      { ownerId: identity.userId },
      {
        collaborators: {
          some: {
            email: identity.primaryEmail,
          },
        },
      },
    ],
  }
}

export async function getCurrentClerkIdentity(): Promise<ClerkIdentity | null> {
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
