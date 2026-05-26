import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 })
  }

  const prisma = (await import("../../../lib/prisma")).default
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const name = (body?.name as string) || "Untitled Project"

  const prisma = (await import("../../../lib/prisma")).default
  const project = await prisma.project.create({
    data: {
      ownerId: userId,
      name,
    },
  })

  return new Response(JSON.stringify(project), { status: 201 })
}
