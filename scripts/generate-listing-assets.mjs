#!/usr/bin/env node
// Prisma — pre-generate Imagen 4 covers + Veo 3 listing tours per fixture.
//
// Outputs to public/listings/{fixture}/
//   cover.png       — Imagen 4 generated property cover (16:9)
//   video.mp4       — Veo 3 image-to-video tour (5-8s, 16:9)
//   metadata.json   — model IDs + prompts + timing + cost-est
//
// Usage:
//   node --env-file=.env.local scripts/generate-listing-assets.mjs roma-norte
//   node --env-file=.env.local scripts/generate-listing-assets.mjs --all
//   node --env-file=.env.local scripts/generate-listing-assets.mjs roma-norte --only=image
//   node --env-file=.env.local scripts/generate-listing-assets.mjs roma-norte --only=video
//   node --env-file=.env.local scripts/generate-listing-assets.mjs roma-norte --imagen-model=imagen-4.0-fast-generate-001
//   node --env-file=.env.local scripts/generate-listing-assets.mjs roma-norte --veo-model=veo-2.0-generate-001
//   node --env-file=.env.local scripts/generate-listing-assets.mjs roma-norte --dry-run
//
// Requires: GEMINI_API_KEY in .env.local

import { GoogleGenAI } from "@google/genai";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// ----- CLI parsing -----
const args = process.argv.slice(2);
const flagSet = new Set(args.filter((a) => a.startsWith("--") && !a.includes("=")));
const flagKv = Object.fromEntries(
  args.filter((a) => a.startsWith("--") && a.includes("=")).map((a) => {
    const [k, ...rest] = a.slice(2).split("=");
    return [k, rest.join("=")];
  })
);
const positional = args.filter((a) => !a.startsWith("--"));

const DRY_RUN = flagSet.has("--dry-run");
const ALL = flagSet.has("--all");
const ONLY = flagKv.only ?? "both"; // "image" | "video" | "both"
const IMAGEN_MODEL = flagKv["imagen-model"] ?? "imagen-4.0-generate-001";
const VEO_MODEL = flagKv["veo-model"] ?? "veo-3.0-generate-001";
const VEO_DURATION = Number(flagKv["veo-duration"] ?? 6);

