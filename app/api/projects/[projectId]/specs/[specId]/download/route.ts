import { get } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentClerkIdentity, hasProjectAccess } from '@/lib/project-access'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{
    projectId: string
    specId: string
  }>
}

const DEFAULT_SPEC_CONTENT_TYPE = 'text/markdown; charset=utf-8'

function errorResponse(message: string, code: string, status: number): Response {
  return NextResponse.json({ error: { message, code } }, { status })
}

function isPublicStoreAccessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Cannot use private access on a public store')
  )
}

function isMissingProjectSpecTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as { code?: unknown; meta?: unknown }
  if (candidate.code !== 'P2021') {
    return false
  }

  if (!candidate.meta || typeof candidate.meta !== 'object') {
    return false
  }

  const table = (candidate.meta as { table?: unknown }).table
  return typeof table === 'string' && table.includes('ProjectSpec')
}

async function readSpecBlob(filePath: string) {
  return get(filePath, {
    access: 'private',
    useCache: false,
  }).catch(async (error: unknown) => {
    if (!isPublicStoreAccessError(error)) {
      throw error
    }

    return get(filePath, {
      access: 'public',
    })
  })
}

export async function GET(_req: NextRequest, context: RouteContext): Promise<Response> {
  const identity = await getCurrentClerkIdentity()

  if (!identity) {
    return errorResponse('Authentication required.', 'unauthorized', 401)
  }

  const { projectId, specId } = await context.params
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  })

  if (!project) {
    return errorResponse('Project not found.', 'not_found', 404)
  }

  const canAccessProject = await hasProjectAccess(identity, projectId)

  if (!canAccessProject) {
    return errorResponse('Access denied.', 'forbidden', 403)
  }

  let projectSpec: { id: string; filePath: string } | null

  try {
    projectSpec = await prisma.projectSpec.findFirst({
      where: {
        id: specId,
        projectId,
      },
      select: {
        id: true,
        filePath: true,
      },
    })
  } catch (error) {
    if (isMissingProjectSpecTableError(error)) {
      return errorResponse('Spec storage is not initialized for this environment.', 'spec_storage_not_initialized', 503)
    }

    throw error
  }

  if (!projectSpec) {
    return errorResponse('Spec not found.', 'not_found', 404)
  }

  try {
    const blob = await readSpecBlob(projectSpec.filePath)

    if (blob?.statusCode !== 200 || !blob?.stream) {
      return errorResponse('Spec file not found.', 'not_found', 404)
    }

    const filename = `spec-${projectSpec.id}.md`

    return new Response(blob.stream, {
      status: 200,
      headers: {
        'content-type': blob.blob.contentType ?? DEFAULT_SPEC_CONTENT_TYPE,
        'content-disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to download spec file.', error)
    return errorResponse('Spec download failed.', 'spec_download_failed', 500)
  }
}
