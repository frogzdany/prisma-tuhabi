"use client";

import {
  ReactFlow,
  Background,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Box, Dialog, HStack, Portal, Stack, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import type { TraceEvent } from "@/components/agent-trace/TraceRow";
import { Icon } from "@/components/icon/Icon";

// 9-tool agent chain visualized as a React Flow graph.
// Layout: 3 rows × 3 cols, snake order so edges stay simple (straight LR/RL
// horizontals + 2 vertical connectors between rows).
//   0 1 2
//   5 4 3   ← row reversed for the snake
//   6 7 8
// Icons stay visible at every status; status is conveyed via border color +
// a small corner badge (check when done, ! when error).

type IntegrationKind = "model" | "data" | "internal";

interface ToolMeta {
  icon: string;
  /** Seller-facing label (default). */
  label: string;
  /** Seller-facing description, plain language. */
  hintSeller: string;
  /** Technical hint shown when "Detalles técnicos" is on. */
  hint: string;
  /** Short provider/integration label shown as a chip on the node when technical mode is on. */
  provider: string;
  /** model = LLM/voice/db API · data = external data source · internal = in-process logic. */
  kind: IntegrationKind;
}

const TOOL_META: Record<string, ToolMeta> = {
  extract_intent: {
    icon: "chat",
    label: "Entiende tu mensaje",
    hintSeller: "Lee tu situación y entiende qué necesitas.",
    hint: "Claude Haiku parsea es-MX",
    provider: "Anthropic",
    kind: "model",
  },
  lookup_zone_risk: {
    icon: "pin_drop",
    label: "Analiza tu zona",
    hintSeller: "Revisa el contexto y demanda de tu colonia.",
    hint: "Capa de riesgo zonal INEGI",
    provider: "INEGI",
    kind: "data",
  },
  lookup_habimetro: {
    icon: "request_quote",
    label: "Estima el valor de tu propiedad",
    hintSeller: "Calcula un precio justo de mercado para tu casa.",
    hint: "Tuhabi Habímetro · valuación interna",
    provider: "Tuhabi",
    kind: "data",
  },
  check_buybox: {
    icon: "fact_check",
    label: "Verifica si calificas con Tuhabi",
    hintSeller: "Compara tu propiedad con los criterios de compra Tuhabi.",
    hint: "500K–4M · riesgo ≤3 · 11 estados",
    provider: "interno",
    kind: "internal",
  },
  find_brokers: {
    icon: "support_agent",
    label: "Busca asesores expertos",
    hintSeller: "Selecciona asesores con experiencia en tu zona.",
    hint: "CRM Pulppo · por estado + tier",
    provider: "Pulppo",
    kind: "data",
  },
  compute_fee_scenarios: {
    icon: "balance",
    label: "Compara tus opciones",
    hintSeller: "Tres rutas posibles: venta rápida, asesor o esperar.",
    hint: "iBuyer / Pulppo / Nurture",
    provider: "interno",
    kind: "internal",
  },
  draft_reply: {
    icon: "edit_note",
    label: "Prepara tu respuesta",
    hintSeller: "Redacta el mensaje que vas a recibir por WhatsApp.",
    hint: "Claude Haiku · es-MX · ≤220 chars",
    provider: "Anthropic",
    kind: "model",
  },
  generate_voice_reply: {
    icon: "mic",
    label: "Genera la nota de voz",
    hintSeller: "Audio listo para escucharlo desde WhatsApp.",
    hint: "ElevenLabs eleven_multilingual_v2",
    provider: "ElevenLabs",
    kind: "model",
  },
  persist_triage: {
    icon: "bookmark_added",
    label: "Guarda tu caso",
    hintSeller: "Registra tu decisión y los siguientes pasos.",
    hint: "Supabase · leads + triage_decisions",
    provider: "Supabase",
    kind: "model",
  },
};

const TOOL_ORDER = [
  "extract_intent",
  "lookup_zone_risk",
  "lookup_habimetro",
  "check_buybox",
  "find_brokers",
  "compute_fee_scenarios",
  "draft_reply",
  "generate_voice_reply",
  "persist_triage",
];

// Snake position table — indexed by canonical tool order [0..8].
//   row 0: cols 0,1,2
//   row 1: cols 2,1,0  (snake, reversed)
//   row 2: cols 0,1,2
const COL_X = [0, 220, 440];
const ROW_Y = [0, 150, 300];
const POSITIONS: Array<{ col: 0 | 1 | 2; row: 0 | 1 | 2 }> = [
  { col: 0, row: 0 }, // extract_intent
  { col: 1, row: 0 }, // lookup_zone_risk
  { col: 2, row: 0 }, // lookup_habimetro
  { col: 2, row: 1 }, // check_buybox          ← snake turn (down)
  { col: 1, row: 1 }, // find_brokers
  { col: 0, row: 1 }, // compute_fee_scenarios
  { col: 0, row: 2 }, // draft_reply           ← snake turn (down)
  { col: 1, row: 2 }, // generate_voice_reply
  { col: 2, row: 2 }, // persist_triage
];

type StepStatus = "pending" | "running" | "done" | "error";

interface DerivedStep {
  toolName: string;
  status: StepStatus;
  durationMs?: number;
  output?: unknown;
  step?: number;
}

type ToolNodeData = {
  meta: ToolMeta;
  status: StepStatus;
  toolName: string;
  /** When true, surface tool name + provider chip; otherwise stay seller-friendly. */
  technical?: boolean;
} & Record<string, unknown>;

type EntryNodeData = {
  label: string;
  sub: string;
  icon: string;
  /** Whether the trigger has fired (i.e. agent ran via Make webhook). */
  fired?: boolean;
} & Record<string, unknown>;

type ToolNodeType = Node<ToolNodeData, "tool">;
type EntryNodeType = Node<EntryNodeData, "entry">;
type AnyFlowNode = ToolNodeType | EntryNodeType;

export interface AgentFlowProps {
  events: TraceEvent[];
  running: boolean;
}

export function AgentFlow({ events, running }: AgentFlowProps) {
  // Allow the user to collapse the heavy React Flow canvas after the run
  // completes, so they can see decision + scenarios without scrolling 600px.
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Default OFF — demo-friendly. Engineers can flip this on to see tool names,
  // provider chips, raw outputs, and the Make.com entry node.
  const [technical, setTechnical] = useState(false);

  const steps = useMemo<DerivedStep[]>(() => {
    const byTool = new Map<string, DerivedStep>();
    for (const ev of events) {
      if (!ev.name) continue;
      const prev = byTool.get(ev.name);
      if (ev.type === "tool_call") {
        byTool.set(ev.name, { toolName: ev.name, status: "running", step: ev.step });
      } else if (ev.type === "tool_result") {
        const isErrorOutput =
          ev.output && typeof ev.output === "object" && "error" in (ev.output as object);
        byTool.set(ev.name, {
          toolName: ev.name,
          status: isErrorOutput ? "error" : "done",
          durationMs: ev.durationMs,
          output: ev.output,
          step: prev?.step ?? ev.step,
        });
      } else if (ev.type === "error") {
        byTool.set(ev.name, {
          toolName: ev.name,
          status: "error",
          durationMs: ev.durationMs,
          step: prev?.step ?? ev.step,
        });
      }
    }
    return TOOL_ORDER.map(
      (toolName) => byTool.get(toolName) ?? { toolName, status: "pending" as const }
    );
  }, [events]);

  const totalMs = steps.reduce((acc, s) => acc + (s.durationMs ?? 0), 0);
  const doneCount = steps.filter((s) => s.status === "done").length;

  const phase: "idle" | "running" | "done" = running
    ? "running"
    : doneCount === TOOL_ORDER.length
    ? "done"
    : doneCount === 0
    ? "idle"
    : "running";

  const phaseLabel =
    phase === "idle"
      ? "Listo para analizar tu propiedad"
      : phase === "done"
      ? "Análisis completado"
      : `Analizando: ${
          TOOL_META[steps.find((s) => s.status === "running")?.toolName ?? ""]?.label ?? "…"
        }`;

  const phaseColor = phase === "done" ? "#34D399" : phase === "running" ? "brand.300" : "fg.muted";
  const phaseIcon = phase === "done" ? "check_circle" : phase === "running" ? "progress_activity" : "schedule";

  // Build React Flow nodes — Make.com entry node (technical only) + 9 tool nodes.
  const nodes = useMemo<AnyFlowNode[]>(() => {
    const toolNodes: AnyFlowNode[] = steps.map((step, i) => {
      const pos = POSITIONS[i];
      return {
        id: String(i),
        type: "tool",
        position: { x: COL_X[pos.col], y: ROW_Y[pos.row] },
        data: {
          meta:
            TOOL_META[step.toolName] ?? {
              icon: "circle",
              label: step.toolName,
              hintSeller: "",
              hint: "",
              provider: "?",
              kind: "internal" as IntegrationKind,
            },
          status: step.status,
          toolName: step.toolName,
          technical,
        },
        draggable: false,
        selectable: false,
      };
    });
    if (!technical) return toolNodes;
    const entryNode: EntryNodeType = {
      id: "entry-make",
      type: "entry",
      position: { x: -210, y: -10 },
      data: {
        label: "Make.com",
        sub: "webhook · trigger (opcional)",
        icon: "bolt",
        fired: false,
      },
      draggable: false,
      selectable: false,
    };
    return [entryNode, ...toolNodes];
  }, [steps, technical]);

  const edges = useMemo<Edge[]>(() => {
    // 8 connections: 0→1, 1→2, 2→3, 3→4, 4→5, 5→6, 6→7, 7→8
    // Edge style depends on source's status.
    const edgesArr: Edge[] = [];
    for (let i = 0; i < TOOL_ORDER.length - 1; i++) {
      const srcStatus = steps[i].status;
      const tgtStatus = steps[i + 1].status;
      const isCompleted = srcStatus === "done" && (tgtStatus === "done" || tgtStatus === "running");
      const isActive = srcStatus === "done" && tgtStatus === "running";
      const isError = srcStatus === "error" || tgtStatus === "error";

      const srcPos = POSITIONS[i];
      const tgtPos = POSITIONS[i + 1];

      // Pick source/target handles based on relative position.
      let sourceHandle: "right-src" | "left-src" | "bottom-src" = "right-src";
      let targetHandle: "right-tgt" | "left-tgt" | "top-tgt" = "left-tgt";

      if (srcPos.row === tgtPos.row) {
        // Horizontal — left↔right depending on direction.
        if (tgtPos.col > srcPos.col) {
          sourceHandle = "right-src";
          targetHandle = "left-tgt";
        } else {
          sourceHandle = "left-src";
          targetHandle = "right-tgt";
        }
      } else {
        // Vertical (snake turn) — always source-bottom, target-top.
        sourceHandle = "bottom-src";
        targetHandle = "top-tgt";
      }

      const color = isError
        ? "#FB7185"
        : isActive
        ? "#5EEAD4"
        : isCompleted
        ? "#34D399"
        : "#2A3754";

      edgesArr.push({
        id: `e${i}-${i + 1}`,
        source: String(i),
        target: String(i + 1),
        sourceHandle,
        targetHandle,
        type: "smoothstep",
        animated: isActive,
        style: {
          stroke: color,
          strokeWidth: 2,
          opacity: srcStatus === "pending" ? 0.45 : 1,
        },
      });
    }
    if (technical) {
      // Make.com → extract_intent — dashed, optional trigger.
      edgesArr.push({
        id: "e-entry-0",
        source: "entry-make",
        target: "0",
        sourceHandle: "right-src",
        targetHandle: "left-tgt",
        type: "smoothstep",
        animated: false,
        style: {
          stroke: "#6B7691",
          strokeWidth: 1.5,
          strokeDasharray: "5 4",
          opacity: 0.7,
        },
      });
    }
    return edgesArr;
  }, [steps, technical]);

  // Pick which step's details to surface below the flow:
  // prefer the active step, else the last completed step, else nothing.
  const focusStep =
    steps.find((s) => s.status === "running") ??
    [...steps].reverse().find((s) => s.status === "done");
  const focusMeta = focusStep ? TOOL_META[focusStep.toolName] : null;

  return (
    <Box bg="bg.surface" borderRadius="lg" borderWidth="1px" borderColor="border" boxShadow="card" overflow="hidden">
      {/* Chain header — matches AgentTimeline header */}
      <Stack
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "flex-start", md: "flex-end" }}
        px="22px"
        pt="22px"
        pb="16px"
        borderBottomWidth="1px"
        borderColor="border.soft"
        gap={3}
      >
        <Stack gap="6px">
          <Text fontSize="12px" letterSpacing="0.18em" textTransform="uppercase" color="fg.dim" fontWeight="700">
            Tu propiedad, paso a paso
          </Text>
          <HStack gap={2} fontSize="17px" color={phaseColor} fontWeight="600">
            <Icon name={phaseIcon} size={18} spin={phase === "running"} filled={phase === "done"} />
            <Text>{phaseLabel}</Text>
          </HStack>
        </Stack>
        <HStack gap="22px" align="center">
          <Counter value={totalMs} label="ms" highlight={phase} />
          <Counter value={doneCount} total={TOOL_ORDER.length} label="tools" highlight={phase} />
          <HStack gap="6px">
            {/* Technical-details toggle — off by default for demos */}
            <Box
              as="button"
              onClick={() => setTechnical((v) => !v)}
              h="32px"
              px="10px"
              borderRadius="md"
              borderWidth="1px"
              borderColor={technical ? "accent.line" : "border"}
              bg={technical ? "accent.subtle" : "bg.elevated"}
              color={technical ? "accent" : "fg.muted"}
              display="flex"
              alignItems="center"
              gap="6px"
              cursor="pointer"
              transition="all 120ms ease"
              _hover={{ bg: technical ? "accent.subtle" : "bg.subtle", color: technical ? "accent" : "fg" }}
              title="Mostrar / ocultar detalles técnicos"
              aria-pressed={technical}
            >
              <Icon name="code" size={14} />
              <Text fontSize="11px" fontWeight="600" letterSpacing="0.02em">
                Detalles técnicos
              </Text>
            </Box>
            {/* Expand into a fullscreen dialog */}
            <Box
              as="button"
              onClick={() => setExpanded(true)}
              w="32px"
              h="32px"
              borderRadius="md"
              borderWidth="1px"
              borderColor="border"
              bg="bg.elevated"
              color="fg.muted"
              display="grid"
              placeItems="center"
              cursor="pointer"
              transition="background 120ms ease, color 120ms ease"
              _hover={{ bg: "bg.subtle", color: "fg" }}
              title="Abrir cadena en pantalla completa"
              aria-label="Abrir cadena en pantalla completa"
            >
              <Icon name="open_in_full" size={16} />
            </Box>
            {/* Collapse toggle — only useful after the run completes */}
            {phase !== "idle" && (
              <Box
                as="button"
                onClick={() => setCollapsed((v) => !v)}
                w="32px"
                h="32px"
                borderRadius="md"
                borderWidth="1px"
                borderColor="border"
                bg="bg.elevated"
                color="fg.muted"
                display="grid"
                placeItems="center"
                cursor="pointer"
                transition="background 120ms ease, color 120ms ease"
                _hover={{ bg: "bg.subtle", color: "fg" }}
                title={collapsed ? "Expandir cadena" : "Plegar cadena"}
                aria-label={collapsed ? "Expandir cadena" : "Plegar cadena"}
              >
                <Icon name={collapsed ? "unfold_more" : "unfold_less"} size={18} />
              </Box>
            )}
          </HStack>
        </HStack>
      </Stack>

      {/* React Flow canvas — collapsible. Bigger by default so the snake breathes. */}
      {!collapsed && (
      <Box
        h={{ base: "440px", md: "520px" }}
        bg="bg.canvas"
        // Override React Flow default styles to match our dark theme
        css={{
          "& .react-flow__background": { background: "transparent" },
          "& .react-flow__handle": { opacity: 0, pointerEvents: "none" },
          "& .react-flow__attribution": { display: "none" },
        }}
      >
        <FlowCanvas nodes={nodes} edges={edges} interactive={false} />
      </Box>
      )}

      {/* Integration legend strip — only when canvas is visible AND tech mode on */}
      {!collapsed && technical && (
      <HStack
        px="22px"
        py="10px"
        borderTopWidth="1px"
        borderColor="border.soft"
        gap="14px"
        fontSize="10.5px"
        flexWrap="wrap"
        color="fg.dim"
      >
        <LegendDot color="var(--chakra-colors-brand-300)" border="rgba(94,234,212,0.45)" />
        <Text>Modelo / API en vivo</Text>
        <Text color="fg.faint">·</Text>
        <LegendDot color="var(--chakra-colors-pulppo-400)" border="rgba(167,139,250,0.45)" />
        <Text>Fuente de datos externa</Text>
        <Text color="fg.faint">·</Text>
        <LegendDot color="var(--chakra-colors-ink-100)" border="var(--chakra-colors-border)" />
        <Text>Lógica interna</Text>
      </HStack>
      )}

      {/* Step details strip */}
      <Box px="22px" py="14px" borderTopWidth="1px" borderColor="border.soft">
        {focusStep && focusMeta ? (
          <Stack gap="6px">
            <HStack gap="10px" align="center" flexWrap="wrap">
              <Icon
                name={focusMeta.icon}
                size={16}
                style={{ color: focusStep.status === "running" ? "var(--chakra-colors-brand-300)" : "#34D399" }}
              />
              <Text fontSize="13.5px" fontWeight="600" color="fg">
                {focusMeta.label}
              </Text>
              {technical && (
                <Text
                  fontFamily="mono"
                  fontSize="10.5px"
                  px="7px"
                  py="2.5px"
                  borderRadius="5px"
                  bg="bg.elevated"
                  borderWidth="1px"
                  borderColor="border"
                  color="fg.muted"
                >
                  {focusStep.toolName}
                </Text>
              )}
              {focusStep.durationMs != null && (
                <HStack gap={1} fontSize="11px" color="fg.dim" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <Icon name="bolt" size={12} />
                  <Text>{focusStep.durationMs} ms</Text>
                </HStack>
              )}
              {focusStep.status === "running" && (
                <HStack gap={1.5} fontSize="11px" color="brand.300">
                  <Box w="6px" h="6px" borderRadius="full" bg="brand.300" boxShadow="0 0 8px var(--chakra-colors-brand-300)" />
                  <Text>en curso</Text>
                </HStack>
              )}
            </HStack>
            <Text fontSize="12px" color="fg.muted" lineHeight="1.5">
              {technical ? focusMeta.hint : focusMeta.hintSeller}
            </Text>
            {technical && focusStep.output != null && (
              <Box
                px="9px"
                py="6px"
                bg="bg.inset"
                borderWidth="1px"
                borderColor="border.soft"
                borderRadius="6px"
                fontSize="11.5px"
                fontFamily="mono"
                color={focusStep.status === "error" ? "#FB7185" : "fg.muted"}
                lineHeight="1.5"
              >
                → {summarizeOutput(focusStep.toolName, focusStep.output)}
              </Box>
            )}
          </Stack>
        ) : (
          <HStack gap={2} fontSize="12.5px" color="fg.dim">
            <Icon name="info" size={14} />
            <Text>El detalle del paso aparecerá aquí mientras corre el agente.</Text>
          </HStack>
        )}
      </Box>

      {/* Fullscreen dialog — same canvas, way more room, fully interactive (pan + zoom). */}
      <Dialog.Root
        open={expanded}
        onOpenChange={(d) => setExpanded(d.open)}
        size="cover"
        placement="center"
      >
        <Portal>
          <Dialog.Backdrop bg="rgba(6, 9, 14, 0.78)" backdropFilter="blur(6px)" />
          <Dialog.Positioner>
            <Dialog.Content
              bg="bg.surface"
              borderWidth="1px"
              borderColor="border"
              borderRadius="lg"
              overflow="hidden"
              maxW="min(1400px, 96vw)"
              w="96vw"
              h="92vh"
              display="flex"
              flexDirection="column"
            >
              <HStack
                px="22px"
                py="14px"
                borderBottomWidth="1px"
                borderColor="border.soft"
                justify="space-between"
                align="center"
                flexShrink={0}
              >
                <Stack gap="2px">
                  <Text fontSize="10.5px" letterSpacing="0.18em" textTransform="uppercase" color="fg.dim" fontWeight="600">
                    Cadena del agente · vista expandida
                  </Text>
                  <HStack gap={2} fontSize="14px" color={phaseColor} fontWeight="500">
                    <Icon name={phaseIcon} size={16} spin={phase === "running"} filled={phase === "done"} />
                    <Text>{phaseLabel}</Text>
                  </HStack>
                </Stack>
                <HStack gap="22px" align="center">
                  <Counter value={totalMs} label="ms" highlight={phase} />
                  <Counter value={doneCount} total={TOOL_ORDER.length} label="tools" highlight={phase} />
                  <Dialog.CloseTrigger asChild>
                    <Box
                      as="button"
                      w="32px"
                      h="32px"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="border"
                      bg="bg.elevated"
                      color="fg.muted"
                      display="grid"
                      placeItems="center"
                      cursor="pointer"
                      transition="background 120ms ease, color 120ms ease"
                      _hover={{ bg: "bg.subtle", color: "fg" }}
                      title="Cerrar"
                      aria-label="Cerrar vista expandida"
                    >
                      <Icon name="close_fullscreen" size={16} />
                    </Box>
                  </Dialog.CloseTrigger>
                </HStack>
              </HStack>
              <Box
                flex="1"
                bg="bg.canvas"
                css={{
                  "& .react-flow__background": { background: "transparent" },
                  "& .react-flow__handle": { opacity: 0, pointerEvents: "none" },
                  "& .react-flow__attribution": { display: "none" },
                }}
              >
                <FlowCanvas nodes={nodes} edges={edges} interactive />
              </Box>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
}

