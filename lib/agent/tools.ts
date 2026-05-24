import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { DealRoomSchema, type DealRoom } from "@/lib/shared/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { generateVoiceIntro } from "@/lib/elevenlabs";

const FIXTURES_DIR = path.join(process.cwd(), "fixtures", "transcripts");

// ---------- Tool input shapes (JSON Schema for Anthropic tool_use) ----------

export const TOOL_DEFINITIONS: Anthropic.Messages.Tool[] = [
  {
    name: "fetch_transcript",
    description:
      "Read a discovery-call transcript. Pass `transcriptId` to load a staged fixture (e.g. 'atlas-robotics'), OR pass `transcriptText` directly. Returns the raw transcript text.",
    input_schema: {
      type: "object",
      properties: {
        transcriptId: { type: "string", description: "Fixture id without extension." },
        transcriptText: { type: "string", description: "Inline transcript text." },
      },
    },
  },
  {
    name: "get_crm_context",
    description:
      "Look up canned CRM context for the deal (deal id, account name, prior touches). Returns null if no record. PoC stub — returns a generic enrichment shape.",
    input_schema: {
      type: "object",
      properties: { dealId: { type: "string" } },
    },
  },
  {
    name: "enrich_company",
    description:
      "Best-effort public-data enrichment for a company (industry, headcount, revenue band). PoC stub — returns canned defaults.",
    input_schema: {
      type: "object",
      properties: { companyName: { type: "string" }, domain: { type: "string" } },
      required: ["companyName"],
    },
  },
  {
    name: "write_stakeholder_page",
    description:
      "Generate the markdown body for ONE stakeholder's page. The agent should call this once per stakeholder identified from the call. Returns markdown to embed in the DealRoom.stakeholders[i].pageMarkdown field. NOTE: this is a helper for THE AGENT itself to draft a focused page — the agent may also write the markdown inline and skip this tool.",
    input_schema: {
      type: "object",
      properties: {
        persona: {
          type: "string",
          enum: ["champion", "cfo", "it", "end_user", "cmo", "legal", "other"],
        },
        stakeholderName: { type: "string" },
        stakeholderTitle: { type: "string" },
        prospectCompany: { type: "string" },
        keyPointsFromCall: {
          type: "array",
          items: { type: "string" },
          description: "3-6 short bullet points from the transcript relevant to this stakeholder.",
        },
      },
      required: ["persona", "stakeholderName", "prospectCompany", "keyPointsFromCall"],
    },
  },
  {
    name: "generate_voice_intro",
    description:
      "Generate a cloned-voice MP3 from the intro script. Returns { audioUrl, voiceId }. If credentials are missing or generation fails, returns audioUrl: null and a reason.",
    input_schema: {
      type: "object",
      properties: {
        script: { type: "string", description: "60-second intro script the AE will appear to say." },
        slug: { type: "string", description: "Deal room slug, used to namespace the audio file." },
      },
      required: ["script", "slug"],
    },
  },
  {
    name: "upsert_deal_room",
    description:
      "Persist the completed DealRoom and finish. MUST be called exactly once, last. Validates the payload against the DealRoom schema. Returns the slug + public URL.",
    input_schema: {
      type: "object",
      properties: {
        dealRoom: {
          type: "object",
          description: "Complete DealRoom matching the Zod schema (dealId, slug, companyName, championName, sellerName, sellerCompany, stakeholders[], voiceIntro, roiInputs, mutualActionPlan).",
        },
      },
      required: ["dealRoom"],
    },
  },
];

// ---------- Tool implementations ----------

export interface ToolContext {
  defaultSeller: { name: string; title?: string; company: string; avatarUrl?: string };
}

export interface UpsertResult {
  ok: boolean;
  slug?: string;
  url?: string;
  error?: string;
}

export async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  switch (name) {
    case "fetch_transcript":
      return fetchTranscript(input as { transcriptId?: string; transcriptText?: string });
    case "get_crm_context":
      return getCrmContext(input as { dealId?: string });
    case "enrich_company":
      return enrichCompany(input as { companyName: string; domain?: string });
    case "write_stakeholder_page":
      return writeStakeholderPage(input as Parameters<typeof writeStakeholderPage>[0]);
    case "generate_voice_intro":
      return await generateVoiceIntro({
        script: String(input.script ?? ""),
        slug: String(input.slug ?? "demo"),
      });
    case "upsert_deal_room":
      return await upsertDealRoom(input.dealRoom as unknown, ctx);
    default:
      return { error: `unknown_tool:${name}` };
  }
}

