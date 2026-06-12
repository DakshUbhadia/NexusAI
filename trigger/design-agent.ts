import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import prisma from "../lib/prisma";
import { getLiveblocksClient } from "../lib/liveblocks";
import {
  AI_STATUS_FEED_ID,
  aiStatusFeedMessageSchema,
  type AiStatusFeedMessage,
} from "../types/tasks";
import {
  canvasFlowSchema,
  type CanvasEdge,
  type CanvasFlow,
  type CanvasNode,
  type CanvasNodeColorKey,
  type CanvasNodeShape,
  type CanvasNodeSize,
} from "../types/canvas";

const AI_AGENT_USER_ID = "nexus-ai-agent";
const AI_AGENT_NAME = "Nexus AI";
const AI_AGENT_AVATAR = "";
const AI_AGENT_COLOR = "var(--accent-secondary)";
const AI_PRESENCE_TTL_SECONDS = 60;
const AI_STATUS_TEXT_MAX_LENGTH = 140;

const designAgentPayloadSchema = z.object({
  prompt: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
});

type DesignStatusPhase = "start" | "processing" | "complete" | "error";
type DesignStatusEvent = {
  type: "design-agent-status";
  phase: DesignStatusPhase;
  message: string;
  runId: string;
  step: number;
  totalSteps: number;
  timestamp: string;
};

type LiveblocksApiError = {
  message?: string;
  status?: number;
};

const ARCHITECTURE_LAYERS = [
  {
    id: "client",
    label: "Client layer",
    x: 120,
    color: "success",
  },
  {
    id: "frontend",
    label: "Frontend / UI",
    x: 430,
    color: "cyan",
  },
  {
    id: "backend",
    label: "API / backend",
    x: 740,
    color: "warning",
  },
  {
    id: "execution",
    label: "Algorithm execution",
    x: 1050,
    color: "violet",
  },
  {
    id: "visualization",
    label: "Visualization",
    x: 1360,
    color: "cyan",
  },
  {
    id: "data",
    label: "Data layer",
    x: 1670,
    color: "violet",
  },
  {
    id: "operations",
    label: "Deployment / monitoring",
    x: 1980,
    color: "warning",
  },
] as const;

type ArchitectureLayerId = (typeof ARCHITECTURE_LAYERS)[number]["id"];
type LayoutTier = "main" | "support";
type PromptScope = {
  allowAiRuntime: boolean;
  allowAsyncJobs: boolean;
  allowLiveblocks: boolean;
  allowRealtimeCollaboration: boolean;
  allowTriggerDev: boolean;
  isAlgorithmVisualizer: boolean;
};

const MAIN_AXIS_Y = 120;
const SUPPORT_START_Y = 275;
const SUPPORT_ROW_GAP = 124;

const LEGACY_SECTION_LABELS = [
  "input / origin",
  "trigger.dev workflows",
  "ai / runtime",
  "liveblocks realtime",
  "storage",
  "output",
] as const;

const LAYER_KEYWORDS: Record<ArchitectureLayerId, readonly string[]> = {
  client: [
    "user",
    "client",
    "browser",
    "consumer",
    "viewer",
  ],
  frontend: [
    "frontend",
    "front end",
    "ui",
    "web app",
    "react",
    "component",
    "form",
    "input",
    "request",
  ],
  backend: [
    "api",
    "gateway",
    "backend",
    "back end",
    "auth",
    "validation",
    "validate",
    "router",
    "route",
    "server",
  ],
  execution: [
    "algorithm",
    "dfs",
    "bfs",
    "sort",
    "sorting",
    "search",
    "searching",
    "tree",
    "graph",
    "dynamic programming",
    "execution",
    "executor",
    "engine",
    "step",
    "generator",
    "registry",
    "plugin",
    "module",
    "adapter",
    "schema",
  ],
  visualization: [
    "visualization",
    "visualisation",
    "renderer",
    "render",
    "canvas",
    "animation",
    "playback",
    "timeline",
    "frame",
    "state manager",
    "state machine",
    "event",
    "updates",
  ],
  data: [
    "database",
    "db",
    "postgres",
    "prisma",
    "cache",
    "redis",
    "blob",
    "object storage",
    "cdn",
    "persist",
    "settings",
    "template",
    "storage",
  ],
  operations: [
    "deployment",
    "deploy",
    "hosting",
    "monitoring",
    "observability",
    "logs",
    "metrics",
    "scaling",
    "scale",
    "alerts",
  ],
};

