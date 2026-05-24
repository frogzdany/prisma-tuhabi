#!/usr/bin/env node
// Preview ElevenLabs female voices speaking a Mexican Spanish sample so you
// can pick the best one for Prisma's WhatsApp voice notes.
//
// Usage:
//   node --env-file=.env.local scripts/preview-elevenlabs-female-voices.mjs
//
// Options:
//   --limit N        Generate at most N samples (default 12). Use --all for everything.
//   --all            Generate samples for every female voice in your account.
//   --play           After generating, auto-play each sample sequentially (macOS afplay).
//   --filter <text>  Only voices whose name/labels match this substring (case-insensitive).
//   --script "..."   Override the sample script text.
//   --out <dir>      Output folder (default: tmp/voice-samples).
//   --no-multilingual Skip non-Spanish, non-multilingual voices.
//
// Each sample is ~12 seconds of audio. Cost ≈ ~300 credits per voice on
// eleven_multilingual_v2. With the default limit of 12 voices, expect about
// 3600 credits — comfortably inside the free tier monthly allotment but worth
// a quick gut-check on `https://elevenlabs.io/app/usage` before running.

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error(
    "ELEVENLABS_API_KEY missing. Run with: node --env-file=.env.local scripts/preview-elevenlabs-female-voices.mjs"
  );
  process.exit(1);
}

// ---- Arg parsing -----------------------------------------------------------

const args = process.argv.slice(2);
const getFlag = (name) => args.includes(name);
const getOption = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};

const DEFAULT_SCRIPT =
  "Hola, soy Prisma de Tuhabi. Tu propiedad en Roma Norte califica para venta directa. " +
  "Te pagamos neto un millón setecientos mil pesos y cerramos en diez días. " +
  "Cero comisiones, cero papeleo extra. ¿Te llamamos hoy para confirmar los detalles?";

const sampleScript = getOption("--script") ?? DEFAULT_SCRIPT;
const playAfter = getFlag("--play");
const wantAll = getFlag("--all");
const skipNonMultilingual = getFlag("--no-multilingual");
const filterText = (getOption("--filter") ?? "").toLowerCase();
const explicitLimit = getOption("--limit");
const limit = wantAll
  ? Infinity
  : explicitLimit
    ? Number(explicitLimit)
    : 12;
const outDir = path.resolve(getOption("--out") ?? "tmp/voice-samples");

// ---- Helpers ---------------------------------------------------------------

const looksFemale = (v) => {
  const gender = (v.labels?.gender ?? "").toLowerCase();
  if (gender === "female") return true;
  if (gender === "male") return false;
  // Some voices have no gender label — fall back to name heuristics.
  const name = (v.name ?? "").toLowerCase();
  return /\b(sarah|rachel|bella|nicole|domi|elli|charlotte|emily|grace|matilda|alice|jessica|laura|aria|valentina|gabriela|sofia|sof[ií]a|luc[ií]a|isabela|paula|marina|valeria|camila|daniela|mariana|julia|antonia|ana)\b/.test(
    name
  );
};

const isMultilingualCapable = (v) => {
  const models = v.high_quality_base_model_ids ?? [];
  return models.some((m) => /multilingual/i.test(m));
};