// Shared React Flow canvas — used inline and inside the expanded dialog.
function FlowCanvas({
  nodes,
  edges,
  interactive,
}: {
  nodes: AnyFlowNode[];
  edges: Edge[];
  interactive: boolean;
}) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.15, includeHiddenNodes: false }}
      minZoom={0.4}
      maxZoom={1.8}
      panOnDrag={interactive}
      panOnScroll={interactive}
      zoomOnScroll={interactive}
      zoomOnPinch={interactive}
      zoomOnDoubleClick={interactive}
      // Let the page scroll pass through when the canvas isn't interactive,
      // so the user can wheel-scroll past the flow without it eating events.
      preventScrolling={interactive}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1F2A3F" />
    </ReactFlow>
  );
}

// ----- Custom Tool node ---------------------------------------------------

function ToolNodeComponent({ data }: NodeProps<ToolNodeType>) {
  const { meta, status, toolName, technical = false } = data;
  const isPending = status === "pending";
  const isRunning = status === "running";
  const isDone = status === "done";
  const isError = status === "error";

  const borderColor = isError
    ? "#FB7185"
    : isDone
    ? "rgba(52,211,153,0.55)"
    : isRunning
    ? "var(--chakra-colors-brand-300)"
    : "var(--chakra-colors-border)";
  const bg = isError
    ? "rgba(251,113,133,0.08)"
    : isDone
    ? "rgba(52,211,153,0.06)"
    : isRunning
    ? "rgba(94,234,212,0.08)"
    : "var(--chakra-colors-bg-elevated)";
  const iconColor = isError
    ? "#FB7185"
    : isDone
    ? "#34D399"
    : isRunning
    ? "var(--chakra-colors-brand-300)"
    : "var(--chakra-colors-fg-dim)";
  // Use ink palette directly — the semantic `fg` token resolves to an empty
  // CSS var inside React Flow nodes for some reason, so children fall back to
  // React Flow's default #222. Hardcoding the ink color sidesteps it.
  const titleColor = isPending ? "ink.100" : "ink.50";

  return (
    <Box position="relative">
      {/* Hidden handles — one per side, both source + target, so any edge can */}
      {/* attach where it needs without showing connector dots. */}
      <Handle type="target" position={Position.Left} id="left-tgt" />
      <Handle type="source" position={Position.Left} id="left-src" />
      <Handle type="target" position={Position.Right} id="right-tgt" />
      <Handle type="source" position={Position.Right} id="right-src" />
      <Handle type="target" position={Position.Top} id="top-tgt" />
      <Handle type="source" position={Position.Bottom} id="bottom-src" />

      <Box
        w="196px"
        h="120px"
        borderRadius="14px"
        borderWidth={isRunning ? "2px" : "1px"}
        borderColor={borderColor}
        bg={bg}
        boxShadow={isRunning ? "0 0 0 4px rgba(94,234,212,0.12)" : "0 1px 0 rgba(255,255,255,0.025) inset"}
        px="14px"
        py="12px"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        transition="all 200ms ease"
        position="relative"
        animation={isRunning ? "prisma-node-pulse 1.8s ease-in-out infinite" : "none"}
        css={{
          "@keyframes prisma-node-pulse": {
            "0%, 100%": { boxShadow: "0 0 0 4px rgba(94,234,212,0.12)" },
            "50%": { boxShadow: "0 0 0 8px rgba(94,234,212,0.22)" },
          },
        }}
      >
        {/* Top row: icon + status bubble */}
        <HStack justify="space-between" align="flex-start" w="100%">
          <Box color={iconColor}>
            <Icon name={meta.icon} size={26} filled={isDone} />
          </Box>
          <StatusBubble status={status} />
        </HStack>

        {/* Middle: label — given more room when technical chips are hidden */}
        <Text
          fontSize="13.5px"
          fontWeight="700"
          color={titleColor}
          lineHeight="1.2"
          letterSpacing="-0.005em"
          flex={technical ? undefined : "1"}
          display="flex"
          alignItems={technical ? undefined : "center"}
        >
          {meta.label}
        </Text>

        {/* Bottom: tool name + provider chip — technical mode only */}
        {technical && (
          <HStack justify="space-between" align="center" gap={1} w="100%">
            <Text
              fontSize="9.5px"
              fontFamily="mono"
              color={isRunning ? "brand.300" : isDone ? "ink.100" : "ink.200"}
              letterSpacing="0"
              opacity={isPending ? 0.7 : 1}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              flex="1"
            >
              {toolName}
            </Text>
            <ProviderChip kind={meta.kind} provider={meta.provider} dimmed={isPending} />
          </HStack>
        )}
      </Box>
    </Box>
  );
}

