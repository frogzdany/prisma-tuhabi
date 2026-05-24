#!/usr/bin/env node
// List ElevenLabs voices, with Spanish / Mexican / multilingual ones highlighted.
// Usage:  node --env-file=.env.local scripts/list-elevenlabs-voices.mjs
// Or:     ELEVENLABS_API_KEY=... node scripts/list-elevenlabs-voices.mjs

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY missing. Run with: node --env-file=.env.local scripts/list-elevenlabs-voices.mjs");
  process.exit(1);
}

const currentVoiceMx = process.env.ELEVENLABS_VOICE_ID_MX || "(not set)";
const currentVoiceDefault = process.env.ELEVENLABS_VOICE_ID || "(not set, falls back to Adam)";

console.log("Current env config:");
console.log(`  ELEVENLABS_VOICE_ID_MX   = ${currentVoiceMx}`);
console.log(`  ELEVENLABS_VOICE_ID      = ${currentVoiceDefault}`);
console.log("");

const res = await fetch("https://api.elevenlabs.io/v1/voices", {
  headers: { "xi-api-key": apiKey, "Accept": "application/json" },
});
if (!res.ok) {
  console.error(`API error: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}
const { voices } = await res.json();

// Categorize.
const looksSpanish = (v) => {
  const labels = v.labels ?? {};
  const fields = [
    v.name ?? "",
    v.description ?? "",
    labels.language ?? "",
    labels.accent ?? "",
    labels.descriptive ?? "",
    labels.use_case ?? "",
    (v.fine_tuning?.language ?? ""),
  ].join(" ").toLowerCase();
  return /spanish|español|mexic|latin|mx|es-mx|hispanic/.test(fields);
};

const isMultilingual = (v) => {
  const models = v.high_quality_base_model_ids ?? [];
  return models.some((m) => /multilingual/i.test(m));
};

const spanishVoices = voices.filter(looksSpanish);
const multilingualOnly = voices.filter((v) => !looksSpanish(v) && isMultilingual(v));
const others = voices.filter((v) => !looksSpanish(v) && !isMultilingual(v));

const formatVoice = (v) => {
  const labels = v.labels ?? {};
  const bits = [
    v.voice_id,
    (v.name ?? "").padEnd(22),
    (labels.gender ?? "").padEnd(7),
    (labels.accent ?? labels.language ?? "").padEnd(20),
    (labels.descriptive ?? labels.age ?? "").padEnd(18),
    (labels.use_case ?? "").padEnd(15),
    v.preview_url ? "▶ preview" : "",
  ];
  return "  " + bits.join("  ");
};

console.log(`Total voices in account: ${voices.length}`);
console.log("");
console.log("══ Spanish / Mexican / Latin candidates (best fit for Prisma) ══");
if (spanishVoices.length === 0) {
  console.log("  (none — try Multilingual section below; eleven_multilingual_v2 supports MX Spanish on any voice)");
} else {
  console.log(`  ${"voice_id".padEnd(22)}  ${"name".padEnd(22)}  ${"gender".padEnd(7)}  ${"accent".padEnd(20)}  ${"descriptive".padEnd(18)}  ${"use_case".padEnd(15)}`);
  console.log("  " + "─".repeat(120));
  for (const v of spanishVoices) console.log(formatVoice(v));
  console.log("");
  console.log("  Preview URLs:");
  for (const v of spanishVoices) {
    if (v.preview_url) console.log(`    ${v.name}  ${v.preview_url}`);
  }
}

console.log("");
console.log("══ Other multilingual voices (also work for MX via eleven_multilingual_v2) ══");
if (multilingualOnly.length === 0) {
  console.log("  (none)");
} else {
  console.log(`  ${"voice_id".padEnd(22)}  ${"name".padEnd(22)}  ${"gender".padEnd(7)}  ${"accent".padEnd(20)}  ${"descriptive".padEnd(18)}  ${"use_case".padEnd(15)}`);
  console.log("  " + "─".repeat(120));
  for (const v of multilingualOnly.slice(0, 12)) console.log(formatVoice(v));
  if (multilingualOnly.length > 12) console.log(`  ... and ${multilingualOnly.length - 12} more`);
}

console.log("");
console.log("══ Other voices (English-only or unlabeled) ══");
console.log(`  ${others.length} more voices; skipping the print to keep output readable.`);
console.log("");
console.log("To set the chosen voice, add to .env.local:");
console.log("  ELEVENLABS_VOICE_ID_MX=<voice_id from above>");
console.log("");