const matchesFilter = (v) => {
  if (!filterText) return true;
  const hay = [
    v.name ?? "",
    v.description ?? "",
    v.labels?.accent ?? "",
    v.labels?.descriptive ?? "",
    v.labels?.language ?? "",
    v.labels?.use_case ?? "",
    v.labels?.age ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(filterText);
};

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ---- Fetch voice list ------------------------------------------------------

console.log("Fetching voice list from ElevenLabs…");
const voicesRes = await fetch("https://api.elevenlabs.io/v1/voices", {
  headers: { "xi-api-key": apiKey, Accept: "application/json" },
});
if (!voicesRes.ok) {
  console.error(`API error: ${voicesRes.status} ${voicesRes.statusText}`);
  console.error(await voicesRes.text());
  process.exit(1);
}
const { voices } = await voicesRes.json();

const female = voices
  .filter(looksFemale)
  .filter(matchesFilter)
  .filter((v) => (skipNonMultilingual ? isMultilingualCapable(v) : true));

if (female.length === 0) {
  console.error("No female voices matched. Try widening the filter or removing --no-multilingual.");
  process.exit(1);
}

// Prioritize Spanish/multilingual first so the best candidates run if --limit cuts the list.
const score = (v) => {
  const labels = v.labels ?? {};
  const allLabels = [
    labels.language ?? "",
    labels.accent ?? "",
    labels.descriptive ?? "",
    labels.use_case ?? "",
    v.description ?? "",
  ]
    .join(" ")
    .toLowerCase();
  let s = 0;
  if (/spanish|español|mexic|latin|es-mx/.test(allLabels)) s += 100;
  if (isMultilingualCapable(v)) s += 30;
  if (/conversational|warm|friendly|narrative/.test(allLabels)) s += 5;
  return s;
};
female.sort((a, b) => score(b) - score(a));

const targets = female.slice(0, Number.isFinite(limit) ? limit : female.length);

console.log("");
console.log(`Found ${female.length} female voices (showing ${targets.length}).`);
console.log(`Script (~${sampleScript.length} chars):`);
console.log(`  "${sampleScript}"`);
console.log("");

if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
console.log(`Output dir: ${outDir}`);
console.log("");

// ---- Generate samples ------------------------------------------------------

const generated = [];
let i = 0;
for (const voice of targets) {
  i += 1;
  const label = `[${String(i).padStart(2, "0")}/${targets.length}]`;
  const nameSlug = slugify(voice.name ?? "voice");
  const file = path.join(outDir, `${String(i).padStart(2, "0")}-${nameSlug}-${voice.voice_id}.mp3`);

  process.stdout.write(`${label} ${voice.name?.padEnd(22) ?? "?"}  ${voice.voice_id}  … `);
  try {
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: sampleScript,
          model_id: "eleven_multilingual_v2",
        }),
      }
    );
    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.log(`✗ ${ttsRes.status} ${errText.slice(0, 100)}`);
      continue;
    }
    const buf = Buffer.from(await ttsRes.arrayBuffer());
    await writeFile(file, buf);
    console.log(`✓ ${(buf.length / 1024).toFixed(0)}KB`);
    generated.push({ voice, file });
  } catch (err) {
    console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
  }
}

if (generated.length === 0) {
  console.error("\nNo samples were generated. Check API key, quota, or filter.");
  process.exit(1);
}

// ---- Summary table ---------------------------------------------------------

console.log("");
console.log("══ Generated samples ══");
console.log(
  `  ${"#".padStart(3)}  ${"name".padEnd(22)}  ${"voice_id".padEnd(22)}  ${"accent".padEnd(18)}  ${"descriptive".padEnd(18)}  file`
);
console.log("  " + "─".repeat(140));
generated.forEach(({ voice, file }, idx) => {
  const labels = voice.labels ?? {};
  console.log(
    `  ${String(idx + 1).padStart(3)}  ${(voice.name ?? "").padEnd(22)}  ${voice.voice_id.padEnd(22)}  ${(labels.accent ?? labels.language ?? "").padEnd(18)}  ${(labels.descriptive ?? labels.age ?? "").padEnd(18)}  ${path.relative(process.cwd(), file)}`
  );
});

console.log("");
console.log("To pick one, copy its voice_id into .env.local:");
console.log("  ELEVENLABS_VOICE_ID_MX=<voice_id>");
console.log("");
console.log("Open the folder in Finder:");
console.log(`  open "${outDir}"`);
console.log("");

// ---- Optional playback -----------------------------------------------------

if (playAfter) {
  if (process.platform !== "darwin") {
    console.log("--play requires macOS (uses afplay). Open the files manually on other OSes.");
  } else {
    console.log("Playing samples sequentially with afplay — press Ctrl+C to stop.");
    for (const { voice, file } of generated) {
      console.log(`▶ ${voice.name}  (${voice.voice_id})`);
      const res = spawnSync("afplay", [file], { stdio: "inherit" });
      if (res.status !== 0) {
        console.log(`  (afplay exited ${res.status})`);
      }
    }
    console.log("Done. Re-run with --play to listen again, or open the file you like.");
  }
}
