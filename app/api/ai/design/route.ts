import { NextRequest, NextResponse } from "next/server";
import { auth as triggerAuth, tasks } from "@trigger.dev/sdk";
import { z } from "zod";

import { getCurrentClerkIdentity } from "@/lib/project-access";
import prisma from "@/lib/prisma";
import { hasProjectAccess } from "@/lib/project-access";
import type { designAgent } from "@/trigger/design-agent";

export const runtime = "nodejs";

const designRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
});

function errorResponse(message: string, code: string, status: number): Response {
  return NextResponse.json({ error: { message, code } }, { status });
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return origin === new URL(request.url).origin;
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!isSameOrigin(req)) {
    return errorResponse("Invalid request origin.", "forbidden", 403);
  }

  const identity = await getCurrentClerkIdentity();

  if (!identity) {
    return errorResponse("Authentication required.", "unauthorized", 401);
  }

  const payload = await req.json().catch(() => null);
  const parsed = designRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse("Design request payload is invalid.", "bad_request", 400);
  }

  const { projectId, prompt, roomId } = parsed.data;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return errorResponse("Project not found.", "not_found", 404);
  }

  const canAccessProject = await hasProjectAccess(identity, projectId);

  if (!canAccessProject) {
    return errorResponse("Access denied.", "forbidden", 403);
  }

  try {
    let publicToken: string | undefined;

    try {
      publicToken = await triggerAuth.createPublicToken({
        scopes: {
          read: {
            tags: `project:${projectId}`,
          },
        },
      });
    } catch (error) {
      console.warn("Failed to create tag-scoped design token.", error);
    }

    const runHandle = await tasks.trigger<typeof designAgent>("design-agent", {
      prompt,
      roomId,
      projectId,
      userId: identity.userId,
    }, {
      tags: [`project:${projectId}`],
    });

    return NextResponse.json(
      {
        data: {
          runId: runHandle.id,
          publicToken,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Failed to trigger design-agent task.", error);
    return errorResponse("Failed to start design task.", "design_task_trigger_failed", 500);
  }
}
