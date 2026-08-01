import { z } from 'zod'

import { currentUser } from '@clerk/nextjs/server'
import { headers } from 'next/headers'

import { ensureRoomAccess, getPresenceColor, getLiveblocksClient } from '@/lib/liveblocks'
import { hasProjectAccess } from '@/lib/project-access'

export const runtime = 'nodejs'

const roomSchema = z.union([
  z.object({ room: z.string().min(1) }),
  z.object({ roomId: z.string().min(1) }),
])

type ClerkIdentity = {
  userId: string
  primaryEmail: string | null
}

function errorResponse(message: string, code: string, status: number): Response {
  return new Response(JSON.stringify({ error: { message, code } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getPrimaryEmail(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): string | null {
  return user.emailAddresses.find((emailAddress) => emailAddress.id === user.primaryEmailAddressId)?.emailAddress ?? null
}

function buildDisplayName(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): string {
  if (user.fullName) {
    return user.fullName
  }

  const merged = [user.firstName, user.lastName].filter(Boolean).join(' ')
  if (merged.length > 0) {
    return merged
  }

  return getPrimaryEmail(user) ?? 'Nexus User'
}

export async function POST(req: Request): Promise<Response> {
  // ── LOAD_TEST_MODE: bypass Clerk and Liveblocks APIs ──────────────────────
  if (process.env.LOAD_TEST_MODE === 'true') {
    const headerStore = await headers()
    const mockUserId = headerStore.get('x-mock-user-id')

    if (!mockUserId) {
      return errorResponse('Mock user ID header missing.', 'unauthorized', 401)
    }

    const payload = await req.json().catch(() => null)
    const parsed = roomSchema.safeParse(payload)
    if (!parsed.success) {
      return errorResponse('Room ID is required.', 'bad_request', 400)
    }

    // Delegate to the local mock server — instant, no rate limits
    const mockUrl = `${process.env.MOCK_SERVER_URL ?? 'http://localhost:4001'}/mock/liveblocks/identify`
    const mockRes = await fetch(mockUrl, { method: 'POST' })
    const mockBody = await mockRes.text()
    return new Response(mockBody, {
      status: mockRes.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // ─────────────────────────────────────────────────────────────────────────

  const user = await currentUser()

  if (!user) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  const payload = await req.json().catch(() => null)
  const parsed = roomSchema.safeParse(payload)

  if (!parsed.success) {
    return errorResponse('Room ID is required.', 'bad_request', 400)
  }

  const roomId = 'room' in parsed.data ? parsed.data.room : parsed.data.roomId
  const identity: ClerkIdentity = {
    userId: user.id,
    primaryEmail: getPrimaryEmail(user),
  }

  const hasAccess = await hasProjectAccess(identity, roomId)

  if (!hasAccess) {
    return errorResponse('Access denied.', 'forbidden', 403)
  }

  await ensureRoomAccess(roomId, identity.userId)

  const name = buildDisplayName(user)
  const { status, body } = await getLiveblocksClient().identifyUser(
    identity.userId,
    {
      userInfo: {
        name,
        avatar: user.imageUrl ?? '',
        color: getPresenceColor(identity.userId),
      },
    }
  )

  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
