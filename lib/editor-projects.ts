import type { CollaboratorProfile } from "@/types/collaborators"

export interface EditorProject {
  readonly id: string
  readonly name: string
  readonly roomId: string
  readonly owned: boolean
  readonly updatedAt: string // Serialized for Server-to-Client boundary
  readonly collaborators: CollaboratorProfile[]
}

export interface EditorProjectLists {
  readonly ownedProjects: EditorProject[]
  readonly sharedProjects: EditorProject[]
}

// Temporary type to map the Prisma payload safely
type PrismaProjectPayload = {
  id: string
  name: string
  updatedAt: Date
  collaborators: { email: string; displayName?: string | null; avatarUrl?: string | null }[]
}

function mapProject(project: PrismaProjectPayload, owned: boolean): EditorProject {
  return {
    id: project.id,
    name: project.name,
    roomId: project.id,
    owned,
    updatedAt: project.updatedAt.toISOString(),
    collaborators: project.collaborators.map((c) => ({
      email: c.email,
      // Safely fallback to null if these columns aren't in your DB schema yet
      displayName: c.displayName || null,
      avatarUrl: c.avatarUrl || null,
    })),
  }
}

// Retry a database call once on connection-timeout errors.
// The pooled Prisma Postgres endpoint (pooled.db.prisma.io) may take a few
// seconds to warm up after a period of inactivity.  A single retry is enough
// to recover from a cold-start without visible impact on the user.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : ''
    const isRetryable =
      msg.includes('connection terminated') ||
      msg.includes('connection timeout') ||
      msg.includes('connect etimedout') ||
      msg.includes('econnrefused') ||
      msg.includes('server has closed the connection')
    if (isRetryable) {
      // Wait briefly, then try once more.
      await new Promise((resolve) => setTimeout(resolve, 500))
      return await fn()
    }
    throw err
  }
}

export async function getEditorProjectLists(userId: string, userEmail?: string | null): Promise<EditorProjectLists> {
  const prisma = (await import("./prisma")).default

  // Explicitly query the needed metadata alongside id and name
  const projectSelect = {
    id: true,
    name: true,
    updatedAt: true,
    collaborators: {
      select: {
        email: true,
      },
    },
  }

  const [ownedProjects, sharedProjects] = await withRetry(() =>
    Promise.all([
      prisma.project.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        select: projectSelect,
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
            select: projectSelect,
          })
        : Promise.resolve([]),
    ])
  )

  return {
    ownedProjects: ownedProjects.map((project) => mapProject(project, true)),
    sharedProjects: sharedProjects.map((project) => mapProject(project, false)),
  }
}