const PRIMARY_KEYWORDS: Record<ArchitectureLayerId, readonly string[]> = {
  client: ["user", "browser", "client"],
  frontend: ["frontend web app", "frontend", "ui", "web app"],
  backend: ["api gateway", "backend", "validation", "auth"],
  execution: ["algorithm service", "step execution engine", "algorithm registry", "plugin"],
  visualization: ["visualization state manager", "canvas renderer", "playback", "renderer"],
  data: ["database", "cache", "settings", "templates"],
  operations: ["deployment", "monitoring", "hosting", "metrics"],
};

function getLayerIndex(layerId: ArchitectureLayerId): number {
  return ARCHITECTURE_LAYERS.findIndex((layer) => layer.id === layerId);
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toSearchText(value: string): string {
  return normalizeText(value).toLowerCase();
}

function canonicalizeArchitectureLabel(label: string): string {
  const normalized = normalizeText(label);

  return normalized
    .replace(/\bApplication Programming Interface\b/gi, "API")
    .replace(/\bUser Interface\b/gi, "UI")
    .replace(/\bAuthentication\b/gi, "Auth")
    .replace(/\bDynamic Programming\b/gi, "DP");
}

function keywordScore(text: string, keywords: readonly string[]): number {
  return keywords.reduce((score, keyword) => (text.includes(keyword) ? score + 1 : score), 0);
}

function createPromptScope(prompt: string): PromptScope {
  const promptText = toSearchText(prompt);

  return {
    allowAiRuntime: /\b(ai|agent|gemini|llm|machine learning|ml model|model inference)\b/.test(promptText),
    allowAsyncJobs: /\b(queue|worker|background job|async|asynchronous|batch|scheduled|cron)\b/.test(promptText),
    allowLiveblocks: /\bliveblocks\b/.test(promptText),
    allowRealtimeCollaboration: /\b(collaboration|collaborative|presence|live cursor|multiplayer|shared room)\b/.test(promptText),
    allowTriggerDev: /\btrigger\.?dev\b/.test(promptText),
    isAlgorithmVisualizer:
      /\balgorithm/.test(promptText) ||
      /\bvisuali[sz]er\b/.test(promptText) ||
      /\b(dfs|bfs|sorting|searching|binary search|tree traversal|dynamic programming)\b/.test(promptText),
  };
}

function isDisallowedByPromptScope(node: CanvasNode, scope: PromptScope): boolean {
  const text = toSearchText(`${node.id} ${node.data.label}`);

  if (!scope.allowTriggerDev && /\btrigger\.?dev\b|\btriggerdev\b|\bdurable async workflow/.test(text)) {
    return true;
  }

  if (!scope.allowLiveblocks && /\bliveblocks\b/.test(text)) {
    return true;
  }

  if (
    !scope.allowRealtimeCollaboration &&
    /\b(presence|live cursor|cursor|room status feed|shared room|participant|collaborator|collaboration)\b/.test(text)
  ) {
    return true;
  }

  if (!scope.allowAiRuntime && /\b(gemini|llm|ai agent|ai model|model inference|language model)\b/.test(text)) {
    return true;
  }

  if (!scope.allowAsyncJobs && /\b(queue|worker service|background job|async job|scheduled task)\b/.test(text)) {
    return true;
  }

  return false;
}

function filterNodesForPromptScope(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  scope: PromptScope
): CanvasFlow {
  const scopedNodes = nodes.filter((node) => !isDisallowedByPromptScope(node, scope));
  const allowedNodeIds = new Set(scopedNodes.map((node) => node.id));
  const scopedEdges = edges.filter((edge) => allowedNodeIds.has(edge.source) && allowedNodeIds.has(edge.target));

  return {
    nodes: scopedNodes,
    edges: scopedEdges,
  };
}

function classifyNode(node: CanvasNode): ArchitectureLayerId {
  const text = toSearchText(`${node.id} ${node.data.label}`);

  let bestLayer: ArchitectureLayerId = "execution";
  let bestScore = 0;

  for (const layer of ARCHITECTURE_LAYERS) {
    const score = keywordScore(text, LAYER_KEYWORDS[layer.id]);

    if (score > bestScore) {
      bestLayer = layer.id;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestLayer : "execution";
}

function scoreNodePriority(
  node: CanvasNode,
  layerId: ArchitectureLayerId,
  edgeDegreeByNodeId: ReadonlyMap<string, number>
): number {
  const text = toSearchText(`${node.id} ${node.data.label}`);
  const degree = edgeDegreeByNodeId.get(node.id) ?? 0;
  return degree + keywordScore(text, PRIMARY_KEYWORDS[layerId]) * 5;
}

function getLayoutShape(layerId: ArchitectureLayerId, tier: LayoutTier, fallback: CanvasNodeShape): CanvasNodeShape {
  if (layerId === "client" || layerId === "operations") {
    return "pill";
  }

  if (layerId === "backend" || layerId === "execution") {
    return "hexagon";
  }

  if (layerId === "data") {
    return "cylinder";
  }

  if (fallback === "diamond" || fallback === "circle") {
    return "rectangle";
  }

  return fallback;
}

function getLayoutSize(tier: LayoutTier, shape: CanvasNodeShape, label: string): CanvasNodeSize {
  const labelBonus = Math.min(90, Math.max(0, label.length - 22) * 4);

  if (shape === "cylinder") {
    return {
      width: tier === "main" ? 220 + labelBonus : 205 + labelBonus,
      height: tier === "main" ? 150 : 132,
    };
  }

  if (shape === "hexagon") {
    return {
      width: tier === "main" ? 270 + labelBonus : 235 + labelBonus,
      height: tier === "main" ? 126 : 110,
    };
  }

  if (shape === "pill") {
    return {
      width: tier === "main" ? 260 + labelBonus : 220 + labelBonus,
      height: tier === "main" ? 92 : 76,
    };
  }

  return {
    width: tier === "main" ? 275 + labelBonus : 235 + labelBonus,
    height: tier === "main" ? 102 : 86,
  };
}

function getNodeY(tier: LayoutTier, indexWithinZone: number): number {
  if (tier === "main") {
    return MAIN_AXIS_Y;
  }

  return SUPPORT_START_Y + Math.max(0, indexWithinZone - 1) * SUPPORT_ROW_GAP;
}

function isSectionHeaderNode(node: CanvasNode): boolean {
  const id = node.id.toLowerCase();
  const label = toSearchText(node.data.label);

  return (
    id.startsWith("section-") ||
    label.startsWith("zone:") ||
    LEGACY_SECTION_LABELS.some((sectionLabel) => label === sectionLabel) ||
    ARCHITECTURE_LAYERS.some((layer) => label === layer.label.toLowerCase())
  );
}

function resolveNodeIds(nodes: CanvasNode[]): { nodes: CanvasNode[]; idRemap: Map<string, string> } {
  const usedIds = new Set<string>();
  const idRemap = new Map<string, string>();

  return {
    idRemap,
    nodes: nodes.map((node, index) => {
      const baseId = normalizeText(node.id).replace(/\s+/g, "-").toLowerCase() || `node-${index + 1}`;
      const nextId = usedIds.has(baseId) ? `${baseId}-${index + 1}` : baseId;

      usedIds.add(nextId);
      if (!idRemap.has(node.id)) {
        idRemap.set(node.id, nextId);
      }

      return {
        ...node,
        id: nextId,
      };
    }),
  };
}

function dedupeNodesByLabel(nodes: CanvasNode[]): { nodes: CanvasNode[]; idRemap: Map<string, string> } {
  const seenByLabel = new Map<string, string>();
  const idRemap = new Map<string, string>();
  const dedupedNodes: CanvasNode[] = [];

  for (const node of nodes) {
    const key = `${classifyNode(node)}:${toSearchText(node.data.label)}`;
    const existingId = seenByLabel.get(key);

    if (existingId) {
      idRemap.set(node.id, existingId);
      continue;
    }

    seenByLabel.set(key, node.id);
    idRemap.set(node.id, node.id);
    dedupedNodes.push(node);
  }

  return {
    nodes: dedupedNodes,
    idRemap,
  };
}

function remapEdgeEndpoint(edgeId: string, remap: ReadonlyMap<string, string>): string {
  return remap.get(edgeId) ?? edgeId;
}

function getEdgeLabel(edge: CanvasEdge): string {
  if (typeof edge.data?.label === "string" && edge.data.label.trim().length > 0) {
    return edge.data.label;
  }

  return typeof edge.label === "string" ? edge.label : "";
}

function inferEdgeLabel(sourceNode: CanvasNode, targetNode: CanvasNode): string {
  const sourceLayer = classifyNode(sourceNode);
  const targetLayer = classifyNode(targetNode);
  const sourceText = toSearchText(sourceNode.data.label);
  const targetText = toSearchText(targetNode.data.label);

  if (targetText.includes("registry") || targetText.includes("plugin")) {
    return "route algorithm";
  }

  if (targetText.includes("step") || targetText.includes("execution") || targetText.includes("engine")) {
    return "generate steps";
  }

  if (targetText.includes("schema") || targetText.includes("adapter")) {
    return "normalize events";
  }

  if (targetText.includes("visualization") || targetText.includes("state")) {
    return "build state";
  }

  if (targetText.includes("canvas") || targetText.includes("renderer") || targetText.includes("playback")) {
    return "render updates";
  }

  if (targetText.includes("database") || targetText.includes("cache") || targetText.includes("settings")) {
    return "persist state";
  }

  if (targetText.includes("monitor") || targetText.includes("log") || targetText.includes("metric")) {
    return "emit metrics";
  }

  if (sourceLayer === "client" && targetLayer === "frontend") {
    return "user action";
  }

  if (sourceLayer === "frontend" && targetLayer === "backend") {
    return "submit request";
  }

  if (sourceLayer === "backend" && targetLayer === "execution") {
    return "validate input";
  }

  if (sourceLayer === "execution" && targetLayer === "visualization") {
    return "step sequence";
  }

  if (sourceLayer === "visualization" && targetLayer === "frontend") {
    return "render updates";
  }

  if (sourceText.includes("settings") || sourceText.includes("template")) {
    return "load settings";
  }

  return "data flow";
}

function normalizeGeneratedEdges(edges: CanvasEdge[], nodes: CanvasNode[]): CanvasEdge[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const seenEdgeKeys = new Set<string>();
  const usedEdgeIds = new Set<string>();
  const normalizedEdges: CanvasEdge[] = [];

  for (const [index, edge] of edges.entries()) {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);

    if (
      !sourceNode ||
      !targetNode ||
      sourceNode.id === targetNode.id ||
      isSectionHeaderNode(sourceNode) ||
      isSectionHeaderNode(targetNode)
    ) {
      continue;
    }

    const edgeKey = `${sourceNode.id}->${targetNode.id}`;
    if (seenEdgeKeys.has(edgeKey)) {
      continue;
    }

    seenEdgeKeys.add(edgeKey);
    const sourceLayer = classifyNode(sourceNode);
    const targetLayer = classifyNode(targetNode);
    const isForwardEdge = getLayerIndex(sourceLayer) <= getLayerIndex(targetLayer);
    const isSameLayerEdge = sourceLayer === targetLayer;
    const existingLabel = normalizeText(getEdgeLabel(edge));
    const label = existingLabel || inferEdgeLabel(sourceNode, targetNode);
    const baseEdgeId = edge.id || `edge-${sourceNode.id}-${targetNode.id}`;
    const edgeId = usedEdgeIds.has(baseEdgeId) ? `${baseEdgeId}-${index + 1}` : baseEdgeId;

    usedEdgeIds.add(edgeId);
    normalizedEdges.push({
      ...edge,
      id: edgeId,
      source: sourceNode.id,
      target: targetNode.id,
      sourceHandle: isSameLayerEdge ? "bottom-source" : isForwardEdge ? "right-source" : "left-source",
      targetHandle: isSameLayerEdge ? "top-target" : isForwardEdge ? "left-target" : "right-target",
      type: "canvasEdge",
      label,
      data: {
        ...(edge.data ?? {}),
        label,
      },
    });
  }

  return normalizedEdges;
}

type CanonicalNodeBlueprint = {
  id: string;
  label: string;
  layerId: ArchitectureLayerId;
  shape: CanvasNodeShape;
  keywords: readonly string[];
};

const ALGORITHM_VISUALIZER_BACKBONE = [
  {
    id: "user-browser",
    label: "User / Browser",
    layerId: "client",
    shape: "pill",
    keywords: ["user", "browser", "client"],
  },
  {
    id: "frontend-web-app",
    label: "Frontend Web App",
    layerId: "frontend",
    shape: "rectangle",
    keywords: ["frontend", "front end", "web app"],
  },
  {
    id: "backend-api",
    label: "API Gateway / Backend",
    layerId: "backend",
    shape: "hexagon",
    keywords: ["api", "backend", "gateway"],
  },
  {
    id: "algorithm-service",
    label: "Algorithm Service / Plugin Registry",
    layerId: "execution",
    shape: "hexagon",
    keywords: ["algorithm service", "algorithm registry", "plugin"],
  },
  {
    id: "step-execution-engine",
    label: "Step Execution Engine",
    layerId: "execution",
    shape: "hexagon",
    keywords: ["step execution", "step generator", "execution engine"],
  },
  {
    id: "visualization-state-manager",
    label: "Visualization State Manager",
    layerId: "visualization",
    shape: "rectangle",
    keywords: ["visualization state", "state manager", "step schema"],
  },
  {
    id: "canvas-renderer",
    label: "Canvas Renderer / Playback UI",
    layerId: "visualization",
    shape: "rectangle",
    keywords: ["canvas renderer", "playback", "renderer"],
  },
  {
    id: "database-cache",
    label: "Database / Cache",
    layerId: "data",
    shape: "cylinder",
    keywords: ["database", "cache", "settings", "templates"],
  },
  {
    id: "deployment-monitoring",
    label: "Deployment / Monitoring",
    layerId: "operations",
    shape: "pill",
    keywords: ["deployment", "monitoring", "hosting", "metrics"],
  },
] as const satisfies readonly CanonicalNodeBlueprint[];

const ALGORITHM_VISUALIZER_BACKBONE_EDGES = [
  { source: "user-browser", target: "frontend-web-app", label: "user action" },
  { source: "frontend-web-app", target: "backend-api", label: "submit request" },
  { source: "backend-api", target: "algorithm-service", label: "validate input" },
  { source: "algorithm-service", target: "step-execution-engine", label: "load plugin" },
  { source: "step-execution-engine", target: "visualization-state-manager", label: "generate steps" },
  { source: "visualization-state-manager", target: "canvas-renderer", label: "build state" },
  { source: "canvas-renderer", target: "frontend-web-app", label: "render updates" },
  { source: "backend-api", target: "database-cache", label: "persist settings" },
  { source: "backend-api", target: "deployment-monitoring", label: "emit metrics" },
] as const;

function getLayerColor(layerId: ArchitectureLayerId): CanvasNodeColorKey {
  return (ARCHITECTURE_LAYERS.find((layer) => layer.id === layerId)?.color ?? "cyan") as CanvasNodeColorKey;
}

function findMatchingNodeId(nodes: CanvasNode[], keywords: readonly string[]): string | null {
  for (const node of nodes) {
    const text = toSearchText(`${node.id} ${node.data.label}`);
    if (keywords.some((keyword) => text.includes(keyword))) {
      return node.id;
    }
  }

  return null;
}

function createCanonicalNode(blueprint: CanonicalNodeBlueprint): CanvasNode {
  return {
    id: blueprint.id,
    type: "canvasNode",
    position: {
      x: 0,
      y: 0,
    },
    data: {
      label: blueprint.label,
      color: getLayerColor(blueprint.layerId),
      shape: blueprint.shape,
      size: getLayoutSize("main", blueprint.shape, blueprint.label),
    },
  };
}

function ensureAlgorithmVisualizerBackbone(flow: CanvasFlow, scope: PromptScope): CanvasFlow {
  if (!scope.isAlgorithmVisualizer) {
    return flow;
  }

  const nodes = [...flow.nodes];
  const canonicalIdByBlueprintId = new Map<string, string>();

  for (const blueprint of ALGORITHM_VISUALIZER_BACKBONE) {
    const existingId = findMatchingNodeId(nodes, blueprint.keywords);

    if (existingId) {
      canonicalIdByBlueprintId.set(blueprint.id, existingId);
      continue;
    }

    nodes.push(createCanonicalNode(blueprint));
    canonicalIdByBlueprintId.set(blueprint.id, blueprint.id);
  }

  const edgeKeys = new Set(flow.edges.map((edge) => `${edge.source}->${edge.target}`));
  const edges = [...flow.edges];

  for (const edge of ALGORITHM_VISUALIZER_BACKBONE_EDGES) {
    const source = canonicalIdByBlueprintId.get(edge.source);
    const target = canonicalIdByBlueprintId.get(edge.target);

    if (!source || !target || edgeKeys.has(`${source}->${target}`)) {
      continue;
    }

    edgeKeys.add(`${source}->${target}`);
    edges.push({
      id: `edge-${source}-${target}`,
      source,
      target,
      type: "canvasEdge",
      label: edge.label,
      data: {
        label: edge.label,
      },
    });
  }

  return {
    nodes,
    edges,
  };
}

function normalizeGeneratedFlow(flow: CanvasFlow, prompt: string): CanvasFlow {
  const scope = createPromptScope(prompt);
  const nonHeaderNodes = flow.nodes
    .filter((node) => !isSectionHeaderNode(node))
    .map((node) => ({
      ...node,
      type: "canvasNode" as const,
      data: {
        ...node.data,
        label: canonicalizeArchitectureLabel(node.data.label || "Untitled step"),
      },
    }));
  const scopedFlow = ensureAlgorithmVisualizerBackbone(
    filterNodesForPromptScope(nonHeaderNodes, flow.edges, scope),
    scope
  );

  const resolved = resolveNodeIds(scopedFlow.nodes);
  const idResolvedEdges = scopedFlow.edges.map((edge) => ({
    ...edge,
    source: remapEdgeEndpoint(edge.source, resolved.idRemap),
    target: remapEdgeEndpoint(edge.target, resolved.idRemap),
  }));
  const deduped = dedupeNodesByLabel(resolved.nodes);
  const remappedEdges = idResolvedEdges.map((edge) => ({
    ...edge,
    source: remapEdgeEndpoint(edge.source, deduped.idRemap),
    target: remapEdgeEndpoint(edge.target, deduped.idRemap),
  }));
  const edgeDegreeByNodeId = new Map<string, number>();

  for (const edge of remappedEdges) {
    edgeDegreeByNodeId.set(edge.source, (edgeDegreeByNodeId.get(edge.source) ?? 0) + 1);
    edgeDegreeByNodeId.set(edge.target, (edgeDegreeByNodeId.get(edge.target) ?? 0) + 1);
  }

  const nodesByLayer = new Map<ArchitectureLayerId, CanvasNode[]>(
    ARCHITECTURE_LAYERS.map((layer) => [layer.id, []])
  );

  for (const node of deduped.nodes) {
    nodesByLayer.get(classifyNode(node))?.push(node);
  }

  const layoutNodes: CanvasNode[] = [];

  for (const layer of ARCHITECTURE_LAYERS) {
    const layerNodes = [...(nodesByLayer.get(layer.id) ?? [])].sort((firstNode, secondNode) => {
      const firstScore = scoreNodePriority(firstNode, layer.id, edgeDegreeByNodeId);
      const secondScore = scoreNodePriority(secondNode, layer.id, edgeDegreeByNodeId);

      if (firstScore !== secondScore) {
        return secondScore - firstScore;
      }

      return firstNode.data.label.localeCompare(secondNode.data.label);
    });

    layerNodes.forEach((node, indexWithinLayer) => {
      const tier: LayoutTier = indexWithinLayer === 0 ? "main" : "support";
      const shape = getLayoutShape(layer.id, tier, node.data.shape);
      const label = normalizeText(node.data.label);

      layoutNodes.push({
        ...node,
        position: {
          x: layer.x,
          y: getNodeY(tier, indexWithinLayer),
        },
        data: {
          ...node.data,
          label,
          color: getLayerColor(layer.id),
          shape,
          size: getLayoutSize(tier, shape, label),
        },
      });
    });
  }

  const normalizedEdges = normalizeGeneratedEdges(remappedEdges, layoutNodes);

  return {
    nodes: layoutNodes,
    edges: normalizedEdges,
  };
}

function setFlowStorage(storageRoot: unknown, nextFlow: CanvasFlow): void {
  const root = storageRoot as {
    set: (key: string, value: unknown) => void;
  };

  root.set("flow", {
    nodes: nextFlow.nodes,
    edges: nextFlow.edges,
  });
}

function parseFlowPayload(rawStorage: unknown): CanvasFlow {
  const flowCandidate =
    rawStorage && typeof rawStorage === "object" && "flow" in rawStorage
      ? (rawStorage as { flow?: unknown }).flow
      : null;

  const parsed = canvasFlowSchema.safeParse(
    flowCandidate ?? {
      nodes: [],
      edges: [],
    }
  );

  if (!parsed.success) {
    return {
      nodes: [],
      edges: [],
    };
  }

  return parsed.data;
}

async function buildGeneratedFlow(
  prompt: string,
  currentFlow: CanvasFlow
): Promise<CanvasFlow> {
  const apiKey =
    process.env.GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Set GOOGLE_API_KEY, GEMINI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY."
    );
  }

  const google = createGoogleGenerativeAI({ apiKey });
  const currentGraph = JSON.stringify(
    {
      nodes: currentFlow.nodes.map((node) => ({
        id: node.id,
        type: node.type ?? "canvasNode",
        position: node.position,
        data: node.data,
      })),
      edges: currentFlow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type ?? "canvasEdge",
        label: edge.data?.label ?? edge.label ?? "",
      })),
    },
    null,
    2
  );

  const systemPrompt = [
    "You are a system-design canvas generator.",
    "Return one complete canvas graph object that matches the schema exactly.",
    'Always return a JSON object with two keys: "nodes" and "edges".',
    'Each node must have id, type="canvasNode", position {x,y}, and data {label,color,shape,size}.',
    'Each edge must have id, source, target, and type="canvasEdge". Optional label should be mirrored in data.label.',
    "Only use supported colors: cyan, violet, success, warning.",
    "Only use supported shapes: rectangle, diamond, circle, pill, cylinder, hexagon.",
    "Design a clean, tree-like left-to-right architecture diagram, not a mind map.",
    "Use one dominant hierarchy: User/Browser -> Frontend/UI -> API/Backend -> Algorithm Execution -> Visualization -> Data -> Deployment.",
    "If the request is for an algorithm visualizer, center the design on request intake, validation/routing, an algorithm registry or plugin interface, a step execution engine, a standard step/event schema, visualization state, canvas playback, and optional persisted settings/templates.",
    "Show extensibility with one concise registry/plugin/schema concept so new algorithms can be added without rewriting the UI.",
    "Do not add decorative section header pills or category chips.",
    "Do not include Trigger.dev, Liveblocks, Gemini, AI-agent runtime, collaboration presence, live cursors, room feeds, queues, or workers unless the user explicitly asks for those technologies or capabilities.",
    "Use queues/workers only when the request requires async or background jobs.",
    "Keep labels short, readable, and specific. Every edge must include a short data.label describing the interaction.",
    "Use edge labels like user action, submit request, validate input, route algorithm, generate steps, build state, render updates, persist settings, and emit metrics.",
    "Prefer 7 to 12 meaningful nodes, reduce duplicate concepts, and avoid unnecessary cross-links.",
    "Do not add markdown, explanations, or code fences.",
  ].join("\n");

  const userPrompt = [
    "User request:",
    prompt,
    "",
    "Current canvas state JSON:",
    currentGraph,
    "",
    "Generate the full updated canvas graph in one response.",
  ].join("\n");

  const result = await generateText({
    model: google("gemini-2.5-flash"),
    temperature: 0.2,
    system: systemPrompt,
    prompt: userPrompt,
    output: Output.object({
      schema: canvasFlowSchema,
    }),
  });

  return normalizeGeneratedFlow(result.output, prompt);
}

