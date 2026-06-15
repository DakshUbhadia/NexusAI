import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import prisma from '@/lib/prisma'

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
})

function errorResponse(message: string, code: string, status: number): Response {
  return NextResponse.json({ error: { message, code } }, { status })
}

export async function GET(): Promise<Response> {
  const { userId } = await auth()

  if (!userId) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ data: projects })
}

export async function POST(req: Request): Promise<Response> {
  const { userId } = await auth()

  if (!userId) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  const payload = await req.json().catch(() => null)
  const parsed = createProjectSchema.safeParse(payload ?? {})

  if (!parsed.success) {
    return errorResponse('Project payload is invalid.', 'bad_request', 400)
  }

  const name = parsed.data.name ?? 'Untitled Project'

  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      name,
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ data: project }, { status: 201 })
}
