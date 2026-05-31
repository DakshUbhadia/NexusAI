import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { NoObjectGeneratedError, generateObject, generateText } from "ai";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { liveblocks } from "../lib/liveblocks";
import {
  CANVAS_COLOR_PALETTE,
  CANVAS_SHAPE_SIZE_MAP,
  DEFAULT_NODE_COLOR_KEY,
  canvasFlowSchema,
  canvasNodeColorKeySchema,
  canvasNodeShapeSchema,
  getCanvasNodeSize,
  type CanvasEdge,
  type CanvasFlow,
  type CanvasNode,
  type CanvasNodeColorKey,
  type CanvasNodeShape,
} from "../types/canvas";

const AI_AGENT_USER_ID = "nexus-ai-agent";
const AI_AGENT_NAME = "Nexus AI";
const AI_AGENT_AVATAR = "";
const AI_AGENT_COLOR = "var(--accent-secondary)";
const AI_PRESENCE_TTL_SECONDS = 60;
const STREAM_DELAY_MS = 280;
const NODE_SPACING_X = 260;
const NODE_SPACING_Y = 180;
const MAX_LAYOUT_COLUMNS = 4;
const MAX_ACTION_COUNT = 24;

const designAgentPayloadSchema = z.object({
  prompt: z.string().trim().min(1),
  roomId: z.string().trim().min(1),
});

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const sizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

const addNodeActionSchema = z.object({
  kind: z.literal("add_node"),
  label: z.string().trim().min(1),
  shape: canvasNodeShapeSchema.optional(),
  color: canvasNodeColorKeySchema.optional(),
  position: positionSchema.optional(),
  size: sizeSchema.optional(),
});

const moveNodeActionSchema = z.object({
  kind: z.literal("move_node"),
  nodeId: z.string().trim().min(1),
  position: positionSchema,
});

const resizeNodeActionSchema = z.object({
  kind: z.literal("resize_node"),
  nodeId: z.string().trim().min(1),
  size: sizeSchema,
});

const updateNodeDataActionSchema = z.object({
  kind: z.literal("update_node_data"),
  nodeId: z.string().trim().min(1),
  label: z.string().trim().min(1).optional(),
  shape: canvasNodeShapeSchema.optional(),
  color: canvasNodeColorKeySchema.optional(),
  size: sizeSchema.optional(),
});

const deleteNodeActionSchema = z.object({
  kind: z.literal("delete_node"),
  nodeId: z.string().trim().min(1),
});

const addEdgeActionSchema = z.object({
  kind: z.literal("add_edge"),
  sourceId: z.string().trim().min(1).optional(),
  sourceLabel: z.string().trim().min(1).optional(),
  targetId: z.string().trim().min(1).optional(),
  targetLabel: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1).optional(),
}).superRefine((value, ctx) => {
  if (!value.sourceId && !value.sourceLabel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "add_edge requires sourceId or sourceLabel.",
    });
  }

  if (!value.targetId && !value.targetLabel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "add_edge requires targetId or targetLabel.",
    });
  }
});

const deleteEdgeActionSchema = z
  .object({
    kind: z.literal("delete_edge"),
    edgeId: z.string().trim().min(1).optional(),
    sourceId: z.string().trim().min(1).optional(),
    targetId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.edgeId && !(value.sourceId && value.targetId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "delete_edge requires edgeId or both sourceId and targetId.",
      });
    }
  });

const designActionSchema = z.discriminatedUnion("kind", [
  addNodeActionSchema,
  moveNodeActionSchema,
  resizeNodeActionSchema,
  updateNodeDataActionSchema,
  deleteNodeActionSchema,
  addEdgeActionSchema,
  deleteEdgeActionSchema,
]);

const designPlanSchema = z.object({
  summary: z.string().optional(),
  actions: z.array(designActionSchema).min(1).max(MAX_ACTION_COUNT),
});

type DesignAction = z.infer<typeof designActionSchema>;
type DesignPlan = z.infer<typeof designPlanSchema>;
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