async function broadcastStatus(
  roomId: string,
  runId: string,
  phase: DesignStatusPhase,
  message: string,
  step: number,
  totalSteps: number
): Promise<void> {
  const event: DesignStatusEvent = {
    type: "design-agent-status",
    phase,
    message,
    runId,
    step,
    totalSteps,
    timestamp: new Date().toISOString(),
  };

  await getLiveblocksClient().broadcastEvent(roomId, event);
  await publishAiStatus(roomId, {
    active: phase === "start" || phase === "processing",
    text: message,
  });
}

function isFeedAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const typedError = error as LiveblocksApiError;
  if (typedError.status === 409) {
    return true;
  }

  return (typedError.message ?? "").toLowerCase().includes("already exists");
}

async function ensureAiStatusFeed(roomId: string): Promise<void> {
  try {
    await getLiveblocksClient().createFeed({
      roomId,
      feedId: AI_STATUS_FEED_ID,
      metadata: {
        name: "AI Status",
      },
    });
  } catch (error) {
    if (!isFeedAlreadyExistsError(error)) {
      throw error;
    }
  }
}

function normalizeAiStatusText(text: string | undefined): string | undefined {
  if (typeof text !== "string") {
    return undefined;
  }

  const normalized = normalizeText(text);
  if (normalized.length <= AI_STATUS_TEXT_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, AI_STATUS_TEXT_MAX_LENGTH - 3).trimEnd()}...`;
}

async function publishAiStatus(roomId: string, payload: AiStatusFeedMessage): Promise<void> {
  const normalizedPayload: AiStatusFeedMessage = {
    ...payload,
    text: normalizeAiStatusText(payload.text),
  };
  const parsedPayload = aiStatusFeedMessageSchema.safeParse(normalizedPayload);

  if (!parsedPayload.success) {
    console.warn("Skipping invalid AI status payload.", parsedPayload.error.flatten());
    return;
  }

  try {
    await ensureAiStatusFeed(roomId);
    await getLiveblocksClient().createFeedMessage({
      roomId,
      feedId: AI_STATUS_FEED_ID,
      data: parsedPayload.data,
    });
  } catch (error) {
    console.warn("Failed to publish AI status feed message.", error);
  }
}

async function setAgentPresence(
  roomId: string,
  presence: { cursor: { x: number; y: number } | null; thinking: boolean }
): Promise<void> {
  await getLiveblocksClient().setPresence(roomId, {
    userId: AI_AGENT_USER_ID,
    data: presence,
    userInfo: {
      name: AI_AGENT_NAME,
      avatar: AI_AGENT_AVATAR,
      color: AI_AGENT_COLOR,
    },
    ttl: AI_PRESENCE_TTL_SECONDS,
  });
}

export const designAgent = schemaTask({
  id: "design-agent",
  description:
    "Gemini-powered collaborative design agent that generates a full canvas graph and writes it once to Liveblocks.",
  schema: designAgentPayloadSchema,
  maxDuration: 1800,
  run: async (payload, { ctx }) => {
    const runId = ctx.run.id;

    await setAgentPresence(payload.roomId, {
      cursor: { x: 320, y: 240 },
      thinking: true,
    });
    await broadcastStatus(payload.roomId, runId, "start", "Nexus AI started designing the canvas.", 0, 1);

    try {
      await prisma.taskRun.upsert({
        where: {
          runId,
        },
        create: {
          runId,
          projectId: payload.projectId,
          userId: payload.userId,
        },
        update: {
          projectId: payload.projectId,
          userId: payload.userId,
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      console.warn("Failed to persist design-agent task run metadata.", error);
    }

    try {
      const storage = await getLiveblocksClient().getStorageDocument(payload.roomId, "json");
      const currentFlow = parseFlowPayload(storage);

      await broadcastStatus(
        payload.roomId,
        runId,
        "processing",
        "Nexus AI is generating a complete updated architecture graph.",
        1,
        1
      );

      const generatedFlow = await buildGeneratedFlow(payload.prompt, currentFlow);

      await getLiveblocksClient().mutateStorage(payload.roomId, ({ root }) => {
        setFlowStorage(root, generatedFlow);
      });

      await setAgentPresence(payload.roomId, {
        cursor: null,
        thinking: false,
      });
      await broadcastStatus(
        payload.roomId,
        runId,
        "complete",
        `Nexus AI finished. Wrote ${generatedFlow.nodes.length} nodes and ${generatedFlow.edges.length} edges.`,
        1,
        1
      );

      return {
        status: "completed",
        runId,
        roomId: payload.roomId,
        prompt: payload.prompt,
        nodeCount: generatedFlow.nodes.length,
        edgeCount: generatedFlow.edges.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown design-agent failure.";

      await setAgentPresence(payload.roomId, {
        cursor: null,
        thinking: false,
      });
      await broadcastStatus(payload.roomId, runId, "error", `Nexus AI failed: ${errorMessage}`, 0, 1);

      throw error;
    }
  },
});