async function fetchTranscript({
  transcriptId,
  transcriptText,
}: {
  transcriptId?: string;
  transcriptText?: string;
}): Promise<{ transcript: string; source: string }> {
  if (transcriptText && transcriptText.trim()) {
    return { transcript: transcriptText, source: "inline" };
  }
  if (!transcriptId) {
    return { transcript: "", source: "missing" };
  }
  const safe = transcriptId.replace(/[^a-z0-9-_]/gi, "");
  const file = path.join(FIXTURES_DIR, `${safe}.txt`);
  try {
    const transcript = await fs.readFile(file, "utf-8");
    return { transcript, source: `fixture:${safe}` };
  } catch (err) {
    return {
      transcript: "",
      source: `error:${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

function getCrmContext({ dealId }: { dealId?: string }) {
  // PoC stub: canned data so the agent can ground references.
  return {
    dealId: dealId ?? null,
    stage: "Discovery Complete",
    amount: null,
    owner: { name: "Daniel Reyes", email: "daniel@aftercall.app" },
    notes:
      "PoC stub — replace with real CRM API in Phase 3. The agent should treat this as advisory only.",
  };
}

function enrichCompany({ companyName, domain }: { companyName: string; domain?: string }) {
  // PoC stub: tells the agent what shape Clay enrichment would return so it can write to it.
  return {
    companyName,
    domain: domain ?? `${companyName.toLowerCase().replace(/\s+/g, "")}.com`,
    industry: "Unknown — PoC stub",
    headcountBand: "100-500",
    revenueBandUsd: "10M-100M",
    sourceNote: "PoC stub. Replace with Clay webhook in Phase 3.",
  };
}

function writeStakeholderPage(args: {
  persona: string;
  stakeholderName: string;
  stakeholderTitle?: string;
  prospectCompany: string;
  keyPointsFromCall: string[];
}) {
  // Helper tool — the agent can either use this for a deterministic scaffold,
  // OR write its own markdown directly in upsert_deal_room. For PoC, we return
  // a structured scaffold the agent can refine.
  const headlineByPersona: Record<string, string> = {
    champion: `${args.stakeholderName}, your shortcut to a green-lit deal`,
    cfo: `The numbers — in ${args.prospectCompany}'s reality`,
    it: `How we fit your stack`,
    end_user: `What Monday morning looks like`,
    cmo: `What this looks like to your buyers`,
    legal: `Standard MSA, no surprises`,
    other: `Built with you in mind, ${args.stakeholderName}`,
  };
  const headline = headlineByPersona[args.persona] ?? headlineByPersona.other;
  const bullets = args.keyPointsFromCall.map((p) => `- ${p}`).join("\n");
  const markdown = `## ${headline}\n\nFrom our conversation, here's what stood out for you:\n\n${bullets}`;
  return { markdown };
}

async function upsertDealRoom(rawRoom: unknown, ctx: ToolContext): Promise<UpsertResult> {
  if (!rawRoom || typeof rawRoom !== "object") {
    return { ok: false, error: "missing_deal_room" };
  }

  // Inject seller defaults if the agent omitted them.
  const candidate = rawRoom as Record<string, unknown>;
  if (!candidate.sellerName) candidate.sellerName = ctx.defaultSeller.name;
  if (!candidate.sellerTitle && ctx.defaultSeller.title) candidate.sellerTitle = ctx.defaultSeller.title;
  if (!candidate.sellerCompany) candidate.sellerCompany = ctx.defaultSeller.company;
  if (!candidate.sellerAvatarUrl && ctx.defaultSeller.avatarUrl)
    candidate.sellerAvatarUrl = ctx.defaultSeller.avatarUrl;

  const parsed = DealRoomSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      error: "schema_validation_failed: " + JSON.stringify(parsed.error.flatten()),
    };
  }
  const room: DealRoom = parsed.data;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    // PoC fallback: still return success so the caller can use the in-memory room.
    return {
      ok: true,
      slug: room.slug,
      url: `/room/${room.slug}`,
      error: "supabase_not_configured_room_not_persisted",
    };
  }

  const { error } = await supabase
    .from("deal_rooms")
    .upsert(
      {
        slug: room.slug,
        deal_id: room.dealId,
        company_name: room.companyName,
        company_domain: room.companyDomain,
        champion_name: room.championName,
        champion_email: room.championEmail,
        seller_name: room.sellerName,
        seller_company: room.sellerCompany,
        payload: room,
        voice_audio_url: room.voiceIntro.audioUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

  if (error) {
    return { ok: false, error: `supabase_upsert_failed: ${error.message}` };
  }
  return { ok: true, slug: room.slug, url: `/room/${room.slug}` };
}
