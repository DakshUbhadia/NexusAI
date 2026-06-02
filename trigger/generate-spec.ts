import { put, type PutBlobResult } from '@vercel/blob'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { metadata, schemaTask } from '@trigger.dev/sdk'
import { z } from 'zod'

import prisma from '../lib/prisma'
import { canvasEdgeSchema, canvasNodeSchema } from '../types/canvas'
import { aiChatFeedMessageSchema } from '../types/tasks'

const generateSpecPayloadSchema = z.object({
  projectId: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
  chatHistory: z.array(aiChatFeedMessageSchema),
  nodes: z.array(canvasNodeSchema),
  edges: z.array(canvasEdgeSchema),
})

type SpecStatusPhase = 'start' | 'processing' | 'complete' | 'error'
const SPEC_CONTENT_TYPE = 'text/markdown; charset=utf-8'

function getSpecBlobPath(projectId: string, runId: string): string {
  return `projects/${projectId}/specs/${runId}.md`
}

function isPublicStoreAccessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Cannot use private access on a public store')
  )
}

async function writeSpecBlob(
  projectId: string,
  runId: string,
  markdown: string
): Promise<PutBlobResult> {
  const pathname = getSpecBlobPath(projectId, runId)

  try {
    return await put(pathname, markdown, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: SPEC_CONTENT_TYPE,
    })
  } catch (error) {
    if (!isPublicStoreAccessError(error)) {
      throw error
    }

    return put(pathname, markdown, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: SPEC_CONTENT_TYPE,
    })
  }
}

function setSpecStatus(phase: SpecStatusPhase, message: string, progress: number): void {
  metadata
    .set('phase', phase)
    .set('status', message)
    .set('progress', progress)
    .set('updatedAt', new Date().toISOString())
}

function summarizeChatHistory(chatHistory: z.infer<typeof aiChatFeedMessageSchema>[]): string {
  if (chatHistory.length === 0) {
    return '- No prior chat context was provided.'
  }

  return chatHistory
    .slice(-40)
    .map((message, index) => `${index + 1}. [${message.role}] ${message.sender}: ${message.content}`)
    .join('\n')
}

function summarizeCanvas(
  nodes: z.infer<typeof canvasNodeSchema>[],
  edges: z.infer<typeof canvasEdgeSchema>[]
): string {
  const nodeSection =
    nodes.length === 0
      ? '- No nodes were provided.'
      : nodes
          .map((node) => `- ${node.id}: ${node.data.label} (${node.data.shape}, ${node.data.color})`)
          .join('\n')

  const edgeSection =
    edges.length === 0
      ? '- No edges were provided.'
      : edges
          .map((edge) => {
            const edgeLabel = edge.data?.label ?? edge.label ?? 'unlabeled flow'
            return `- ${edge.source} -> ${edge.target}: ${edgeLabel}`
          })
          .join('\n')

  return [`Nodes:`, nodeSection, '', 'Edges:', edgeSection].join('\n')
}

async function generateMarkdownSpec(
  payload: z.infer<typeof generateSpecPayloadSchema>
): Promise<string> {
  const apiKey =
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!apiKey) {
    throw new Error(
      'Missing Gemini API key. Set GOOGLE_API_KEY, GEMINI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.'
    )
  }

  const google = createGoogleGenerativeAI({ apiKey })
  const chatSummary = summarizeChatHistory(payload.chatHistory)
  const canvasSummary = summarizeCanvas(payload.nodes, payload.edges)

  const systemPrompt = [
    'You are a senior software architect writing a production-ready technical specification in Markdown.',
    'Generate a complete implementation-ready spec from the provided architecture graph and chat context.',
    'The output must be plain Markdown only.',
    'Include: system overview, architecture blueprint, tech stack, implementation phases, milestones, risks, and detailed task breakdowns.',
    'Use concrete and actionable engineering language with clear section headers and ordered execution steps.',
    'Do not include code fences unless required for tiny inline examples.',
  ].join('\n')

  const prompt = [
    `Project ID: ${payload.projectId}`,
    `Room ID: ${payload.roomId}`,
    '',
    'Chat context:',
    chatSummary,
    '',
    'Canvas graph summary:',
    canvasSummary,
    '',
    'Write the final technical specification now.',
  ].join('\n')

  const result = await generateText({
    model: google('gemini-2.5-pro'),
    temperature: 0.2,
    system: systemPrompt,
    prompt,
  })

  return result.text.trim()
}

export const generateSpec = schemaTask({
  id: 'generate-spec',
  description: 'Generate a markdown technical spec from collaborative canvas and AI chat context.',
  schema: generateSpecPayloadSchema,
  maxDuration: 1800,
  retry: {
    maxAttempts: 3,
    factor: 1.8,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: false,
  },
  run: async (payload, { ctx }) => {
    const runId = ctx.run.id

    setSpecStatus('start', 'Nexus AI started generating the technical specification.', 5)
    metadata
      .set('runId', runId)
      .set('projectId', payload.projectId)
      .set('roomId', payload.roomId)
      .set('nodeCount', payload.nodes.length)
      .set('edgeCount', payload.edges.length)
      .set('chatMessageCount', payload.chatHistory.length)

    try {
      setSpecStatus('processing', 'Nexus AI is synthesizing architecture and chat context into markdown.', 45)
      const markdown = await generateMarkdownSpec(payload)
      const blob = await writeSpecBlob(payload.projectId, runId, markdown)
      const projectSpec = await prisma.projectSpec.create({
        data: {
          projectId: payload.projectId,
          filePath: blob.url,
        },
        select: {
          id: true,
          filePath: true,
        },
      })

      setSpecStatus('complete', 'Nexus AI finished generating the technical specification.', 100)
      metadata
        .set('specLength', markdown.length)
        .set('specId', projectSpec.id)
        .set('specFilePath', projectSpec.filePath)

      return {
        status: 'completed',
        runId,
        projectId: payload.projectId,
        roomId: payload.roomId,
        specId: projectSpec.id,
        filePath: projectSpec.filePath,
        markdown,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown spec generation failure.'

      setSpecStatus('error', `Nexus AI failed to generate the technical specification: ${errorMessage}`, 100)
      metadata.set('error', errorMessage)
      console.error('generate-spec task failed.', error)
      throw error
    }
  },
})
