import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT_TRIAGE } from "./prompts-prisma";
import {
  TOOL_DEFINITIONS_TRIAGE,
  runToolPrisma,
  type PersistResult,
  type TriageToolContext,
} from "./tools-prisma";
import {
  TriageDecisionSchema,
  type FeeScenario,
  type PulppoBroker,
  type TriageDecision,
  type WhatsAppOpener,
} from "@/lib/shared/schemas";
import { ZONE_RISK_TABLE } from "@/lib/shared/mocks-prisma";

export interface TriageTrace {
  step: number;
  type: "tool_call" | "tool_result" | "text" | "finish" | "error";
  name?: string;
  input?: unknown;
  output?: unknown;
  text?: string;
  message?: string;
  durationMs?: number;
  iteration?: number;
}

export interface TriageUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  iterations: number;
}

export interface TriageAgentResult {
  ok: boolean;
  decision?: TriageDecision;
  leadId?: string;
  decisionId?: string;
  trace: TriageTrace[];
  usage: TriageUsage;
  error?: string;
  costEstimateUSD?: number;
}

// Haiku 4.5 pricing (per million tokens, as of 2026-Q1).
const HAIKU_INPUT_USD_PER_M = 0.80;
const HAIKU_OUTPUT_USD_PER_M = 4.00;
const HAIKU_CACHE_READ_USD_PER_M = 0.08; // 90% discount on cached reads
const HAIKU_CACHE_WRITE_USD_PER_M = 1.00; // 25% premium on cache creation

const MODEL_TRIAGE = process.env.ANTHROPIC_MODEL_TRIAGE ?? "claude-haiku-4-5-20251001";
const MAX_ITERATIONS = 12;

