import { z } from "zod"

export const AI_STATUS_FEED_ID = "ai-status-feed" as const
export const AI_CHAT_FEED_ID = "ai-chat" as const

export const aiStatusFeedMessageSchema = z
  .object({
    text: z.string().trim().min(1).max(140).optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.text !== undefined || value.active !== undefined, {
    message: "At least one AI status field is required.",
  })

export type AiStatusFeedMessage = z.infer<typeof aiStatusFeedMessageSchema>

export const aiChatFeedMessageRoleSchema = z.enum(["user", "assistant"])

export const aiChatFeedMessageSchema = z
  .object({
    sender: z.string().trim().min(1).max(80),
    role: aiChatFeedMessageRoleSchema,
    content: z.string().trim().min(1).max(2000),
    timestamp: z
      .string()
      .refine((val) => !Number.isNaN(Date.parse(val)), { message: "Invalid datetime string" }),
  })
  .strict()

export type AiChatFeedMessage = z.infer<typeof aiChatFeedMessageSchema>
export type AiFeedMessage = AiStatusFeedMessage | AiChatFeedMessage

export function parseAiStatusFeedMessage(payload: unknown): AiStatusFeedMessage | null {
  const parsed = aiStatusFeedMessageSchema.safeParse(payload)
  return parsed.success ? parsed.data : null
}

export function parseAiChatFeedMessage(payload: unknown): AiChatFeedMessage | null {
  const parsed = aiChatFeedMessageSchema.safeParse(payload)
  return parsed.success ? parsed.data : null
}