type ApplyActionResult = {
  changed: boolean;
  message: string;
  cursor: { x: number; y: number } | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

function normalizePosition(position: { x: number; y: number }): { x: number; y: number } {
  return {
    x: snap(position.x, 8),
    y: snap(position.y, 8),
  };
}

function normalizeSize(
  shape: CanvasNodeShape,
  size?: { width: number; height: number }
): { width: number; height: number } {
  const shapeDefaults = CANVAS_SHAPE_SIZE_MAP[shape];
  if (!size) {
    return getCanvasNodeSize(shape);
  }

  return {
    width: snap(clamp(size.width, shapeDefaults.width * 0.65, shapeDefaults.width * 2.3), 2),
    height: snap(clamp(size.height, shapeDefaults.height * 0.65, shapeDefaults.height * 2.3), 2),
  };
}

function createNodeId(label: string, sequence: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30);

  return `${slug || "node"}-${Date.now()}-${sequence}`;
}

function getNextLayoutPosition(nodes: readonly CanvasNode[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 180, y: 120 };
  }

  const index = nodes.length;
  const col = index % MAX_LAYOUT_COLUMNS;
  const row = Math.floor(index / MAX_LAYOUT_COLUMNS);

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));

  return normalizePosition({
    x: minX + col * NODE_SPACING_X,
    y: minY + row * NODE_SPACING_Y,
  });
}

function getCanvasCenter(nodes: readonly CanvasNode[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 320, y: 240 };
  }

  const xValues = nodes.map((node) => node.position.x + node.data.size.width / 2);
  const yValues = nodes.map((node) => node.position.y + node.data.size.height / 2);

  const x = xValues.reduce((sum, value) => sum + value, 0) / xValues.length;
  const y = yValues.reduce((sum, value) => sum + value, 0) / yValues.length;

  return normalizePosition({ x, y });
}

function resolveColor(color?: CanvasNodeColorKey): CanvasNodeColorKey {
  if (color && color in CANVAS_COLOR_PALETTE) {
    return color;
  }

  return DEFAULT_NODE_COLOR_KEY;
}

