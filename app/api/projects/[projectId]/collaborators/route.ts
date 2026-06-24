import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { clerkClient } from '@clerk/nextjs/server'

import prisma from '@/lib/prisma'
import { getLiveblocksClient } from '@/lib/liveblocks'
import { getCurrentClerkIdentity, hasProjectAccess } from '@/lib/project-access'
import type {
  CollaboratorInviteData,
  CollaboratorListData,
  CollaboratorProfile,
  CollaboratorRemoveData,
} from '@/types/collaborators'

const emailSchema = z
  .string()
  .trim()
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Invalid email address',
  })

const inviteSchema = z.object({
  email: emailSchema,
})

const removeSchema = z.object({
  email: emailSchema,
})

type RouteContext = {
  params: Promise<{
    projectId: string
  }>
}

function errorResponse(message: string, code: string, status: number) {
  return NextResponse.json({ error: { message, code } }, { status })
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')

  if (!origin) {
    return true
  }

  return origin === new URL(request.url).origin
}

function buildDisplayName(profile: {
  fullName: string | null
  firstName: string | null
  lastName: string | null
}): string | null {
  if (profile.fullName) {
    return profile.fullName
  }

  const merged = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
  return merged.length > 0 ? merged : null
}

async function fetchClerkProfiles(emails: string[]): Promise<Map<string, CollaboratorProfile>> {
  if (emails.length === 0) {
    return new Map()
  }

  try {
    const client = await clerkClient()
    const users = await client.users.getUserList({
      emailAddress: emails,
      limit: 200,
    })

    const map = new Map<string, CollaboratorProfile>()

    for (const user of users.data) {
      for (const address of user.emailAddresses) {
        const normalizedEmail = address.emailAddress.toLowerCase()
        map.set(normalizedEmail, {
          email: normalizedEmail,
          displayName: buildDisplayName({
            fullName: user.fullName ?? null,
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
          }),
          avatarUrl: user.imageUrl ?? null,
        })
      }
    }

    return map
  } catch (error) {
    console.error('Failed to load Clerk profiles for collaborators.', error)
    return new Map()
  }
}

export async function GET(_req: NextRequest, context: RouteContext): Promise<Response> {
  const identity = await getCurrentClerkIdentity()

  if (!identity) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  const params = await context.params
  const projectId = params.projectId

  if (!projectId) {
    return errorResponse('Project ID is required.', 'bad_request', 400)
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  })

  if (!project) {
    return errorResponse('Project not found.', 'not_found', 404)
  }

  const hasAccess = await hasProjectAccess(identity, projectId)

  if (!hasAccess) {
    return errorResponse('Access denied.', 'forbidden', 403)
  }

  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: { email: true },
  })

  const emails = Array.from(
    new Set(collaborators.map((collaborator) => collaborator.email.toLowerCase()))
  )
  const clerkProfiles = await fetchClerkProfiles(emails)

  const enriched: CollaboratorProfile[] = emails.map((email) => {
    const profile = clerkProfiles.get(email)

    return profile ?? {
      email,
      displayName: null,
      avatarUrl: null,
    }
  })

  const viewerRole: CollaboratorListData['viewerRole'] =
    project.ownerId === identity.userId ? 'owner' : 'collaborator'

  return NextResponse.json({
    data: {
      collaborators: enriched,
      viewerRole,
    } satisfies CollaboratorListData,
  })
}

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const identity = await getCurrentClerkIdentity()

  if (!identity) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  if (!isSameOrigin(req)) {
    return errorResponse('Invalid request origin.', 'forbidden', 403)
  }

  const params = await context.params
  const projectId = params.projectId

  if (!projectId) {
    return errorResponse('Project ID is required.', 'bad_request', 400)
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  })

  if (!project) {
    return errorResponse('Project not found.', 'not_found', 404)
  }

  if (project.ownerId !== identity.userId) {
    return errorResponse('Only owners can invite collaborators.', 'forbidden', 403)
  }

  const payload = await req.json().catch(() => null)
  const parsed = inviteSchema.safeParse(payload)

  if (!parsed.success) {
    return errorResponse('Enter a valid email address.', 'bad_request', 400)
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase()

  const existing = await prisma.projectCollaborator.findUnique({
    where: {
      projectId_email: {
        projectId,
        email: normalizedEmail,
      },
    },
  })

  if (existing) {
    return errorResponse('That collaborator is already invited.', 'conflict', 409)
  }

  const collaborator = await prisma.projectCollaborator.create({
    data: {
      projectId,
      email: normalizedEmail,
    },
    select: { email: true },
  })

  const clerkProfiles = await fetchClerkProfiles([normalizedEmail])
  const profile = clerkProfiles.get(normalizedEmail)

  return NextResponse.json(
    {
      data: {
        collaborator: profile ?? {
          email: collaborator.email,
          displayName: null,
          avatarUrl: null,
        },
      } satisfies CollaboratorInviteData,
    },
    { status: 201 }
  )
}

export async function DELETE(req: NextRequest, context: RouteContext): Promise<Response> {
  const identity = await getCurrentClerkIdentity()

  if (!identity) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  if (!isSameOrigin(req)) {
    return errorResponse('Invalid request origin.', 'forbidden', 403)
  }

  const params = await context.params
  const projectId = params.projectId

  if (!projectId) {
    return errorResponse('Project ID is required.', 'bad_request', 400)
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  })

  if (!project) {
    return errorResponse('Project not found.', 'not_found', 404)
  }

  if (project.ownerId !== identity.userId) {
    return errorResponse('Only owners can remove collaborators.', 'forbidden', 403)
  }

  const payload = await req.json().catch(() => null)
  const parsed = removeSchema.safeParse(payload)

  if (!parsed.success) {
    return errorResponse('Enter a valid email address.', 'bad_request', 400)
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase()

  const existing = await prisma.projectCollaborator.findUnique({
    where: {
      projectId_email: {
        projectId,
        email: normalizedEmail,
      },
    },
    select: { id: true },
  })

  if (!existing) {
    return errorResponse('Collaborator not found.', 'not_found', 404)
  }

  await prisma.projectCollaborator.delete({
    where: {
      projectId_email: {
        projectId,
        email: normalizedEmail,
      },
    },
  })

  try {
    const liveblocks = getLiveblocksClient()
    await liveblocks.broadcastEvent(projectId, {
      type: 'access-revoked',
      email: normalizedEmail,
    })
  } catch (error) {
    console.error('Failed to broadcast access-revoked event.', error)
  }

  return NextResponse.json({
    data: {
      removedEmail: normalizedEmail,
    } satisfies CollaboratorRemoveData,
  })
}
