import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import {
  ExtractedIntentSchema,
  type ExtractedIntent,
  type FeeScenario,
  type HabimetroEstimate,
  type PulppoBroker,
  type TriageRoute,
  type ZoneInfo,
} from "@/lib/shared/schemas";
import {
  FIXTURES,
  TUHABI_BUYBOX,
  ZONE_RISK_TABLE,
  findBrokers,
  lookupHabimetro,
  resolveZone,
  tierForValue,
} from "@/lib/shared/mocks-prisma";
import { computeFeeScenarios, formatMXN } from "@/lib/shared/fees";
import { generateVoiceIntro } from "@/lib/elevenlabs";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { DRAFT_REPLY_PROMPTS, EXTRACT_INTENT_PROMPT } from "./prompts-prisma";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// ----- Tool definitions for the main agent's tool-use loop -----

export const TOOL_DEFINITIONS_TRIAGE: Anthropic.Messages.Tool[] = [
  {
    name: "extract_intent",
    description:
      "Parse the seller's WhatsApp opener (Mexican Spanish). Returns structured intent: colonia, propertyType, urgencyScore (0-100), motivationTags, sizeM2, bedrooms, mentionedPriceMXN.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The raw WhatsApp opener text in es-MX." },
      },
      required: ["text"],
    },
  },
  {
    name: "lookup_zone_risk",
    description:
      "Resolve a colonia or city name to ZoneInfo. Returns { colonia, state, stateCode, lat, lng, riskTier (1-5), avgDoMDays, slug }. Use the returned slug for lookup_habimetro.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Colonia or city name (e.g. 'Roma Norte', 'Ecatepec')." },
      },
      required: ["query"],
    },
  },
  {
    name: "lookup_habimetro",
    description:
      "Get the deterministic Habímetro estimate for a property. Returns { valueMXN, low, high, confidence }.",
    input_schema: {
      type: "object",
      properties: {
        zoneSlug: {
          type: "string",
          description: "Zone slug returned by lookup_zone_risk (e.g. 'roma-norte').",
        },
        propertyType: {
          type: "string",
          enum: ["departamento", "casa", "terreno", "other"],
        },
        sizeM2: { type: "number" },
      },
      required: ["zoneSlug", "propertyType"],
    },
  },
  {
    name: "check_buybox",
    description:
      "Check Tuhabi iBuyer buybox eligibility. Returns { eligible: boolean, reason?: 'above_4M_ceiling' | 'below_500K_floor' | 'state_not_covered' | 'risk_tier_X' }.",
    input_schema: {
      type: "object",
      properties: {
        valueMXN: { type: "number" },
        stateCode: { type: "string", description: "Two-to-six char state code (e.g. 'CDMX', 'EDOMEX', 'OAX')." },
        riskTier: { type: "number" },
      },
      required: ["valueMXN", "stateCode", "riskTier"],
    },
  },
  {
    name: "find_brokers",
    description:
      "Find Pulppo brokers in a state matching a price tier. Returns up to 3 PulppoBroker objects.",
    input_schema: {
      type: "object",
      properties: {
        stateCode: { type: "string" },
        tier: { type: "string", enum: ["value", "mid", "luxury"] },
      },
      required: ["stateCode", "tier"],
    },
  },
  {
    name: "compute_fee_scenarios",
    description:
      "Compute 1-3 FeeScenarios (iBuyer / Pulppo / Nurture). Each has { route, estimatedTimeDays, estimatedGrossMXN, feeKind, feePct, netToSellerMXN, tradeoff, recommended }. Exactly one has recommended:true.",
    input_schema: {
      type: "object",
      properties: {
        habimetroValueMXN: { type: "number" },
        zone: { type: "object" },
        urgencyScore: { type: "number" },
        buyboxFit: {
          type: "object",
          properties: {
            eligible: { type: "boolean" },
            reason: { type: "string" },
          },
          required: ["eligible"],
        },
        matchedBrokers: { type: "array" },
      },
      required: ["habimetroValueMXN", "zone", "urgencyScore", "buyboxFit", "matchedBrokers"],
    },
  },
  {
    name: "draft_reply",
    description:
      "Generate a Mexican Spanish WhatsApp reply (≤220 chars) tailored to the chosen route. Returns { text }.",
    input_schema: {
      type: "object",
      properties: {
        chosenRoute: { type: "string", enum: ["iBuyer", "Pulppo", "Nurture"] },
        colonia: { type: "string" },
        valueMXN: { type: "number", description: "Habímetro estimate (for Nurture)." },
        netMXN: { type: "number", description: "Net to seller from the recommended scenario." },
        days: { type: "number", description: "Estimated time to close." },
        brokerName: { type: "string", description: "For Pulppo route." },
        brokerClosings: { type: "number", description: "For Pulppo route." },
        reason: { type: "string", description: "For Nurture route — the buybox-fail reason." },
      },
      required: ["chosenRoute", "colonia"],
    },
  },
  {
    name: "generate_voice_reply",
    description:
      "Generate Mexican Spanish MP3 audio from the reply text via ElevenLabs. Returns { audioUrl, voiceId }. If audioUrl is null, do NOT retry — continue.",
    input_schema: {
      type: "object",
      properties: {
        script: { type: "string", description: "Same text as draft_reply output." },
        slug: { type: "string", description: "Slug provided in the user message — use it exactly." },
      },
      required: ["script", "slug"],
    },
  },
  {
    name: "persist_triage",
    description:
      "Persist the lead + decision to Supabase. MUST be called last. Returns { ok, leadId, decisionId }.",
    input_schema: {
      type: "object",
      properties: {
        // Lead fields
        opener_text: { type: "string" },
        fixture_id: { type: "string" },
        zone_slug: { type: "string" },
        property_type: { type: "string" },
        size_m2: { type: "number" },
        bedrooms: { type: "number" },
        urgency_score: { type: "number" },
        motivation_tags: { type: "array", items: { type: "string" } },
        inferred_price_mxn: { type: "number" },
        // Decision fields
        chosen_route: { type: "string", enum: ["iBuyer", "Pulppo", "Nurture"] },
        reason: { type: "string" },
        scenarios: { type: "array" },
        reply_text: { type: "string" },
        reply_audio_url: { type: "string" },
        reply_voice_id: { type: "string" },
        brokers: { type: "array" },
      },
      required: [
        "opener_text",
        "zone_slug",
        "property_type",
        "urgency_score",
        "chosen_route",
        "reason",
        "scenarios",
        "reply_text",
      ],
    },
  },
];