export async function runTriageAgent({
  opener,
  source = "web",
  onTrace,
}: {
  opener: WhatsAppOpener;
  source?: "web" | "make" | "test";
  onTrace?: (event: TriageTrace) => void;
}): Promise<TriageAgentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      trace: [{ step: 0, type: "error", message: "ANTHROPIC_API_KEY not set" }],
      usage: emptyUsage(),
      error: "missing_anthropic_key",
    };
  }

  const client = new Anthropic({ apiKey });
  const trace: TriageTrace[] = [];
  const usage = emptyUsage();
  const slug = `triage-${Date.now()}`;
  const ctx: TriageToolContext = { anthropicClient: client, slug, source };

  const pushTrace = (event: Omit<TriageTrace, "step">) => {
    const ev: TriageTrace = { ...event, step: trace.length + 1 };
    trace.push(ev);
    onTrace?.(ev);
    return ev;
  };

  const userInstruction = [
    `Triage this WhatsApp opener (locale: ${opener.locale}).`,
    ``,
    `Opener:`,
    `"""`,
    opener.text,
    `"""`,
    ``,
    opener.fixtureId ? `Fixture id (carry through to persist_triage as fixture_id): ${opener.fixtureId}` : null,
    ``,
    `Slug for persistence (pass to generate_voice_reply): ${slug}`,
    ``,
    `Run the full tool sequence and persist the decision.`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: userInstruction },
  ];

  // Apply cache_control to the last tool definition so the whole tools array is cached.
  // Apply cache_control to the system prompt so it's cached too.
  const cachedTools = TOOL_DEFINITIONS_TRIAGE.map((t, idx) => {
    if (idx === TOOL_DEFINITIONS_TRIAGE.length - 1) {
      return { ...t, cache_control: { type: "ephemeral" as const } };
    }
    return t;
  });

  let finalDecision: TriageDecision | undefined;
  let leadId: string | undefined;
  let decisionId: string | undefined;
  let lastText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response: Anthropic.Messages.Message;
    try {
      response = await client.messages.create({
        model: MODEL_TRIAGE,
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT_TRIAGE,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: cachedTools,
        messages,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_anthropic_error";
      pushTrace({ type: "error", message, iteration: i });
      return {
        ok: false,
        trace,
        usage: { ...usage, iterations: i + 1 },
        error: message,
      };
    }

    // Accumulate usage.
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;
    usage.cacheReadTokens += response.usage.cache_read_input_tokens ?? 0;
    usage.cacheCreationTokens += response.usage.cache_creation_input_tokens ?? 0;
    usage.iterations = i + 1;

    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(
      (c): c is Anthropic.Messages.ToolUseBlock => c.type === "tool_use"
    );
    const textBlocks = response.content.filter(
      (c): c is Anthropic.Messages.TextBlock => c.type === "text"
    );

    for (const tb of textBlocks) {
      if (tb.text.trim()) {
        lastText = tb.text;
        pushTrace({ type: "text", text: tb.text, iteration: i });
      }
    }

    if (toolUses.length === 0) {
      pushTrace({ type: "finish", message: lastText || "done", iteration: i });
      break;
    }

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

    for (const tu of toolUses) {
      pushTrace({ type: "tool_call", name: tu.name, input: tu.input, iteration: i });
      const start = Date.now();
      let output: unknown;
      try {
        output = await runToolPrisma(
          tu.name,
          (tu.input ?? {}) as Record<string, unknown>,
          ctx
        );
      } catch (err) {
        output = { error: err instanceof Error ? err.message : "tool_threw" };
      }
      const durationMs = Date.now() - start;
      pushTrace({ type: "tool_result", name: tu.name, output, durationMs, iteration: i });

      // When persist_triage succeeds, reconstruct the canonical TriageDecision
      // from the tool's input so the API caller doesn't have to dig through trace.
      if (tu.name === "persist_triage") {
        const result = output as PersistResult;
        if (result.ok) {
          leadId = result.leadId;
          decisionId = result.decisionId;
          finalDecision = decisionFromPersistInput(
            tu.input as Record<string, unknown>,
            leadId,
            decisionId
          );
        }
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(output).slice(0, 8000),
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  const costEstimateUSD = computeCostUSD(usage);

  if (!finalDecision) {
    return {
      ok: false,
      trace,
      usage,
      costEstimateUSD,
      error: "agent_did_not_persist_decision",
    };
  }

  return {
    ok: true,
    decision: finalDecision,
    leadId,
    decisionId,
    trace,
    usage,
    costEstimateUSD,
  };
}

function decisionFromPersistInput(
  input: Record<string, unknown>,
  leadId: string | undefined,
  decisionId: string | undefined
): TriageDecision | undefined {
  // Build the decision shape from the persist input. Validation is best-effort:
  // if Zod is unhappy we still return the candidate so the demo keeps moving,
  // and log the validation error to console for debugging.
  const audioRaw = input.reply_audio_url;
  const audioUrl =
    typeof audioRaw === "string" && audioRaw.trim() ? audioRaw : null;

  const candidate = {
    leadId,
    decisionId,
    chosenRoute: input.chosen_route,
    reason: String(input.reason ?? "unknown"),
    scenarios: Array.isArray(input.scenarios) ? (input.scenarios as FeeScenario[]) : [],
    reply: {
      text: String(input.reply_text ?? ""),
      audioUrl,
      voiceId: input.reply_voice_id ? String(input.reply_voice_id) : undefined,
    },
    brokers: Array.isArray(input.brokers) ? (input.brokers as PulppoBroker[]) : [],
    persistedAt: new Date().toISOString(),
  } as TriageDecision;

  const validation = TriageDecisionSchema.safeParse(candidate);
  if (validation.success) return validation.data;

  // Soft fail: log + return the un-validated candidate so the UI still gets data.
  console.warn(
    "[triage] decision schema validation failed (returning permissive candidate):",
    JSON.stringify(validation.error.flatten())
  );
  return candidate;
}

function emptyUsage(): TriageUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    iterations: 0,
  };
}

function computeCostUSD(usage: TriageUsage): number {
  // Note: inputTokens from the SDK already EXCLUDES cached tokens.
  // (Anthropic reports input_tokens, cache_read_input_tokens, and cache_creation_input_tokens separately.)
  const cost =
    (usage.inputTokens / 1_000_000) * HAIKU_INPUT_USD_PER_M +
    (usage.outputTokens / 1_000_000) * HAIKU_OUTPUT_USD_PER_M +
    (usage.cacheReadTokens / 1_000_000) * HAIKU_CACHE_READ_USD_PER_M +
    (usage.cacheCreationTokens / 1_000_000) * HAIKU_CACHE_WRITE_USD_PER_M;
  return Number(cost.toFixed(6));
}
