import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AccessDenied } from '@/components/editor/access-denied'
import { WorkspaceShell } from '@/components/editor/workspace-shell'
import { getEditorProjectLists } from '@/lib/editor-projects'
import { getAccessibleProject, getCurrentClerkIdentity } from '@/lib/project-access'

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

  return (
    <WorkspaceShell
      currentRoomId={roomId}
      ownedProjects={ownedProjects}
      projectName={project.name}
      sharedProjects={sharedProjects}
    />
  )
}