// ----- Per-fixture prompts (es-MX flavored, photorealistic real-estate) -----
const FIXTURE_PROMPTS = {
  "roma-norte": {
    label: "Roma Norte (CDMX) · departamento 75m² · iBuyer",
    imagen: {
      prompt: `Editorial real-estate photograph of the interior of a modern departamento in Roma Norte, Mexico City. Two bedrooms, 75 square meters, mid-century furniture, polished concrete floors, large windows letting in soft afternoon light from a tree-lined Mexico City street, art-deco architectural details visible, neutral palette with warm accents. Clean composition, professional listing photography, no people. 16:9 aspect ratio.`,
      aspectRatio: "16:9",
    },
    veo: {
      prompt: `Slow cinematic dolly forward through a sunlit Mexico City apartment living room toward the windows. The camera glides smoothly from the entry hallway into the open living area. Late afternoon golden light pours in through tall French windows overlooking a tree-lined street. Soft natural ambience, warm color grading, gentle motion of sheer curtains, no people. Editorial real-estate tour aesthetic.`,
      aspectRatio: "16:9",
    },
  },
  pedregal: {
    label: "Pedregal (CDMX) · casa 320m² · Pulppo luxury",
    imagen: {
      prompt: `Editorial real-estate photograph of the exterior of a luxury family home in El Pedregal de San Ángel, Mexico City. Volcanic stone façade, modernist architecture with clean horizontal lines, mature lush garden with palms and bougainvillea, late afternoon golden hour, deep architectural shadows, 320 square meters, four bedrooms, two-story home, manicured lawn, stone path to entrance. No people, no cars. Professional aspirational listing photography. 16:9 aspect ratio.`,
      aspectRatio: "16:9",
    },
    veo: {
      prompt: `Slow cinematic dolly approach toward the entrance of a modernist volcanic-stone home in El Pedregal, Mexico City. Camera floats forward at hip height through a mature garden, palm fronds and bougainvillea moving subtly in the breeze. Late afternoon golden hour light rakes across the stone façade. Aspirational, calm, no people. Editorial real-estate tour aesthetic.`,
      aspectRatio: "16:9",
    },
  },
  ecatepec: {
    label: "Ecatepec (EDOMEX) · casa 90m² · Pulppo value",
    imagen: {
      prompt: `Editorial real-estate photograph of the exterior of a modest two-story single-family house in Ecatepec, Estado de México. Painted concrete walls in warm cream and terracotta colors, small front yard with potted plants, simple wrought-iron gate, dense middle-class residential street with similar houses, parked cars visible in the distance, realistic mid-day Mexican light. Authentic and honest, no people, no exaggeration, no glamorization. Documentary real-estate photography style. 16:9 aspect ratio.`,
      aspectRatio: "16:9",
    },
    veo: {
      prompt: `Gentle camera pan across the front of a modest two-story house in a residential street of Ecatepec, Estado de México. Camera moves left to right at standing height, revealing the cream-painted concrete façade and a small front yard. Mid-day Mexican sun overhead, soft shadows, no people. Authentic and honest, documentary tone, no glamorization.`,
      aspectRatio: "16:9",
    },
  },
  oaxaca: {
    label: "Oaxaca de Juárez (OAX) · casita 60m² · Nurture",
    imagen: {
      prompt: `Editorial real-estate photograph of the exterior of a small charming traditional house in Oaxaca de Juárez. Painted exterior walls in warm earthy yellow with white trim, traditional barrel-tile roof, small front patio with potted plants and bougainvillea, narrow cobblestone street, late afternoon warm golden light, mountainous southern Mexico backdrop visible. 60 square meters, two bedrooms, single story. Charming, warm, authentic. No people, no cars. 16:9 aspect ratio.`,
      aspectRatio: "16:9",
    },
    veo: {
      prompt: `Slow handheld walking shot approaching the front door of a small traditional yellow-painted Oaxacan house. Camera moves forward gently along a cobblestone street, bougainvillea blossoms swaying in the breeze, warm late afternoon light. Intimate, atmospheric, authentic. No people. Editorial real-estate tour aesthetic.`,
      aspectRatio: "16:9",
    },
  },
};

// ----- Pricing for cost-estimate output (rough, as of Q1 2026) -----
const PRICING = {
  "imagen-4.0-generate-001": 0.04,
  "imagen-4.0-fast-generate-001": 0.02,
  "veo-3.0-generate-001": 0.75 * VEO_DURATION, // ~$0.75 per second (approx)
  "veo-3.0-fast-generate-001": 0.4 * VEO_DURATION,
  "veo-2.0-generate-001": 0.35 * VEO_DURATION,
};

// ----- Resolve which fixtures to process -----
const ALL_FIXTURES = Object.keys(FIXTURE_PROMPTS);
const fixtures = ALL ? ALL_FIXTURES : positional.length > 0 ? positional : ["roma-norte"];
const invalid = fixtures.filter((f) => !FIXTURE_PROMPTS[f]);
if (invalid.length > 0) {
  console.error(`Unknown fixture(s): ${invalid.join(", ")}. Valid: ${ALL_FIXTURES.join(", ")}`);
  process.exit(1);
}

// ----- Output dir -----
const OUTPUT_BASE = path.join(process.cwd(), "public", "listings");

// ----- Cost preflight -----
const imagenCost = ONLY === "video" ? 0 : (PRICING[IMAGEN_MODEL] ?? 0.04) * fixtures.length;
const veoCost = ONLY === "image" ? 0 : (PRICING[VEO_MODEL] ?? 4) * fixtures.length;
const totalCost = imagenCost + veoCost;

console.log("Prisma asset gen");
console.log(`  fixtures:    ${fixtures.join(", ")}`);
console.log(`  scope:       ${ONLY === "both" ? "image + video" : ONLY}`);
console.log(`  imagen:      ${IMAGEN_MODEL} (~$${imagenCost.toFixed(2)})`);
console.log(`  veo:         ${VEO_MODEL}, ${VEO_DURATION}s (~$${veoCost.toFixed(2)})`);
console.log(`  total est:   ~$${totalCost.toFixed(2)} ${DRY_RUN ? "(DRY RUN, no calls)" : ""}`);
console.log("");