function ProviderChip({
  kind,
  provider,
  dimmed,
}: {
  kind: IntegrationKind;
  provider: string;
  dimmed?: boolean;
}) {
  const palette =
    kind === "model"
      ? { color: "var(--chakra-colors-brand-300)", border: "rgba(94,234,212,0.45)", bg: "rgba(94,234,212,0.08)" }
      : kind === "data"
      ? { color: "var(--chakra-colors-pulppo-400)", border: "rgba(167,139,250,0.45)", bg: "rgba(167,139,250,0.08)" }
      : { color: "var(--chakra-colors-ink-100)", border: "var(--chakra-colors-border)", bg: "var(--chakra-colors-bg-subtle)" };

  return (
    <Box
      px="5px"
      py="1.5px"
      borderRadius="4px"
      borderWidth="1px"
      borderColor={palette.border}
      bg={palette.bg}
      color={palette.color}
      fontSize="8.5px"
      fontFamily="mono"
      fontWeight="500"
      letterSpacing="0.02em"
      whiteSpace="nowrap"
      opacity={dimmed ? 0.55 : 1}
      flexShrink={0}
    >
      {provider}
    </Box>
  );
}

function StatusBubble({ status }: { status: StepStatus }) {
  if (status === "pending") {
    return (
      <Box
        w="10px"
        h="10px"
        borderRadius="full"
        borderWidth="1px"
        borderColor="border.strong"
        bg="bg.subtle"
      />
    );
  }
  if (status === "running") {
    return (
      <Box position="relative" w="14px" h="14px" display="grid" placeItems="center">
        {/* outer halo — breathing */}
        <Box
          position="absolute"
          w="14px"
          h="14px"
          borderRadius="full"
          bg="rgba(94,234,212,0.35)"
          animation="prisma-bubble-halo 1.4s ease-in-out infinite"
          css={{
            "@keyframes prisma-bubble-halo": {
              "0%, 100%": { transform: "scale(0.8)", opacity: 0.7 },
              "50%": { transform: "scale(1.5)", opacity: 0 },
            },
          }}
        />
        <Box
          position="relative"
          w="9px"
          h="9px"
          borderRadius="full"
          bg="brand.300"
          boxShadow="0 0 10px var(--chakra-colors-brand-300)"
        />
      </Box>
    );
  }
  if (status === "done") {
    return (
      <Box
        w="11px"
        h="11px"
        borderRadius="full"
        bg="#34D399"
        boxShadow="0 0 8px rgba(52,211,153,0.55)"
      />
    );
  }
  // error
  return (
    <Box
      w="11px"
      h="11px"
      borderRadius="full"
      bg="#FB7185"
      boxShadow="0 0 8px rgba(251,113,133,0.55)"
    />
  );
}

