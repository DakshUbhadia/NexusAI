import { get, put, type PutBlobResult } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import prisma from '@/lib/prisma'
import { getCurrentClerkIdentity, hasProjectAccess } from '@/lib/project-access'
import { canvasFlowSchema } from '@/types/canvas'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{
    projectId: string
  }>
}

const saveCanvasSchema = z.object({
  canvas: canvasFlowSchema,
})

const CANVAS_BLOB_PATHNAME = 'canvas.json'

type CanvasFlowPayload = z.infer<typeof canvasFlowSchema>

type ProjectCanvasUpdateData = {
  canvasJsonPath: string
}

function errorResponse(message: string, code: string, status: number): Response {
  return NextResponse.json({ error: { message, code } }, { status })
}

function getCanvasBlobPath(projectId: string): string {
  return `projects/${projectId}/${CANVAS_BLOB_PATHNAME}`
}

function isPublicStoreAccessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Cannot use private access on a public store')
  )
}

async function readCanvasBlob(blobUrl: string): Promise<unknown> {
  const result = await get(blobUrl, {
    access: 'private',
    useCache: false,
  }).catch(async (error: unknown) => {
    if (!isPublicStoreAccessError(error)) {
      throw error
    }

    return get(blobUrl, {
      access: 'public',
    })
  })

  if (result?.statusCode !== 200 || !result?.stream) {
    return null
  }

  const payloadText = await new Response(result.stream).text()
  return JSON.parse(payloadText) as unknown
}

async function writeCanvasBlob(projectId: string, canvas: CanvasFlowPayload): Promise<PutBlobResult> {
  const pathname = getCanvasBlobPath(projectId)
  const body = JSON.stringify(canvas)

  try {
    return await put(pathname, body, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
  } catch (error) {
    if (!isPublicStoreAccessError(error)) {
      throw error
    }

    return put(pathname, body, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })
  }
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')

  if (!origin) {
    return true
  }

  return origin === new URL(request.url).origin
}

async function requireProjectAccess(projectId: string): Promise<Response | null> {
  const identity = await getCurrentClerkIdentity()

  if (!identity) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  })

  if (!project) {
    return errorResponse('Project not found.', 'not_found', 404)
  }

  const hasAccess = await hasProjectAccess(identity, projectId)

  if (!hasAccess) {
    return errorResponse('Access denied.', 'forbidden', 403)
  }

  return null
}

export async function GET(_req: NextRequest, context: RouteContext): Promise<Response> {
  const { projectId } = await context.params
  const accessError = await requireProjectAccess(projectId)

  if (accessError) {
    return accessError
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { canvasJsonPath: true },
  })

  if (!project?.canvasJsonPath) {
    return NextResponse.json({ data: { canvas: null } })
  }

  try {
    const payload = await readCanvasBlob(project.canvasJsonPath)

    if (!payload) {
      console.warn('Saved canvas blob was not found.', {
        projectId,
        canvasJsonPath: project.canvasJsonPath,
      })
      return NextResponse.json({ data: { canvas: null } })
    }
    const canvas = canvasFlowSchema.parse(payload)

    return NextResponse.json({ data: { canvas } })
  } catch (error) {
    console.error('Failed to read saved canvas blob.', error)
    return errorResponse('Saved canvas could not be loaded.', 'canvas_load_failed', 500)
  }
}

export async function PUT(req: NextRequest, context: RouteContext): Promise<Response> {
  if (!isSameOrigin(req)) {
    return errorResponse('Invalid request origin.', 'forbidden', 403)
  }

  const { projectId } = await context.params
  const accessError = await requireProjectAccess(projectId)

  if (accessError) {
    return accessError
  }

  const payload = await req.json().catch(() => null)
  const parsed = saveCanvasSchema.safeParse(payload)

  if (!parsed.success) {
    return errorResponse('Canvas payload is invalid.', 'bad_request', 400)
  }

  let blob: PutBlobResult

  try {
    console.info('Uploading canvas blob.', {
      projectId,
      pathname: getCanvasBlobPath(projectId),
    })
    blob = await writeCanvasBlob(projectId, parsed.data.canvas)
    console.info('Canvas blob uploaded.', {
      projectId,
      pathname: blob.pathname,
      url: blob.url,
    })
  } catch (error) {
    console.error('Canvas blob upload failed.', error)
    return errorResponse('Canvas blob upload failed.', 'canvas_blob_upload_failed', 500)
  }

  const updateData: ProjectCanvasUpdateData = {
    canvasJsonPath: blob.url,
  }

  try {
    console.info('Updating project canvas blob reference.', {
      projectId,
      data: updateData,
    })
    await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      select: { id: true },
    })

    console.info('Project canvas blob reference updated.', {
      projectId,
    })
    return NextResponse.json({
      data: {
        canvasJsonPath: blob.url,
      },
    })
  } catch (error) {
    console.error('Canvas blob uploaded, but database update failed.', {
      projectId,
      data: updateData,
      error,
    })
    return errorResponse(
      'Canvas blob uploaded, but database update failed.',
      'canvas_database_update_failed',
      500
    )
  }
}