export interface TriageToolContext {
  anthropicClient: Anthropic;
  slug: string;
  source: "web" | "make" | "test";
}

export interface PersistResult {
  ok: boolean;
  leadId?: string;
  decisionId?: string;
  error?: string;
}

export async function runToolPrisma(
  name: string,
  input: Record<string, unknown>,
  ctx: TriageToolContext
): Promise<unknown> {
  switch (name) {
    case "extract_intent":
      return await extractIntent(String(input.text ?? ""), ctx.anthropicClient);
    case "lookup_zone_risk":
      return lookupZoneRiskTool(String(input.query ?? ""));
    case "lookup_habimetro":
      return lookupHabimetroTool(
        input as { zoneSlug: string; propertyType: string; sizeM2?: number }
      );
    case "check_buybox":
      return checkBuyboxTool(
        input as { valueMXN: number; stateCode: string; riskTier: number }
      );
    case "find_brokers":
      return findBrokers(
        String(input.stateCode ?? ""),
        (String(input.tier ?? "mid") as "value" | "mid" | "luxury")
      );
    case "compute_fee_scenarios":
      return computeFeeScenarios(
        input as unknown as Parameters<typeof computeFeeScenarios>[0]
      );
    case "draft_reply":
      return await draftReply(input, ctx.anthropicClient);
    case "generate_voice_reply":
      return await generateVoiceIntro({
        script: String(input.script ?? ""),
        slug: String(input.slug ?? ctx.slug),
        voiceId:
          process.env.ELEVENLABS_VOICE_ID_MX || process.env.ELEVENLABS_VOICE_ID,
      });
    case "persist_triage":
      return await persistTriage(input, ctx);
    default:
      return { error: `unknown_tool:${name}` };
  }
}

// ----- Implementations -----

async function extractIntent(
  text: string,
  client: Anthropic
): Promise<ExtractedIntent | { error: string }> {
  if (!text.trim()) return { error: "empty_text" };
  const prompt = EXTRACT_INTENT_PROMPT.replace("{TEXT}", text);
  try {
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content.find(
      (c): c is Anthropic.Messages.TextBlock => c.type === "text"
    );
    if (!block?.text) return { error: "no_text_block" };
    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "no_json_in_response", raw: block.text } as { error: string };
    const parsedRaw = JSON.parse(jsonMatch[0]);
    const validated = ExtractedIntentSchema.safeParse(parsedRaw);
    if (!validated.success) {
      // Return loose object so the main agent can still proceed.
      return {
        ...parsedRaw,
        _validation_warning: validated.error.flatten(),
      };
    }
    return validated.data;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "extract_failed" };
  }
}

function lookupZoneRiskTool(query: string): (ZoneInfo & { slug: string }) | { error: string } {
  const zone = resolveZone(query);
  if (!zone) return { error: `no_zone_match:${query}` };
  // Find the slug for this zone in the table.
  const slug =
    Object.keys(ZONE_RISK_TABLE).find((k) => ZONE_RISK_TABLE[k] === zone) ??
    query.toLowerCase().replace(/\s+/g, "-");
  return { ...zone, slug };
}

function lookupHabimetroTool(args: {
  zoneSlug: string;
  propertyType: string;
  sizeM2?: number;
}): HabimetroEstimate | { error: string } {
  const result = lookupHabimetro(args.zoneSlug, args.propertyType, args.sizeM2);
  if (!result) {
    return { error: `no_habimetro_for:${args.zoneSlug}:${args.propertyType}` };
  }
  return result;
}

