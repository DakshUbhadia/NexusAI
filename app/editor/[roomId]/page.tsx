import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AccessDenied } from '@/components/editor/access-denied'
import { WorkspaceShell } from '@/components/editor/workspace-shell'
import { getEditorProjectLists } from '@/lib/editor-projects'
import prisma from '@/lib/prisma'
import { getAccessibleProject, getCurrentClerkIdentity } from '@/lib/project-access'

type ProjectSpecListItem = {
  id: string
  createdAt: string
  filename: string
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

async function getProjectSpecListItems(projectId: string): Promise<ProjectSpecListItem[]> {
  const client = prisma as unknown as {
    projectSpec?: {
      findMany?: (args: {
        where: { projectId: string }
        orderBy: { createdAt: 'desc' }
        select: { id: true; filePath: true; createdAt: true }
      }) => Promise<{ id: string; filePath: string; createdAt: Date }[]>
    }
  }

  const findMany = client.projectSpec?.findMany

  if (typeof findMany !== 'function') {
    console.warn('ProjectSpec delegate missing on Prisma client. Returning empty spec list.')
    return []
  }

  let projectSpecs: { id: string; filePath: string; createdAt: Date }[]

  try {
    projectSpecs = await findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        filePath: true,
        createdAt: true,
      },
    })
  } catch (error) {
    if (isMissingProjectSpecTableError(error)) {
      console.warn('ProjectSpec table is missing in the current database. Returning empty spec list.')
      return []
    }

    throw error
  }

  return projectSpecs.map((spec) => {
    const fallbackFilename = `spec-${spec.id}.md`

    try {
      const pathname = new URL(spec.filePath).pathname
      const segments = pathname.split('/').filter(Boolean)
      const lastSegment = segments.at(-1)
      const filename = lastSegment && lastSegment.trim().length > 0 ? lastSegment : fallbackFilename

      return {
        id: spec.id,
        createdAt: spec.createdAt.toISOString(),
        filename,
      }
    } catch {
      const segments = spec.filePath.split('/').filter(Boolean)
      const lastSegment = segments.at(-1)
      const filename = lastSegment && lastSegment.trim().length > 0 ? lastSegment : fallbackFilename

      return {
        id: spec.id,
        createdAt: spec.createdAt.toISOString(),
        filename,
      }
    }
  })
}

type EditorWorkspacePageProps = {
  readonly params: Promise<{
    readonly roomId: string
  }>
}

export async function generateMetadata(props: EditorWorkspacePageProps): Promise<Metadata> {
  const { roomId } = await props.params

  return {
    title: `Workspace ${roomId} | Nexus AI`,
  }
}

export default async function EditorWorkspacePage(props: EditorWorkspacePageProps) {
  const identity = await getCurrentClerkIdentity()

  if (!identity) {
    redirect('/sign-in')
  }

  const { roomId } = await props.params
  const project = await getAccessibleProject(identity, roomId)

  if (!project) {
    return <AccessDenied />
  }

  const { ownedProjects, sharedProjects } = await getEditorProjectLists(identity.userId, identity.primaryEmail)
  const specListItems = await getProjectSpecListItems(project.id)

  return (
    <WorkspaceShell
      currentProjectId={project.id}
      currentRoomId={roomId}
      ownedProjects={ownedProjects}
      projectName={project.name}
      projectSpecs={specListItems}
      sharedProjects={sharedProjects}
    />
  )
}
