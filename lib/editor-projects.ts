export interface EditorProject {
  readonly id: string
  readonly name: string
  readonly roomId: string
  readonly owned: boolean
}

export interface EditorProjectLists {
  readonly ownedProjects: EditorProject[]
  readonly sharedProjects: EditorProject[]
}

function mapProject(project: { id: string; name: string }, owned: boolean): EditorProject {
  return {
    id: project.id,
    name: project.name,
    roomId: project.id,
    owned,
  }
}

export async function getEditorProjectLists(userId: string, userEmail?: string | null): Promise<EditorProjectLists> {
  const prisma = (await import("./prisma")).default

  const [ownedProjects, sharedProjects] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true },
    }),
    userEmail
      ? prisma.project.findMany({
          where: {
            ownerId: { not: userId },
            collaborators: {
              some: {
                email: userEmail,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([] as { id: string; name: string }[]),
  ])

  return {
    ownedProjects: ownedProjects.map((project) => mapProject(project, true)),
    sharedProjects: sharedProjects.map((project) => mapProject(project, false)),
  }
}
