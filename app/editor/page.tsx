import { currentUser } from '@clerk/nextjs/server'

import { getEditorProjectLists } from '@/lib/editor-projects'

import { EditorHomeClient } from './editor-home-client'

type EditorPageProps = {
  readonly searchParams?: Promise<{
    readonly projectId?: string | string[]
  }>
}

export default async function EditorPage(props: EditorPageProps) {
  const user = await currentUser()
  const userEmail = user?.emailAddresses.find((emailAddress) => emailAddress.id === user.primaryEmailAddressId)
    ?.emailAddress
  const { ownedProjects, sharedProjects } = user?.id
    ? await getEditorProjectLists(user.id, userEmail)
    : { ownedProjects: [], sharedProjects: [] }

  const searchParams = props.searchParams ? await props.searchParams : undefined
  const searchProjectId = searchParams?.projectId
  const activeProjectId = Array.isArray(searchProjectId) ? searchProjectId[0] : searchProjectId

  return (
    <EditorHomeClient
      activeProjectId={activeProjectId}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  )
}