// ----- Make.com entry node ------------------------------------------------

function EntryNodeComponent({ data }: NodeProps<EntryNodeType>) {
  const { label, sub, icon } = data;
  return (
    <Box position="relative">
      <Handle type="source" position={Position.Right} id="right-src" />
      <Box
        w="160px"
        h="76px"
        borderRadius="10px"
        borderWidth="1.5px"
        borderStyle="dashed"
        borderColor="#6B7691"
        bg="bg.elevated"
        boxShadow="0 1px 0 rgba(255,255,255,0.025) inset"
        px="11px"
        py="9px"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        position="relative"
      >
        <HStack justify="space-between" align="flex-start" w="100%">
          <Box color="ink.100">
            <Icon name={icon} size={18} filled />
          </Box>
          <Box
            fontSize="8.5px"
            fontFamily="mono"
            px="5px"
            py="1px"
            borderRadius="4px"
            borderWidth="1px"
            borderColor="#6B7691"
            color="ink.200"
            textTransform="uppercase"
            letterSpacing="0.06em"
          >
            entry
          </Box>
        </HStack>
        <Stack gap="1px">
          <Text fontSize="12px" fontWeight="600" color="ink.50" lineHeight="1.2">
            {label}
          </Text>
          <Text fontSize="9.5px" fontFamily="mono" color="ink.200" lineHeight="1.2">
            {sub}
          </Text>
        </Stack>
      </Box>
    </Box>
  );
}