function resolveShape(shape?: CanvasNodeShape): CanvasNodeShape {
  return shape ?? "rectangle";
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

function applyAction(flow: CanvasFlow, action: DesignAction, sequence: number): ApplyActionResult {
  if (action.kind === "add_node") {
    const shape = resolveShape(action.shape);
    const size = normalizeSize(shape, action.size);
    const position = action.position
      ? normalizePosition(action.position)
      : getNextLayoutPosition(flow.nodes);

    const node: CanvasNode = {
      id: createNodeId(action.label, sequence),
      type: "canvasNode",
      position,
      data: {
        label: action.label,
        color: resolveColor(action.color),
        shape,
        size,
      },
    };

    flow.nodes = [...flow.nodes, node];
    return {
      changed: true,
      message: `Added node "${node.data.label}".`,
      cursor: {
        x: node.position.x + node.data.size.width / 2,
        y: node.position.y + node.data.size.height / 2,
      },
    };
  }

  if (action.kind === "move_node") {
    const index = flow.nodes.findIndex((node) => node.id === action.nodeId);
    if (index < 0) {
      return { changed: false, message: `Skipped move: node "${action.nodeId}" not found.`, cursor: null };
    }

    const node = flow.nodes[index];
    const nextNode: CanvasNode = {
      ...node,
      position: normalizePosition(action.position),
    };

    flow.nodes = flow.nodes.map((existing, nodeIndex) => (nodeIndex === index ? nextNode : existing));
    return {
      changed: true,
      message: `Moved node "${nextNode.data.label || nextNode.id}".`,
      cursor: {
        x: nextNode.position.x + nextNode.data.size.width / 2,
        y: nextNode.position.y + nextNode.data.size.height / 2,
      },
    };
  }

  if (action.kind === "resize_node") {
    const index = flow.nodes.findIndex((node) => node.id === action.nodeId);
    if (index < 0) {
      return { changed: false, message: `Skipped resize: node "${action.nodeId}" not found.`, cursor: null };
    }

    const node = flow.nodes[index];
    const size = normalizeSize(node.data.shape, action.size);
    const nextNode: CanvasNode = {
      ...node,
      data: {
        ...node.data,
        size,
      },
    };

    flow.nodes = flow.nodes.map((existing, nodeIndex) => (nodeIndex === index ? nextNode : existing));
    return {
      changed: true,
      message: `Resized node "${nextNode.data.label || nextNode.id}".`,
      cursor: {
        x: nextNode.position.x + nextNode.data.size.width / 2,
        y: nextNode.position.y + nextNode.data.size.height / 2,
      },
    };
  }

  if (action.kind === "update_node_data") {
    const index = flow.nodes.findIndex((node) => node.id === action.nodeId);
    if (index < 0) {
      return { changed: false, message: `Skipped update: node "${action.nodeId}" not found.`, cursor: null };
    }

    const node = flow.nodes[index];
    const nextShape = action.shape ?? node.data.shape;
    const baseSize = action.size ?? node.data.size;
    const nextNode: CanvasNode = {
      ...node,
      data: {
        ...node.data,
        label: action.label ?? node.data.label,
        color: resolveColor(action.color ?? node.data.color),
        shape: nextShape,
        size: normalizeSize(nextShape, baseSize),
      },
    };

    flow.nodes = flow.nodes.map((existing, nodeIndex) => (nodeIndex === index ? nextNode : existing));
    return {
      changed: true,
      message: `Updated node "${nextNode.data.label || nextNode.id}".`,
      cursor: {
        x: nextNode.position.x + nextNode.data.size.width / 2,
        y: nextNode.position.y + nextNode.data.size.height / 2,
      },
    };
  }

  if (action.kind === "delete_node") {
    const target = flow.nodes.find((node) => node.id === action.nodeId);
    if (!target) {
      return { changed: false, message: `Skipped delete: node "${action.nodeId}" not found.`, cursor: null };
    }

    flow.nodes = flow.nodes.filter((node) => node.id !== action.nodeId);
    flow.edges = flow.edges.filter((edge) => edge.source !== action.nodeId && edge.target !== action.nodeId);

    return {
      changed: true,
      message: `Deleted node "${target.data.label || target.id}".`,
      cursor: getCanvasCenter(flow.nodes),
    };
  }

  if (action.kind === "add_edge") {
    const source = resolveEdgeEndpointByIdOrLabel(
      flow.nodes,
      action.sourceId,
      action.sourceLabel
    );
    const target = resolveEdgeEndpointByIdOrLabel(
      flow.nodes,
      action.targetId,
      action.targetLabel
    );

    if (!source || !target) {
      return {
        changed: false,
        message: "Skipped edge: source or target node was not found.",
        cursor: null,
      };
    }

    const existingEdge = flow.edges.find(
      (edge) => edge.source === source.id && edge.target === target.id
    );
    if (existingEdge) {
      return {
        changed: false,
        message: `Skipped edge: connection "${source.id} -> ${target.id}" already exists.`,
        cursor: {
          x: (source.position.x + target.position.x) / 2,
          y: (source.position.y + target.position.y) / 2,
        },
      };
    }

    const nextEdge: CanvasEdge = {
      id: `edge-${source.id}-${target.id}-${Date.now()}-${sequence}`,
      source: source.id,
      target: target.id,
      type: "canvasEdge",
      label: action.label,
      data: action.label ? { label: action.label } : undefined,
    };

    flow.edges = [...flow.edges, nextEdge];

    return {
      changed: true,
      message: `Connected "${source.data.label || source.id}" to "${target.data.label || target.id}".`,
      cursor: {
        x: (source.position.x + target.position.x) / 2,
        y: (source.position.y + target.position.y) / 2,
      },
    };
  }

  const candidateEdge =
    action.edgeId
      ? flow.edges.find((edge) => edge.id === action.edgeId)
      : flow.edges.find(
          (edge) => edge.source === action.sourceId && edge.target === action.targetId
        );

  if (!candidateEdge) {
    return {
      changed: false,
      message: "Skipped edge delete: no matching edge found.",
      cursor: null,
    };
  }

  flow.edges = flow.edges.filter((edge) => edge.id !== candidateEdge.id);
  const sourceNode = flow.nodes.find((node) => node.id === candidateEdge.source);
  const targetNode = flow.nodes.find((node) => node.id === candidateEdge.target);

  return {
    changed: true,
    message: "Deleted edge.",
    cursor:
      sourceNode && targetNode
        ? {
            x: (sourceNode.position.x + targetNode.position.x) / 2,
            y: (sourceNode.position.y + targetNode.position.y) / 2,
          }
        : getCanvasCenter(flow.nodes),
  };
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

  await liveblocks.broadcastEvent(roomId, event);
}

async function setAgentPresence(
  roomId: string,
  presence: { cursor: { x: number; y: number } | null; thinking: boolean }
): Promise<void> {
  await liveblocks.setPresence(roomId, {
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

function parseFlowPayload(rawStorage: unknown): CanvasFlow {
  const flowCandidate =
    rawStorage &&
    typeof rawStorage === "object" &&
    "flow" in rawStorage
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

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function parsePositionValue(value: unknown): { x: number; y: number } | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const x = toNumberValue(record.x);
  const y = toNumberValue(record.y);

  if (x === undefined || y === undefined) {
    return undefined;
  }

  return { x, y };
}

function parseSizeValue(value: unknown): { width: number; height: number } | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const width = toNumberValue(record.width);
  const height = toNumberValue(record.height);

  if (width === undefined || height === undefined || width <= 0 || height <= 0) {
    return undefined;
  }

  return { width, height };
}

function normalizeActionKind(raw: string): string {
  return raw.toLowerCase().replace(/[\s-]+/g, "_");
}

function resolveEdgeEndpointByIdOrLabel(
  nodes: readonly CanvasNode[],
  id: string | undefined,
  label: string | undefined
): CanvasNode | undefined {
  if (id) {
    const byId = nodes.find((node) => node.id === id);
    if (byId) {
      return byId;
    }
  }

  if (!label) {
    return undefined;
  }

  const normalized = label.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return nodes.find((node) => node.data.label.trim().toLowerCase() === normalized);
}

function parseActionCandidate(candidate: unknown): DesignAction | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const kindRaw = toStringValue(record.kind ?? record.action ?? record.type ?? record.op);
  if (!kindRaw) {
    return null;
  }

  const kind = normalizeActionKind(kindRaw);
  const nodeId = toStringValue(record.nodeId ?? record.id ?? record.node_id ?? record.node);
  const position = parsePositionValue(record.position) ?? parsePositionValue({ x: record.x, y: record.y });
  const size = parseSizeValue(record.size) ?? parseSizeValue({ width: record.width, height: record.height });
  const label = toStringValue(record.label ?? record.name ?? record.title ?? record.text);
  const sourceId = toStringValue(record.sourceId ?? record.source ?? record.from ?? record.sourceNodeId);
  const targetId = toStringValue(record.targetId ?? record.target ?? record.to ?? record.targetNodeId);
  const sourceLabel = toStringValue(record.sourceLabel ?? record.sourceName ?? record.fromLabel);
  const targetLabel = toStringValue(record.targetLabel ?? record.targetName ?? record.toLabel);
  const edgeId = toStringValue(record.edgeId ?? record.edge_id ?? record.id);
  const shapeCandidate = toStringValue(record.shape);
  const colorCandidate = toStringValue(record.color);
  const parsedShape = shapeCandidate ? canvasNodeShapeSchema.safeParse(shapeCandidate) : null;
  const parsedColor = colorCandidate ? canvasNodeColorKeySchema.safeParse(colorCandidate) : null;
  const shape = parsedShape?.success ? parsedShape.data : undefined;
  const color = parsedColor?.success ? parsedColor.data : undefined;

  if (kind === "add_node" || kind === "create_node" || kind === "new_node" || kind === "insert_node") {
    if (!label) {
      return null;
    }

    return {
      kind: "add_node",
      label,
      shape,
      color,
      position,
      size,
    };
  }

  if (kind === "move_node" || kind === "position_node" || kind === "relocate_node") {
    if (!nodeId || !position) {
      return null;
    }

    return {
      kind: "move_node",
      nodeId,
      position,
    };
  }

  if (kind === "resize_node" || kind === "scale_node") {
    if (!nodeId || !size) {
      return null;
    }

    return {
      kind: "resize_node",
      nodeId,
      size,
    };
  }

  if (kind === "update_node_data" || kind === "update_node" || kind === "edit_node") {
    if (!nodeId) {
      return null;
    }

    if (!label && !shape && !color && !size) {
      return null;
    }

    return {
      kind: "update_node_data",
      nodeId,
      label,
      shape,
      color,
      size,
    };
  }

  if (kind === "delete_node" || kind === "remove_node") {
    if (!nodeId) {
      return null;
    }

    return {
      kind: "delete_node",
      nodeId,
    };
  }

  if (kind === "add_edge" || kind === "connect_nodes" || kind === "create_edge") {
    if (!sourceId && !sourceLabel) {
      return null;
    }

    if (!targetId && !targetLabel) {
      return null;
    }

    return {
      kind: "add_edge",
      sourceId,
      sourceLabel,
      targetId,
      targetLabel,
      label,
    };
  }

  if (kind === "delete_edge" || kind === "remove_edge" || kind === "disconnect_nodes") {
    if (!edgeId && !(sourceId && targetId)) {
      return null;
    }

    return {
      kind: "delete_edge",
      edgeId,
      sourceId,
      targetId,
    };
  }

  return null;
}

function extractJsonValue(text: string): unknown {
  const fencedJson = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedJson?.[1]) {
    try {
      return JSON.parse(fencedJson[1]);
    } catch {
      // continue to generic extraction
    }
  }

  const objectStart = text.indexOf("{");
  if (objectStart < 0) {
    return null;
  }

  let depth = 0;
  for (let index = objectStart; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const candidate = text.slice(objectStart, index + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function parsePlanFromUnknown(payload: unknown): DesignPlan | null {
  const root =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const actionContainer = root
    ? root.actions ?? root.plan ?? root.steps ?? payload
    : payload;
  const actionCandidates = Array.isArray(actionContainer) ? actionContainer : [];
  const actions: DesignAction[] = actionCandidates
    .map((candidate) => parseActionCandidate(candidate))
    .filter((candidate): candidate is DesignAction => candidate !== null)
    .slice(0, MAX_ACTION_COUNT);

  if (actions.length === 0) {
    return null;
  }

  return {
    summary: toStringValue(root?.summary),
    actions,
  };
}

function buildHeuristicPlan(prompt: string, currentFlow: CanvasFlow): DesignPlan {
  const normalizedPrompt = prompt.toLowerCase();
  const actions: DesignAction[] = [];
  const shouldSeedNewGraph = currentFlow.nodes.length === 0;

  if (!shouldSeedNewGraph) {
    return {
      summary: "Heuristic fallback update plan.",
      actions: [
        {
          kind: "add_node",
          label: "Architecture Update",
          shape: "rectangle",
          color: "cyan",
        },
      ],
    };
  }

  const nodeCatalog: Array<{ key: string; label: string; shape: CanvasNodeShape; color: CanvasNodeColorKey }> = [
    { key: "gateway", label: "Chat API Gateway", shape: "pill", color: "cyan" },
    { key: "websocket", label: "WebSocket Server", shape: "rectangle", color: "violet" },
    { key: "presence", label: "Presence Service", shape: "rectangle", color: "success" },
    { key: "db", label: "Message History DB", shape: "cylinder", color: "warning" },
    { key: "pubsub", label: "Redis Pub/Sub", shape: "hexagon", color: "cyan" },
    { key: "media", label: "S3 Media Bucket", shape: "circle", color: "violet" },
  ];

  const include = (key: string): boolean => {
    if (key === "gateway") {
      return true;
    }

    if (key === "websocket") {
      return /websocket|socket|live messaging|real.?time/.test(normalizedPrompt);
    }

    if (key === "presence") {
      return /presence|online users|user status/.test(normalizedPrompt);
    }

    if (key === "db") {
      return /database|db|postgres|mysql|relational|message history/.test(normalizedPrompt);
    }

    if (key === "pubsub") {
      return /redis|pub.?sub|queue|horizontal/.test(normalizedPrompt);
    }

    if (key === "media") {
      return /s3|bucket|media|attachment|upload/.test(normalizedPrompt);
    }

    return false;
  };

  const selectedNodes = nodeCatalog.filter((node) => include(node.key));
  for (const node of selectedNodes) {
    actions.push({
      kind: "add_node",
      label: node.label,
      shape: node.shape,
      color: node.color,
    });
  }

  const has = (label: string): boolean => selectedNodes.some((node) => node.label === label);
  if (has("Chat API Gateway") && has("WebSocket Server")) {
    actions.push({
      kind: "add_edge",
      sourceLabel: "Chat API Gateway",
      targetLabel: "WebSocket Server",
      label: "upgrade auth",
    });
  }
  if (has("WebSocket Server") && has("Presence Service")) {
    actions.push({
      kind: "add_edge",
      sourceLabel: "WebSocket Server",
      targetLabel: "Presence Service",
      label: "presence heartbeat",
    });
  }
  if (has("WebSocket Server") && has("Redis Pub/Sub")) {
    actions.push({
      kind: "add_edge",
      sourceLabel: "WebSocket Server",
      targetLabel: "Redis Pub/Sub",
      label: "fan-out events",
    });
  }
  if (has("Redis Pub/Sub") && has("WebSocket Server")) {
    actions.push({
      kind: "add_edge",
      sourceLabel: "Redis Pub/Sub",
      targetLabel: "WebSocket Server",
      label: "incoming messages",
    });
  }
  if (has("Chat API Gateway") && has("Message History DB")) {
    actions.push({
      kind: "add_edge",
      sourceLabel: "Chat API Gateway",
      targetLabel: "Message History DB",
      label: "persist history",
    });
  }
  if (has("Chat API Gateway") && has("S3 Media Bucket")) {
    actions.push({
      kind: "add_edge",
      sourceLabel: "Chat API Gateway",
      targetLabel: "S3 Media Bucket",
      label: "store attachments",
    });
  }

  return {
    summary: "Heuristic fallback architecture plan.",
    actions: actions.slice(0, MAX_ACTION_COUNT),
  };
}

async function buildPlan(prompt: string, currentFlow: CanvasFlow): Promise<DesignPlan> {
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
  const shapeList = canvasNodeShapeSchema.options.join(", ");
  const colorList = canvasNodeColorKeySchema.options.join(", ");
  const currentGraph = JSON.stringify(
    {
      nodes: currentFlow.nodes.map((node) => ({
        id: node.id,
        label: node.data.label,
        shape: node.data.shape,
        color: node.data.color,
        position: node.position,
        size: node.data.size,
      })),
      edges: currentFlow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.data?.label ?? edge.label ?? "",
      })),
    },
    null,
    2
  );

  const systemPrompt = [
    "You are a collaborative architecture canvas planner.",
    "Return actions that strictly follow the provided schema.",
    `Allowed node shapes: ${shapeList}.`,
    `Allowed node colors: ${colorList}.`,
    "Do not invent shape or color values outside the allowed list.",
    "Respect spacing: keep at least 180px vertical and 240px horizontal distance between newly added nodes.",
    "For edge actions, you may reference nodes by sourceId/targetId or sourceLabel/targetLabel.",
    "Only reference existing node IDs from the provided canvas when moving/resizing/updating/deleting nodes.",
    "Do not emit no-op actions.",
  ].join("\n");
  const userPrompt = [
    "User prompt:",
    prompt,
    "",
    "Current canvas state (JSON):",
    currentGraph,
    "",
    "Produce compact, deterministic actions for the requested architecture changes.",
  ].join("\n");

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: designPlanSchema,
      temperature: 0.2,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return object;
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) {
      throw error;
    }

    console.warn("Primary structured plan generation failed. Falling back to text recovery.", {
      message: error.message,
      finishReason: error.finishReason,
    });

    const fallbackTextFromError = typeof error.text === "string" ? error.text : "";
    const recoveredFromError = parsePlanFromUnknown(extractJsonValue(fallbackTextFromError));
    if (recoveredFromError && recoveredFromError.actions.length > 0) {
      return recoveredFromError;
    }

    const fallbackResponse = await generateText({
      model: google("gemini-2.5-flash"),
      temperature: 0.1,
      system: [
        systemPrompt,
        "Respond with JSON only.",
        `The top-level JSON must be: {"summary": string, "actions": DesignAction[]}.`,
      ].join("\n"),
      prompt: userPrompt,
    });

    const recoveredFromText = parsePlanFromUnknown(extractJsonValue(fallbackResponse.text));
    if (recoveredFromText && recoveredFromText.actions.length > 0) {
      return recoveredFromText;
    }

    const heuristicPlan = buildHeuristicPlan(prompt, currentFlow);
    if (heuristicPlan.actions.length > 0) {
      return heuristicPlan;
    }

    throw new Error("Unable to generate a valid design plan from model output.");
  }
}

