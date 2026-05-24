#!/usr/bin/env node
// Quick smoke test: hits /api/generate for each fixture and dumps the result.
// Usage: node scripts/seed-deal.mjs [transcriptId]   (defaults to all three)
// Requires the dev server to be running and ANTHROPIC_API_KEY set in .env.local.

const BASE = process.env.AFTERCALL_BASE_URL ?? "http://localhost:3001";
const FIXTURES = process.argv[2]
  ? [process.argv[2]]
  : ["atlas-robotics", "skyship-logistics", "medina-clinics"];

async function run(transcriptId) {
  console.log(`\n▶ Generating deal room for fixture: ${transcriptId}`);
  const start = Date.now();
  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcriptId }),
  });
  const body = await res.json();
  const ms = Date.now() - start;

  if (!res.ok) {
    console.error(`  ✗ ${res.status} ${res.statusText} in ${ms}ms`);
    console.error("  ", JSON.stringify(body, null, 2).slice(0, 1000));
    return false;
  }

  const slug = body?.slug ?? body?.room?.slug ?? "?";
  const stakeholders = body?.room?.stakeholders?.length ?? 0;
  const voiceOk = !!body?.room?.voiceIntro?.audioUrl;
  console.log(`  ✓ ${ms}ms · slug=${slug} · ${stakeholders} stakeholders · voice=${voiceOk ? "yes" : "no"}`);
  console.log(`    Open: ${BASE}/room/${slug}`);
  if (body?.trace) {
    const tools = body.trace.filter((t) => t.type === "tool_call");
    const calls = tools.map((t) => t.name).join(" → ");
    console.log(`    Tools: ${calls}`);
  }
  return true;
}

const results = await Promise.all(FIXTURES.map(run));
const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} fixtures succeeded.`);
process.exit(passed === results.length ? 0 : 1);
