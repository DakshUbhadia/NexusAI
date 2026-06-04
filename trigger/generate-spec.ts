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
  'You are a Staff Software Engineer writing a precise, production-ready Technical & Feature Specification in Markdown.',
  'Generate a complete implementation guide based on the provided architecture graph and chat context.',
  'Strict Guidelines:',
  '- Output plain Markdown only. Do not use code fences unless defining data schemas, API payloads, or tiny inline examples.',
  '- Be highly specific and technical. Avoid generic boilerplate, fluff, and explaining basic web concepts.',
  '- Assume the audience consists of senior developers.',
  '',
  'The specification MUST strictly follow this structure:',
  '1. System Overview: A brief executive summary of the application.',
  '2. Feature Specification: A breakdown of the project into distinct features. For each feature, provide an appropriate title, a concise description, and 2-3 core acceptance criteria.',
  '3. Architecture Blueprint: Define the microservices, frontend applications, and external APIs. Include a clear, numbered data-flow sequence.',
  '4. Data Models & API Contracts: Define the core database schemas (tables, columns, relations) and essential API endpoints (Method, URL, strict JSON Request/Response body structures).',
  '5. Tech Stack: A bulleted list of the exact technologies, libraries, and infrastructure tools to be used.',
  '6. Implementation Phases & Milestones: Ordered execution steps prioritizing the critical path (MVP) first.',
  '7. Detailed Task Breakdowns: Granular engineering tasks for each phase. Skip basic setup steps (like "init repo") and focus on complex business logic, state management, and integration points.'
].join('\n');

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
