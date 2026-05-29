import type {
  CanvasEdge,
  CanvasNode,
  CanvasNodeColorKey,
  CanvasNodeShape,
} from '@/types/canvas'

type TemplateCategory = 'Architecture' | 'Delivery' | 'Messaging'

export type CanvasTemplate = {
  id: string
  name: string
  description: string
  category: TemplateCategory
  recommended?: boolean
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export type CanvasTemplateImportRequest = {
  requestId: number
  template: CanvasTemplate
}

type NodeOptions = {
  id: string
  label: string
  shape: CanvasNodeShape
  color: CanvasNodeColorKey
  x: number
  y: number
  width: number
  height: number
}

type HandleSide = 'top' | 'right' | 'bottom' | 'left'

function templateNode(options: NodeOptions): CanvasNode {
  const { id, label, shape, color, x, y, width, height } = options

  return {
    id,
    type: 'canvasNode',
    position: { x, y },
    data: {
      label,
      color,
      shape,
      size: { width, height },
    },
  }
}

function templateEdge(
  source: string,
  target: string,
  sourceSide: HandleSide = 'right',
  targetSide: HandleSide = 'left'
): CanvasEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: `${sourceSide}-source`,
    targetHandle: `${targetSide}-target`,
  }
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'microservices-architecture',
    name: 'Microservices architecture',
    description: 'Gateway, services, data stores, cache, and async worker flow for a product backend.',
    category: 'Architecture',
    recommended: true,
    nodes: [
      templateNode({
        id: 'ms-client',
        label: 'Web App',
        shape: 'pill',
        color: 'violet',
        x: 0,
        y: 190,
        width: 190,
        height: 82,
      }),
      templateNode({
        id: 'ms-gateway',
        label: 'API Gateway',
        shape: 'hexagon',
        color: 'cyan',
        x: 290,
        y: 172,
        width: 210,
        height: 116,
      }),
      templateNode({
        id: 'ms-auth',
        label: 'Auth Service',
        shape: 'rectangle',
        color: 'cyan',
        x: 640,
        y: 40,
        width: 210,
        height: 92,
      }),
      templateNode({
        id: 'ms-orders',
        label: 'Orders Service',
        shape: 'rectangle',
        color: 'cyan',
        x: 640,
        y: 184,
        width: 230,
        height: 96,
      }),
      templateNode({
        id: 'ms-billing',
        label: 'Billing Service',
        shape: 'rectangle',
        color: 'cyan',
        x: 640,
        y: 330,
        width: 220,
        height: 92,
      }),
      templateNode({
        id: 'ms-cache',
        label: 'Redis Cache',
        shape: 'circle',
        color: 'warning',
        x: 1020,
        y: 36,
        width: 130,
        height: 130,
      }),
      templateNode({
        id: 'ms-db',
        label: 'Postgres',
        shape: 'cylinder',
        color: 'success',
        x: 1010,
        y: 222,
        width: 170,
        height: 154,
      }),
      templateNode({
        id: 'ms-queue',
        label: 'Job Queue',
        shape: 'diamond',
        color: 'violet',
        x: 1000,
        y: 430,
        width: 180,
        height: 148,
      }),
    ],
    edges: [
      templateEdge('ms-client', 'ms-gateway'),
      templateEdge('ms-gateway', 'ms-auth'),
      templateEdge('ms-gateway', 'ms-orders'),
      templateEdge('ms-gateway', 'ms-billing'),
      templateEdge('ms-auth', 'ms-cache'),
      templateEdge('ms-orders', 'ms-db'),
      templateEdge('ms-billing', 'ms-db'),
      templateEdge('ms-orders', 'ms-queue', 'bottom', 'top'),
    ],
  },
  {
    id: 'ci-cd-pipeline',
    name: 'CI/CD pipeline',
    description: 'Source control through build, test, artifact, deployment, and production verification.',
    category: 'Delivery',
    nodes: [
      templateNode({
        id: 'ci-repo',
        label: 'Git Repo',
        shape: 'pill',
        color: 'violet',
        x: 0,
        y: 174,
        width: 170,
        height: 76,
      }),
      templateNode({
        id: 'ci-trigger',
        label: 'Pipeline Trigger',
        shape: 'diamond',
        color: 'cyan',
        x: 260,
        y: 146,
        width: 170,
        height: 132,
      }),
      templateNode({
        id: 'ci-build',
        label: 'Build',
        shape: 'rectangle',
        color: 'cyan',
        x: 520,
        y: 52,
        width: 180,
        height: 86,
      }),
      templateNode({
        id: 'ci-test',
        label: 'Test Suite',
        shape: 'rectangle',
        color: 'success',
        x: 520,
        y: 284,
        width: 190,
        height: 86,
      }),
      templateNode({
        id: 'ci-artifact',
        label: 'Artifact Registry',
        shape: 'cylinder',
        color: 'warning',
        x: 820,
        y: 134,
        width: 190,
        height: 150,
      }),
      templateNode({
        id: 'ci-deploy',
        label: 'Deploy',
        shape: 'hexagon',
        color: 'violet',
        x: 1110,
        y: 144,
        width: 190,
        height: 118,
      }),
      templateNode({
        id: 'ci-prod',
        label: 'Production',
        shape: 'circle',
        color: 'success',
        x: 1400,
        y: 126,
        width: 150,
        height: 150,
      }),
    ],
    edges: [
      templateEdge('ci-repo', 'ci-trigger'),
      templateEdge('ci-trigger', 'ci-build', 'right', 'left'),
      templateEdge('ci-trigger', 'ci-test', 'right', 'left'),
      templateEdge('ci-build', 'ci-artifact'),
      templateEdge('ci-test', 'ci-artifact'),
      templateEdge('ci-artifact', 'ci-deploy'),
      templateEdge('ci-deploy', 'ci-prod'),
    ],
  },
  {
    id: 'event-driven-system',
    name: 'Event-driven system',
    description: 'Producer services publish domain events through a broker to projections and workflows.',
    category: 'Messaging',
    nodes: [
      templateNode({
        id: 'ev-api',
        label: 'Public API',
        shape: 'hexagon',
        color: 'cyan',
        x: 0,
        y: 150,
        width: 190,
        height: 112,
      }),
      templateNode({
        id: 'ev-producer-a',
        label: 'Orders',
        shape: 'rectangle',
        color: 'violet',
        x: 310,
        y: 40,
        width: 190,
        height: 86,
      }),
      templateNode({
        id: 'ev-producer-b',
        label: 'Payments',
        shape: 'rectangle',
        color: 'violet',
        x: 310,
        y: 274,
        width: 200,
        height: 86,
      }),
      templateNode({
        id: 'ev-broker',
        label: 'Event Bus',
        shape: 'diamond',
        color: 'cyan',
        x: 690,
        y: 128,
        width: 210,
        height: 166,
      }),
      templateNode({
        id: 'ev-worker',
        label: 'Workflow Worker',
        shape: 'rectangle',
        color: 'warning',
        x: 1080,
        y: 20,
        width: 230,
        height: 92,
      }),
      templateNode({
        id: 'ev-read-model',
        label: 'Read Model',
        shape: 'cylinder',
        color: 'success',
        x: 1100,
        y: 180,
        width: 190,
        height: 150,
      }),
      templateNode({
        id: 'ev-notifications',
        label: 'Notifications',
        shape: 'pill',
        color: 'violet',
        x: 1080,
        y: 406,
        width: 220,
        height: 82,
      }),
    ],
    edges: [
      templateEdge('ev-api', 'ev-producer-a', 'right', 'left'),
      templateEdge('ev-api', 'ev-producer-b', 'right', 'left'),
      templateEdge('ev-producer-a', 'ev-broker'),
      templateEdge('ev-producer-b', 'ev-broker'),
      templateEdge('ev-broker', 'ev-worker'),
      templateEdge('ev-broker', 'ev-read-model'),
      templateEdge('ev-broker', 'ev-notifications', 'bottom', 'left'),
    ],
  },
]
