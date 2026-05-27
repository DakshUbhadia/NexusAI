export type CollaboratorProfile = {
  email: string
  displayName: string | null
  avatarUrl: string | null
}

export type CollaboratorViewerRole = 'owner' | 'collaborator'

export type CollaboratorListData = {
  collaborators: CollaboratorProfile[]
  viewerRole: CollaboratorViewerRole
}

export type CollaboratorInviteData = {
  collaborator: CollaboratorProfile
}

export type CollaboratorRemoveData = {
  removedEmail: string
}