if (DRY_RUN) {
  console.log("Dry run complete. Re-run without --dry-run to actually generate.");
  process.exit(0);
}

// ----- Setup -----
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not set. Add it to .env.local and re-run with --env-file=.env.local.");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

// ----- Helpers -----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

async function generateImage(fixtureId, cfg) {
  console.log(`  → imagen ${IMAGEN_MODEL} …`);
  const start = Date.now();
  const result = await ai.models.generateImages({
    model: IMAGEN_MODEL,
    prompt: cfg.prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: cfg.aspectRatio,
      includeRaiReason: true,
    },
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  // Find the first generated image. Response shape can vary by SDK version.
  const generated = result?.generatedImages?.[0];
  if (!generated) {
    throw new Error(
      `imagen returned no image. Full response: ${JSON.stringify(result).slice(0, 400)}`
    );
  }
  const imageBytesB64 =
    generated.image?.imageBytes ??
    generated.image?.bytesBase64 ??
    generated.bytesBase64Encoded;
  if (!imageBytesB64) {
    throw new Error(
      `imagen image has no bytes. Response: ${JSON.stringify(generated).slice(0, 400)}`
    );
  }
  const buf = Buffer.from(imageBytesB64, "base64");
  const out = path.join(OUTPUT_BASE, fixtureId, "cover.png");
  await ensureDir(path.dirname(out));
  await writeFile(out, buf);
  console.log(`    ✓ cover ${(buf.length / 1024).toFixed(0)}KB in ${elapsed}s → ${out}`);
  return { buf, imageBytesB64, mimeType: "image/png", path: out, elapsed };
}

async function generateVideo(fixtureId, cfg, imageBytesB64) {
  console.log(`  → veo ${VEO_MODEL} (${VEO_DURATION}s, polling, can take 1-5 min) …`);
  const start = Date.now();

  // Build request. Image-to-video requires `image` with base64 bytes.
  // (We omit personGeneration — Veo 3 Fast rejects 'dont_allow'; our prompts
  //  already exclude people, so we let the model behave normally.)
  const videoCfg = {
    numberOfVideos: 1,
    aspectRatio: cfg.aspectRatio,
    durationSeconds: VEO_DURATION,
  };

  let operation;
  try {
    operation = await ai.models.generateVideos({
      model: VEO_MODEL,
      prompt: cfg.prompt,
      ...(imageBytesB64 ? { image: { imageBytes: imageBytesB64, mimeType: "image/png" } } : {}),
      config: videoCfg,
    });
  } catch (err) {
    throw new Error(`veo init failed: ${err?.message ?? err}`);
  }

  // Poll until done. Time budget: 10 min.
  const POLL_DEADLINE_MS = 10 * 60 * 1000;
  const POLL_INTERVAL_MS = 10 * 1000;
  let polled = 0;
  while (!operation.done) {
    await sleep(POLL_INTERVAL_MS);
    polled += POLL_INTERVAL_MS;
    if (polled > POLL_DEADLINE_MS) {
      throw new Error(`veo polling exceeded ${POLL_DEADLINE_MS / 1000}s`);
    }
    process.stdout.write(`    (polling ${polled / 1000}s) `);
    try {
      operation = await ai.operations.getVideosOperation({ operation });
    } catch (err) {
      throw new Error(`veo poll failed: ${err?.message ?? err}`);
    }
  }
  console.log("");

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (operation.error) {
    throw new Error(`veo operation error: ${JSON.stringify(operation.error)}`);
  }
  const generated = operation.response?.generatedVideos?.[0];
  if (!generated) {
    throw new Error(
      `veo returned no videos. Full response: ${JSON.stringify(operation.response).slice(0, 500)}`
    );
  }
  const file = generated.video;
  if (!file) throw new Error("veo response has no video file ref");

  const out = path.join(OUTPUT_BASE, fixtureId, "video.mp4");
  await ensureDir(path.dirname(out));

  // The SDK's files.download supports writing to disk in one call.
  try {
    await ai.files.download({ file, downloadPath: out });
  } catch (err) {
    // Fallback: fetch the URI manually (some envs).
    const uri = file.uri || file.url;
    if (!uri) throw new Error(`veo download failed and no uri fallback: ${err?.message ?? err}`);
    const sep = uri.includes("?") ? "&" : "?";
    const res = await fetch(`${uri}${sep}key=${apiKey}`);
    if (!res.ok) throw new Error(`fallback fetch ${res.status} ${res.statusText}`);
    const arr = new Uint8Array(await res.arrayBuffer());
    await writeFile(out, arr);
  }

  const stat = await readFile(out).then((b) => b.length);
  console.log(`    ✓ video ${(stat / 1024 / 1024).toFixed(2)}MB in ${elapsed}s → ${out}`);
  return { path: out, elapsed, sizeBytes: stat };
}

// ----- Run -----
let totalElapsed = 0;
const failures = [];
const startedAt = Date.now();

for (const fixtureId of fixtures) {
  const cfg = FIXTURE_PROMPTS[fixtureId];
  console.log(`\n──── ${fixtureId} · ${cfg.label} ────`);
  const meta = {
    fixtureId,
    label: cfg.label,
    generatedAt: new Date().toISOString(),
    imagen: { model: IMAGEN_MODEL, prompt: cfg.imagen.prompt },
    veo: { model: VEO_MODEL, durationSeconds: VEO_DURATION, prompt: cfg.veo.prompt },
    timing: {},
  };

  let imageBytesB64 = null;

  // Image step
  if (ONLY === "image" || ONLY === "both") {
    try {
      const { imageBytesB64: bytes, elapsed } = await generateImage(fixtureId, cfg.imagen);
      imageBytesB64 = bytes;
      meta.timing.imagenS = Number(elapsed);
    } catch (err) {
      console.error(`    ✗ imagen failed: ${err.message}`);
      failures.push({ fixture: fixtureId, step: "imagen", error: err.message });
      continue;
    }
  } else if (ONLY === "video") {
    // Need to load existing cover for image-to-video.
    const coverPath = path.join(OUTPUT_BASE, fixtureId, "cover.png");
    if (existsSync(coverPath)) {
      const buf = await readFile(coverPath);
      imageBytesB64 = buf.toString("base64");
      console.log(`    (reusing existing cover at ${coverPath})`);
    } else {
      console.log(`    (no existing cover; running veo as text-to-video)`);
    }
  }

  // Video step
  if (ONLY === "video" || ONLY === "both") {
    try {
      const { elapsed } = await generateVideo(fixtureId, cfg.veo, imageBytesB64);
      meta.timing.veoS = Number(elapsed);
    } catch (err) {
      console.error(`    ✗ veo failed: ${err.message}`);
      failures.push({ fixture: fixtureId, step: "veo", error: err.message });
    }
  }

  // Persist per-fixture metadata.
  const metaPath = path.join(OUTPUT_BASE, fixtureId, "metadata.json");
  await ensureDir(path.dirname(metaPath));
  await writeFile(metaPath, JSON.stringify(meta, null, 2));
}

totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

console.log("\n" + "═".repeat(60));
console.log(`SUMMARY: ${fixtures.length - failures.length}/${fixtures.length} fixtures ok`);
console.log(`  total elapsed: ${totalElapsed}s`);
console.log(`  est cost:      ~$${totalCost.toFixed(2)} (rough)`);
if (failures.length > 0) {
  console.log("  failures:");
  for (const f of failures) console.log(`    × ${f.fixture}/${f.step}: ${f.error}`);
  process.exit(1);
}
console.log("");
console.log("Assets live in:");
for (const f of fixtures) {
  const dir = path.join("public", "listings", f);
  console.log(`  ${dir}/`);
}
console.log("");
console.log("Next: reload /prisma — covers + videos auto-detected via fixture metadata.");