const NODE_TYPES = { tool: ToolNodeComponent, entry: EntryNodeComponent };

function LegendDot({ color, border }: { color: string; border: string }) {
  return (
    <Box
      w="10px"
      h="10px"
      borderRadius="full"
      bg={color}
      borderWidth="1px"
      borderColor={border}
      flexShrink={0}
    />
  );
}

function Counter({
  value,
  total,
  label,
  highlight,
}: {
  value: number;
  total?: number;
  label: string;
  highlight: "idle" | "running" | "done";
}) {
  const color = highlight === "done" ? "#34D399" : highlight === "running" ? "brand.300" : "fg";
  return (
    <Stack gap={1} align="flex-end" minW="70px">
      <HStack align="baseline" gap={0}>
        <Text
          fontSize="22px"
          fontWeight="600"
          letterSpacing="-0.02em"
          lineHeight="1"
          color={color}
          fontFamily="mono"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value.toLocaleString("en-US")}
        </Text>
        {total != null && (
          <Text color="fg.dim" fontSize="14px" fontFamily="mono">
            /{total}
          </Text>
        )}
      </HStack>
      <Text fontSize="10px" letterSpacing="0.14em" textTransform="uppercase" color="fg.dim" fontWeight="500">
        {label}
      </Text>
    </Stack>
  );
}

