import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk'
import { z } from 'zod'

import { getAccessibleProject, getCurrentClerkIdentity } from '@/lib/project-access'
import prisma from '@/lib/prisma'
import type { generateSpec } from '@/trigger/generate-spec'
import { canvasEdgeSchema, canvasNodeSchema } from '@/types/canvas'
import { aiChatFeedMessageSchema } from '@/types/tasks'

export const runtime = 'nodejs'

const specRequestSchema = z.object({
  roomId: z.string().trim().min(1),
  chatHistory: z.array(aiChatFeedMessageSchema),
  nodes: z.array(canvasNodeSchema),
  edges: z.array(canvasEdgeSchema),
})

function errorResponse(message: string, code: string, status: number): Response {
  return NextResponse.json({ error: { message, code } }, { status })
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')

  if (!origin) {
    return true
  }

  return origin === new URL(request.url).origin
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isSameOrigin(req)) {
    return errorResponse('Invalid request origin.', 'forbidden', 403)
  }

  const identity = await getCurrentClerkIdentity()

  if (!identity) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  const payload = await req.json().catch(() => null)
  const parsed = specRequestSchema.safeParse(payload)

  if (!parsed.success) {
    return errorResponse('Spec request payload is invalid.', 'bad_request', 400)
  }

  const { roomId, chatHistory, nodes, edges } = parsed.data
  const project = await getAccessibleProject(identity, roomId)

  if (!project) {
    return errorResponse('Project not found.', 'not_found', 404)
  }

  try {
    const runHandle = await tasks.trigger<typeof generateSpec>(
      'generate-spec',
      {
        projectId: project.id,
        roomId,
        chatHistory,
        nodes,
        edges,
      },
      {
        tags: [`project:${project.id}`],
      }
    )

    await prisma.taskRun.upsert({
      where: {
        runId: runHandle.id,
      },
      create: {
        runId: runHandle.id,
        projectId: project.id,
        userId: identity.userId,
      },
      update: {
        projectId: project.id,
        userId: identity.userId,
      },
      select: {
        id: true,
      },
    })

    return NextResponse.json(
      {
        data: {
          runId: runHandle.id,
        },
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('Failed to trigger generate-spec task.', error)
    return errorResponse('Failed to start spec task.', 'spec_task_trigger_failed', 500)
  }
}
