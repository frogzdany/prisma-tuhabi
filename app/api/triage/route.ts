import { NextRequest, NextResponse } from "next/server";
import { TriageDecisionSchema, TriageRequestSchema, type WhatsAppOpener } from "@/lib/shared/schemas";
import { FIXTURES, ZONE_RISK_TABLE, findBrokers, lookupHabimetro, tierForValue } from "@/lib/shared/mocks-prisma";
import { computeFeeScenarios } from "@/lib/shared/fees";
import { runTriageAgent } from "@/lib/agent/run-triage";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const RATE_LIMIT_PER_HOUR = Number(process.env.TRIAGE_RATE_LIMIT_PER_HOUR ?? 10);
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>): HeadersInit {
  return {
    "X-RateLimit-Limit": String(RATE_LIMIT_PER_HOUR),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/triage
 *  ?mock=1   → deterministic canned TriageDecision (no Anthropic, no DB writes).
 *  ?stream=1 → SSE stream of the live agent trace.
 *
 * Body: { text?: string; fixtureId?: string; source?: 'web'|'make'|'test' }
 *
 * Make.com integration:
 *  When body.source === 'make', request must include X-Make-Token header matching
 *  process.env.MAKE_WEBHOOK_TOKEN (only enforced if the env var is set).
 */
export async function POST(request: NextRequest) {
  const url = request.nextUrl;
  const mock = url.searchParams.get("mock") === "1";
  const stream = url.searchParams.get("stream") === "1";

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = TriageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Make.com webhook auth — only enforce if token configured.
  const isAuthedMake =
    parsed.data.source === "make" &&
    !!process.env.MAKE_WEBHOOK_TOKEN &&
    request.headers.get("x-make-token") === process.env.MAKE_WEBHOOK_TOKEN;
  if (parsed.data.source === "make") {
    const expected = process.env.MAKE_WEBHOOK_TOKEN;
    const got = request.headers.get("x-make-token");
    if (expected && got !== expected) {
      return NextResponse.json({ error: "invalid_make_token" }, { status: 401 });
    }
  }

  // ----- Mock path (Phase B fallback, still works as demo backup) -----
  if (mock) {
    if (stream) return mockSseStream(parsed.data.fixtureId);
    const decision = buildMockDecision(parsed.data.fixtureId);
    return NextResponse.json({ decision, mocked: true });
  }

  // ----- Rate limit (10/hour per IP by default) -----
  // Skip for ?mock=1 (already returned above) and for authenticated Make.com
  // server-to-server calls. Anyone else hitting /api/triage burns through the
  // hourly budget — protects the Anthropic + ElevenLabs bill from accidental
  // refresh loops on the demo URL.
  if (!isAuthedMake) {
    const ip = clientIp(request.headers);
    const rl = checkRateLimit(`triage:${ip}`, {
      limit: RATE_LIMIT_PER_HOUR,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!rl.allowed) {
      const resetIso = new Date(rl.resetAt).toISOString();
      return NextResponse.json(
        {
          error: "rate_limited",
          hint: `Máximo ${RATE_LIMIT_PER_HOUR} triajes por hora. Inténtalo de nuevo después de ${resetIso}.`,
          retryAfter: rl.retryAfterSec,
          resetAt: resetIso,
        },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(rl),
            "Retry-After": String(rl.retryAfterSec),
          },
        }
      );
    }
  }

  // ----- Real agent path -----
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "missing_anthropic_key",
        hint: "Add ANTHROPIC_API_KEY to .env.local, or call with ?mock=1 for canned data.",
      },
      { status: 503 }
    );
  }

  // Resolve opener text (from fixtureId if not given inline).
  const openerText =
    parsed.data.text ??
    (parsed.data.fixtureId ? FIXTURES[parsed.data.fixtureId]?.text : undefined);

  if (!openerText) {
    return NextResponse.json(
      { error: "no_opener_text", hint: "Provide `text` or a known `fixtureId`." },
      { status: 400 }
    );
  }

  const opener: WhatsAppOpener = {
    text: openerText,
    fixtureId: parsed.data.fixtureId,
    locale: "es-MX",
  };

  if (stream) {
    const encoder = new TextEncoder();
    const responseBody = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };
        const result = await runTriageAgent({
          opener,
          source: parsed.data.source,
          onTrace: (ev) => send("trace", ev),
        });
        send(result.ok ? "done" : "error", result);
        controller.close();
      },
    });
    return new Response(responseBody, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const result = await runTriageAgent({ opener, source: parsed.data.source });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export function GET(request: NextRequest) {
  const url = request.nextUrl;
  if (url.searchParams.get("mock") === "1") {
    const decision = buildMockDecision(
      url.searchParams.get("fixtureId") ?? undefined
    );
    return NextResponse.json({ decision, mocked: true });
  }
  return NextResponse.json({ error: "use POST" }, { status: 405 });
}

// ---------------------------------------------------------------------------

function buildMockDecision(fixtureId?: string) {
  const fid = fixtureId && FIXTURES[fixtureId] ? fixtureId : "roma-norte";
  const opener = FIXTURES[fid];

  // Per-fixture canned routing (mirrors what the real agent will produce).
  const presets = {
    "roma-norte": {
      zoneSlug: "roma-norte",
      propertyType: "departamento",
      sizeM2: 75,
      bedrooms: 2,
      urgencyScore: 92,
      motivationTags: ["relocation", "urgent", "clean_title"],
    },
    "pedregal": {
      zoneSlug: "pedregal",
      propertyType: "casa",
      sizeM2: 320,
      bedrooms: 4,
      urgencyScore: 55,
      motivationTags: ["inheritance", "multi_owner"],
    },
    "ecatepec": {
      zoneSlug: "ecatepec",
      propertyType: "casa",
      sizeM2: 90,
      bedrooms: 3,
      urgencyScore: 88,
      motivationTags: ["relocation", "urgent"],
    },
    "oaxaca": {
      zoneSlug: "oaxaca-de-juarez",
      propertyType: "casa",
      sizeM2: 60,
      bedrooms: 2,
      urgencyScore: 30,
      motivationTags: ["exploratory"],
    },
  } as const;

  const preset = presets[fid as keyof typeof presets];
  const zone = ZONE_RISK_TABLE[preset.zoneSlug];
  const habi = lookupHabimetro(preset.zoneSlug, preset.propertyType, preset.sizeM2)!;

  const valueMXN = habi.valueMXN;
  const inBuybox =
    valueMXN >= 500_000 &&
    valueMXN <= 4_000_000 &&
    zone.riskTier <= 3 &&
    ["CDMX", "EDOMEX", "JAL", "NL", "QRO", "PUE", "GTO", "HID", "MOR", "SLP", "AGS"].includes(zone.stateCode);

  const brokers = findBrokers(zone.stateCode, tierForValue(valueMXN));

  const scenarios = computeFeeScenarios({
    habimetroValueMXN: valueMXN,
    zone,
    urgencyScore: preset.urgencyScore,
    buyboxFit: {
      eligible: inBuybox,
      reason: inBuybox
        ? undefined
        : valueMXN > 4_000_000
        ? "above_4M_ceiling"
        : zone.riskTier > 3
        ? `risk_tier_${zone.riskTier}`
        : "state_not_covered",
    },
    matchedBrokers: brokers,
  });

  const chosen = scenarios.find((s) => s.recommended)!;

  const repliesByRoute: Record<string, string> = {
    iBuyer: `Hola, somos Tuhabi. Vimos tu mensaje sobre tu ${preset.propertyType} en ${zone.colonia}. Podemos cerrar en ~${chosen.estimatedTimeDays ?? 10} días con oferta directa. ¿Te llamamos hoy para confirmar detalles?`,
    Pulppo: `Hola, gracias por escribirnos. Tu ${preset.propertyType} en ${zone.colonia} encaja mejor con un asesor especialista de Pulppo. Te conectamos con ${brokers[0]?.name ?? "un broker"} que ha cerrado ${brokers[0]?.recentClosings ?? 10}+ propiedades en la zona. ¿Te parece bien?`,
    Nurture: `Hola, gracias por escribirnos. Tu zona en ${zone.colonia} aún no está dentro de nuestra cobertura directa, pero te mantenemos en la lista y te avisamos en cuanto podamos comprarte o conectarte con un asesor. ¿Quieres recibir una estimación de mercado?`,
  };

  const decision = TriageDecisionSchema.parse({
    chosenRoute: chosen.route,
    reason:
      chosen.route === "iBuyer"
        ? "in_buybox_and_urgent"
        : chosen.route === "Pulppo"
        ? inBuybox
          ? "broker_yields_better_net"
          : "iBuyer_not_eligible"
        : "no_eligible_route",
    scenarios,
    reply: {
      text: repliesByRoute[chosen.route],
      audioUrl: null,
    },
    brokers: chosen.route === "Pulppo" ? brokers : [],
  });

  return decision;
}

function mockSseStream(fixtureId?: string) {
  const encoder = new TextEncoder();
  const fid = fixtureId && FIXTURES[fixtureId] ? fixtureId : "roma-norte";
  const traceSteps = [
    { type: "tool_call", name: "extract_intent", input: { text: FIXTURES[fid].text.slice(0, 60) + "…" } },
    { type: "tool_result", name: "extract_intent", durationMs: 320 },
    { type: "tool_call", name: "lookup_habimetro" },
    { type: "tool_result", name: "lookup_habimetro", durationMs: 25 },
    { type: "tool_call", name: "lookup_zone_risk" },
    { type: "tool_result", name: "lookup_zone_risk", durationMs: 12 },
    { type: "tool_call", name: "check_buybox" },
    { type: "tool_result", name: "check_buybox", durationMs: 4 },
    { type: "tool_call", name: "find_brokers" },
    { type: "tool_result", name: "find_brokers", durationMs: 18 },
    { type: "tool_call", name: "compute_fee_scenarios" },
    { type: "tool_result", name: "compute_fee_scenarios", durationMs: 3 },
    { type: "tool_call", name: "draft_reply" },
    { type: "tool_result", name: "draft_reply", durationMs: 480 },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };
      let step = 1;
      for (const t of traceSteps) {
        send("trace", { step: step++, ...t });
        await new Promise((r) => setTimeout(r, 80));
      }
      const decision = buildMockDecision(fid);
      send("done", { ok: true, decision, mocked: true });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