function checkBuyboxTool(args: {
  valueMXN: number;
  stateCode: string;
  riskTier: number;
}): { eligible: boolean; reason?: string } {
  const inBand =
    args.valueMXN >= TUHABI_BUYBOX.minMXN && args.valueMXN <= TUHABI_BUYBOX.maxMXN;
  const inCoverage = (TUHABI_BUYBOX.coveredStates as readonly string[]).includes(
    args.stateCode
  );
  const lowRisk = args.riskTier <= TUHABI_BUYBOX.maxRiskTier;
  if (inBand && inCoverage && lowRisk) return { eligible: true };
  let reason = "unknown";
  if (!inBand) {
    reason = args.valueMXN > TUHABI_BUYBOX.maxMXN ? "above_4M_ceiling" : "below_500K_floor";
  } else if (!inCoverage) {
    reason = "state_not_covered";
  } else if (!lowRisk) {
    reason = `risk_tier_${args.riskTier}`;
  }
  return { eligible: false, reason };
}

async function draftReply(
  input: Record<string, unknown>,
  client: Anthropic
): Promise<{ text: string } | { error: string }> {
  const route = String(input.chosenRoute) as TriageRoute;
  const colonia = String(input.colonia ?? "");
  let prompt: string;
  if (route === "iBuyer") {
    prompt = DRAFT_REPLY_PROMPTS.iBuyer({
      colonia,
      days: Number(input.days ?? 10),
      netMXN: formatMXN(Number(input.netMXN ?? 0)),
    });
  } else if (route === "Pulppo") {
    prompt = DRAFT_REPLY_PROMPTS.Pulppo({
      colonia,
      brokerName: String(input.brokerName ?? "un asesor"),
      brokerClosings: Number(input.brokerClosings ?? 10),
      netMXN: formatMXN(Number(input.netMXN ?? 0)),
      days: Number(input.days ?? 45),
    });
  } else {
    prompt = DRAFT_REPLY_PROMPTS.Nurture({
      colonia,
      valueMXN: formatMXN(Number(input.valueMXN ?? 0)),
      reason: String(input.reason ?? "fuera de cobertura"),
    });
  }
  try {
    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content.find(
      (c): c is Anthropic.Messages.TextBlock => c.type === "text"
    );
    const text = block?.text?.trim() ?? "";
    if (!text) return { error: "empty_reply" };
    return { text };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "draft_failed" };
  }
}

async function persistTriage(
  input: Record<string, unknown>,
  ctx: TriageToolContext
): Promise<PersistResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const zoneSlug = String(input.zone_slug ?? "");
  const zone = ZONE_RISK_TABLE[zoneSlug];
  if (!zone) {
    return { ok: false, error: `unknown_zone_slug:${zoneSlug}` };
  }
  const propertyType = String(input.property_type ?? "");
  const sizeM2 = input.size_m2 != null ? Number(input.size_m2) : undefined;
  const habimetro =
    lookupHabimetro(zoneSlug, propertyType, sizeM2) ??
    ({ valueMXN: 0, low: 0, high: 0, confidence: "low", source: "mock" } as HabimetroEstimate);

  // Insert lead
  const { data: leadRow, error: leadErr } = await supabase
    .from("leads")
    .insert({
      opener_text: String(input.opener_text ?? ""),
      fixture_id: input.fixture_id ? String(input.fixture_id) : null,
      location: zone,
      habimetro,
      urgency_score: Number(input.urgency_score ?? 0),
      motivation_tags: Array.isArray(input.motivation_tags)
        ? (input.motivation_tags as string[])
        : [],
      inferred_price: input.inferred_price_mxn != null ? Number(input.inferred_price_mxn) : null,
      source: ctx.source,
    })
    .select("id")
    .single();
  if (leadErr) return { ok: false, error: `lead_insert: ${leadErr.message}` };

  // Insert decision
  const { data: decRow, error: decErr } = await supabase
    .from("triage_decisions")
    .insert({
      lead_id: leadRow.id,
      chosen_route: String(input.chosen_route ?? ""),
      reason: String(input.reason ?? ""),
      scenarios: input.scenarios ?? [],
      reply_text: input.reply_text ? String(input.reply_text) : null,
      reply_audio_url: input.reply_audio_url ? String(input.reply_audio_url) : null,
      reply_voice_id: input.reply_voice_id ? String(input.reply_voice_id) : null,
      brokers: input.brokers ?? [],
    })
    .select("id")
    .single();
  if (decErr) return { ok: false, error: `decision_insert: ${decErr.message}` };

  return { ok: true, leadId: leadRow.id, decisionId: decRow.id };
}

// Helper exported for run-triage.ts to look up fixture text when only fixtureId is given.
export function fixtureTextById(fixtureId: string | undefined): string | undefined {
  if (!fixtureId) return undefined;
  return FIXTURES[fixtureId]?.text;
}

// Re-exported for run-triage.ts convenience.
export { tierForValue, type PulppoBroker, type FeeScenario };