export const designAgent = schemaTask({
  id: "design-agent",
  description:
    "Gemini-powered collaborative design agent that mutates Liveblocks canvas state and publishes shared status.",
  schema: designAgentPayloadSchema,
  maxDuration: 1800,
  run: async (payload, { ctx }) => {
    const runId = ctx.run.id;

    await setAgentPresence(payload.roomId, {
      cursor: { x: 320, y: 240 },
      thinking: true,
    });
    await broadcastStatus(payload.roomId, runId, "start", "Nexus AI started designing the canvas.", 0, 0);

    try {
      const storage = await liveblocks.getStorageDocument(payload.roomId, "json");
      const flow = parseFlowPayload(storage);
      const workingFlow: CanvasFlow = {
        nodes: [...flow.nodes],
        edges: [...flow.edges],
      };

      await broadcastStatus(
        payload.roomId,
        runId,
        "processing",
        "Nexus AI is interpreting your prompt and preparing canvas actions.",
        0,
        0
      );

      const plan = await buildPlan(payload.prompt, workingFlow);
      const totalSteps = plan.actions.length;
      let appliedSteps = 0;

      for (const [index, action] of plan.actions.entries()) {
        const step = index + 1;
        const result = applyAction(workingFlow, action, step);

        if (!result.changed) {
          await broadcastStatus(payload.roomId, runId, "processing", result.message, step, totalSteps);
          continue;
        }

        await liveblocks.mutateStorage(payload.roomId, ({ root }) => {
          setFlowStorage(root, workingFlow);
        });

        appliedSteps += 1;
        await setAgentPresence(payload.roomId, {
          cursor: result.cursor,
          thinking: true,
        });
        await broadcastStatus(payload.roomId, runId, "processing", result.message, step, totalSteps);
        await sleep(STREAM_DELAY_MS);
      }

      await setAgentPresence(payload.roomId, {
        cursor: null,
        thinking: false,
      });
      await broadcastStatus(
        payload.roomId,
        runId,
        "complete",
        `Nexus AI finished. Applied ${appliedSteps} canvas updates.`,
        totalSteps,
        totalSteps
      );

      return {
        status: "completed",
        runId,
        roomId: payload.roomId,
        prompt: payload.prompt,
        planSummary: plan.summary ?? null,
        totalActions: plan.actions.length,
        appliedActions: appliedSteps,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown design-agent failure.";

      await setAgentPresence(payload.roomId, {
        cursor: null,
        thinking: false,
      });
      await broadcastStatus(
        payload.roomId,
        runId,
        "error",
        `Nexus AI failed: ${errorMessage}`,
        0,
        0
      );

      throw error;
    }
  },
});
