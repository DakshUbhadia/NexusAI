import { auth as clerkAuth } from "@clerk/nextjs/server";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const tokenRequestSchema = z.object({
  runId: z.string().trim().min(1),
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

  const { userId } = await clerkAuth();

  if (!userId) {
    return errorResponse("Authentication required.", "unauthorized", 401);
  }

  const payload = await req.json().catch(() => null);
  const parsed = tokenRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse("Run token payload is invalid.", "bad_request", 400);
  }

  const taskRun = await prisma.taskRun.findUnique({
    where: { runId: parsed.data.runId },
    select: {
      runId: true,
      userId: true,
    },
  });

  if (!taskRun || taskRun.userId !== userId) {
    return errorResponse("Run not found.", "not_found", 404);
  }

  try {
    const token = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          runs: [taskRun.runId],
        },
      },
    });

    return NextResponse.json({
      data: {
        token,
      },
    });
  } catch (error) {
    console.error("Failed to create run-scoped token.", error);
    return errorResponse("Failed to create run token.", "run_token_create_failed", 500);
  }
}
