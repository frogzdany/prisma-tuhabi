#!/usr/bin/env node
// Prisma — CLI smoke for the live triage agent.
// Usage:
//   node scripts/seed-triage.mjs                  → all 4 fixtures
//   node scripts/seed-triage.mjs roma-norte       → just one fixture
//   node scripts/seed-triage.mjs --mock           → run against ?mock=1 (no Anthropic / ElevenLabs cost)
//   node scripts/seed-triage.mjs --base=http://...:3000   → custom base URL
//
// Streams SSE, prints a per-tool trace summary, total cost, and final route.
// Exits 1 if any fixture fails.

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));

const baseArg = args.find((a) => a.startsWith("--base="));
const BASE = baseArg ? baseArg.slice("--base=".length) : process.env.AFTERCALL_BASE_URL ?? "http://localhost:3000";
const MOCK = flags.has("--mock");

const ALL_FIXTURES = ["roma-norte", "pedregal", "ecatepec", "oaxaca"];
const fixtures = positional.length > 0 ? positional : ALL_FIXTURES;

const EXPECTED_ROUTE = {
  "roma-norte": "iBuyer",
  pedregal: "Pulppo",
  ecatepec: "Pulppo",
  oaxaca: "Nurture",
};

let totalCost = 0;
let totalIters = 0;
let totalDurationMs = 0;
let failures = 0;
const startedAt = Date.now();

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function logHeader(fixtureId, idx) {
  console.log("");
  console.log(`──── [${idx + 1}/${fixtures.length}] ${fixtureId} ${"─".repeat(Math.max(2, 60 - fixtureId.length))}`);
}

function summarizeTool(name, output) {
  if (!output || typeof output !== "object") return "";
  if (name === "extract_intent") return `colonia=${output.colonia}, urgency=${output.urgencyScore}`;
  if (name === "lookup_zone_risk") return `slug=${output.slug}, riskTier=${output.riskTier}, state=${output.stateCode}`;
  if (name === "lookup_habimetro") {
    const v = output.valueMXN;
    return v ? `valueMXN=${v.toLocaleString("en-US")}` : JSON.stringify(output).slice(0, 60);
  }
  if (name === "check_buybox") return `eligible=${output.eligible}${output.reason ? `, reason=${output.reason}` : ""}`;
  if (name === "find_brokers") return Array.isArray(output) ? `${output.length} brokers` : "";
  if (name === "compute_fee_scenarios") return Array.isArray(output) ? `${output.length} scenarios` : "";
  if (name === "draft_reply") return `text='${(output.text || "").slice(0, 60)}…'`;
  if (name === "generate_voice_reply") return `audio=${output.audioUrl ? "OK" : "FAIL"}${output.reason ? ` (${output.reason})` : ""}`;
  if (name === "persist_triage") return `ok=${output.ok}${output.leadId ? `, lead=${String(output.leadId).slice(0, 8)}…` : ""}${output.error ? ` err=${output.error}` : ""}`;
  return "";
}

async function runOne(fixtureId, idx) {
  logHeader(fixtureId, idx);
  const startMs = Date.now();
  const mockParam = MOCK ? "&mock=1" : "";
  const url = `${BASE}/api/triage?stream=1${mockParam}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fixtureId, source: "test" }),
  });
  if (!res.body) {
    console.error("  ✗ no response body");
    failures += 1;
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let finalEvent = null;
  let evName = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) evName = line.slice(7).trim();
        else if (line.startsWith("data: ")) {
          let data;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (evName === "trace") {
            const t = data.type;
            const n = data.name ?? "";
            if (t === "tool_call") {
              process.stdout.write(`  → ${pad(n, 22)}`);
            } else if (t === "tool_result") {
              const ms = data.durationMs ?? 0;
              const summary = summarizeTool(n, data.output);
              console.log(` ${pad(ms + "ms", 7)} ${summary}`);
            } else if (t === "error") {
              console.log(`  ✗ ERROR: ${data.message ?? "unknown"}`);
            }
          } else if (evName === "done" || evName === "error") {
            finalEvent = { evName, data };
          }
        }
      }
    }
  }

  const elapsedMs = Date.now() - startMs;
  totalDurationMs += elapsedMs;

  if (!finalEvent) {
    console.log("  ✗ no done/error event");
    failures += 1;
    return;
  }
  const { evName: name, data } = finalEvent;
  const decision = data.decision ?? {};
  const route = decision.chosenRoute ?? "(none)";
  const expected = EXPECTED_ROUTE[fixtureId];
  const cost = data.costEstimateUSD ?? 0;
  const usage = data.usage ?? {};
  totalCost += cost;
  totalIters += usage.iterations ?? 0;

  const routeOk = expected ? route === expected : true;
  console.log("");
  console.log(`  ${name === "done" && data.ok ? "✓" : "✗"} done   route=${route}${expected ? ` (expected=${expected} ${routeOk ? "✓" : "✗"})` : ""}`);
  console.log(`         cost=$${cost.toFixed(4)} iters=${usage.iterations ?? 0} in=${usage.inputTokens ?? 0} out=${usage.outputTokens ?? 0} cache_read=${usage.cacheReadTokens ?? 0} cache_write=${usage.cacheCreationTokens ?? 0}`);
  console.log(`         elapsed=${(elapsedMs / 1000).toFixed(1)}s lead=${(data.leadId ?? "").slice(0, 8) || "—"} decision=${(data.decisionId ?? "").slice(0, 8) || "—"}`);
  if (decision.reply?.text) console.log(`         reply: "${decision.reply.text.slice(0, 100)}${decision.reply.text.length > 100 ? "…" : ""}"`);
  if (decision.reply?.audioUrl) console.log(`         audio: ${decision.reply.audioUrl}`);
  if (data.error) console.log(`         error: ${data.error}`);

  if (!data.ok || !routeOk) failures += 1;
}

console.log(`Prisma smoke test`);
console.log(`  base: ${BASE}`);
console.log(`  mode: ${MOCK ? "MOCK (?mock=1)" : "LIVE (real agent + voice + Supabase)"}`);
console.log(`  fixtures: ${fixtures.join(", ")}`);

for (let i = 0; i < fixtures.length; i++) {
  try {
    await runOne(fixtures[i], i);
  } catch (err) {
    console.error(`  ✗ exception:`, err);
    failures += 1;
  }
}

const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log("");
console.log("═".repeat(70));
console.log(`SUMMARY: ${fixtures.length - failures}/${fixtures.length} passed`);
console.log(`  total cost:    $${totalCost.toFixed(4)} (avg $${(totalCost / fixtures.length).toFixed(4)} per fixture)`);
console.log(`  total iters:   ${totalIters} (avg ${(totalIters / fixtures.length).toFixed(1)} per fixture)`);
console.log(`  total elapsed: ${totalElapsed}s (avg ${(totalDurationMs / fixtures.length / 1000).toFixed(1)}s per fixture)`);
console.log("");
process.exit(failures > 0 ? 1 : 0);
