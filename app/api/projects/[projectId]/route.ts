import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import prisma from '@/lib/prisma'

type RouteContext = {
  params: Promise<{
    projectId: string
  }>
}

const patchProjectSchema = z.object({
  name: z.string().trim().min(1),
})

function errorResponse(message: string, code: string, status: number): Response {
  return NextResponse.json({ error: { message, code } }, { status })
}

async function requireOwnedProject(projectId: string, userId: string): Promise<Response | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
    },
  })

  if (!project) {
    return errorResponse('Project not found.', 'not_found', 404)
  }

  if (project.ownerId !== userId) {
    return errorResponse('Access denied.', 'forbidden', 403)
  }

  return null
}

export async function PATCH(req: Request, context: RouteContext): Promise<Response> {
  const { userId } = await auth()

  if (!userId) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  const { projectId } = await context.params
  const accessError = await requireOwnedProject(projectId, userId)

  if (accessError) {
    return accessError
  }

  const payload = (await req.json().catch(() => null)) as unknown
  const parsed = patchProjectSchema.safeParse(payload)

  if (!parsed.success) {
    return errorResponse('Project payload is invalid.', 'bad_request', 400)
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name: parsed.data.name },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(_req: Request, context: RouteContext): Promise<Response> {
  const { userId } = await auth()

  if (!userId) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  const { projectId } = await context.params
  const accessError = await requireOwnedProject(projectId, userId)

  if (accessError) {
    return accessError
  }

  await prisma.project.delete({ where: { id: projectId } })

  return new Response(null, { status: 204 })
}