function summarizeOutput(toolName: string, output: unknown): string {
  if (output == null || typeof output !== "object") return String(output);
  const o = output as Record<string, unknown>;
  if (o.error) return `× ${String(o.error).slice(0, 80)}`;
  switch (toolName) {
    case "extract_intent":
      return `${o.colonia ?? "?"} · urgencia ${o.urgencyScore ?? 0} · ${(o.motivationTags as string[] | undefined)?.join(", ") ?? ""}`;
    case "lookup_zone_risk":
      return `${o.colonia ?? "?"} · ${o.stateCode ?? "?"} · riesgo ${o.riskTier ?? "?"}/5 · ~${o.avgDoMDays ?? "?"}d`;
    case "lookup_habimetro": {
      const v = Number(o.valueMXN ?? 0);
      return v ? `$${v.toLocaleString("es-MX")} MXN` : JSON.stringify(o).slice(0, 80);
    }
    case "check_buybox":
      return o.eligible ? "✓ Encaja en buybox iBuyer" : `× ${String(o.reason ?? "no eligible").replace(/_/g, " ")}`;
    case "find_brokers":
      return Array.isArray(output)
        ? `${(output as unknown[]).length} asesores: ${(output as Array<{ name: string }>).map((b) => b.name).join(", ")}`
        : "0 asesores";
    case "compute_fee_scenarios":
      return Array.isArray(output)
        ? (output as Array<{ route: string; recommended: boolean }>)
            .map((s) => (s.recommended ? `★ ${s.route}` : s.route))
            .join(" · ")
        : "";
    case "draft_reply":
      return `"${String(o.text ?? "").slice(0, 100)}${String(o.text ?? "").length > 100 ? "…" : ""}"`;
    case "generate_voice_reply":
      return o.audioUrl ? `✓ Audio MX listo (${String(o.voiceId ?? "").slice(0, 8)})` : `× sin audio (${o.reason ?? "?"})`;
    case "persist_triage":
      return o.ok ? `✓ Guardado · lead ${String(o.leadId ?? "").slice(0, 8)}…` : `× ${o.error ?? "fallo"}`;
    default:
      return JSON.stringify(o).slice(0, 80);
  }
}
