import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function PATCH(req: Request, context: any) {
  const { userId } = await auth()

  if (!userId) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 })
  }

  const params = await Promise.resolve(context.params)
  const projectId = params.projectId

  const prisma = (await import("../../../../lib/prisma")).default
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return new Response(JSON.stringify({ message: "Not found" }), { status: 404 })
  }

  if (project.ownerId !== userId) {
    return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const name = body?.name
  if (!name) {
    return new Response(JSON.stringify({ message: "Bad Request" }), { status: 400 })
  }

  const updated = await prisma.project.update({ where: { id: projectId }, data: { name } })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, context: any) {
  const { userId } = await auth()

  if (!userId) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 })
  }

  const params = await Promise.resolve(context.params)
  const projectId = params.projectId

  const prisma = (await import("../../../../lib/prisma")).default
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) {
    return new Response(JSON.stringify({ message: "Not found" }), { status: 404 })
  }

  if (project.ownerId !== userId) {
    return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 })
  }

  await prisma.project.delete({ where: { id: projectId } })

  return new Response(null, { status: 204 })
}
