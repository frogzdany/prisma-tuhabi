#!/usr/bin/env node
// Generate brand logo variants via Imagen 4.
// Usage:
//   node --env-file=.env.local scripts/generate-logo.mjs                  → 5 variants
//   node --env-file=.env.local scripts/generate-logo.mjs --variant=3      → just variant #3
//   node --env-file=.env.local scripts/generate-logo.mjs --name=Sendero   → different brand name
//
// Output: public/brand/{name}/variant-{n}-{label}.png

import { GoogleGenAI } from "@google/genai";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flagKv = Object.fromEntries(
  args.filter((a) => a.startsWith("--") && a.includes("=")).map((a) => {
    const [k, ...rest] = a.slice(2).split("=");
    return [k, rest.join("=")];
  })
);
const BRAND = (flagKv.name ?? "prisma").toLowerCase();
const ONLY_VARIANT = flagKv.variant ? Number(flagKv.variant) : null;
const MODEL = flagKv.model ?? "imagen-4.0-generate-001";

// Tuhabi-inspired purple as the primary brand color.
const TUHABI_PURPLE = "#7C3AED";

// Brand-specific concept seeds. For "prisma" we lean into light refraction.
const CONCEPTS = {
  prisma: [
    {
      label: "geometric-minimal",
      aspectRatio: "1:1",
      prompt: `Minimalist geometric logo mark for a real-estate technology startup called "Prisma". A clean triangular prism rendered as a simple 2D outline in deep purple (${TUHABI_PURPLE}) on a pure white background. Modernist flat design, vector-style, monoline weight, suitable for an app icon. Perfectly symmetric, centered, generous white margin around the mark. No text, no shadows, no gradients, no people, no realism. Square 1:1 aspect ratio.`,
    },
    {
      label: "3d-refraction",
      aspectRatio: "1:1",
      prompt: `Modern 3D-rendered brand logo for a real-estate technology startup called "Prisma". A glossy translucent triangular prism floating in space, refracting a single beam of white light into a soft rainbow spectrum (red, orange, yellow, green, blue, violet) exiting the opposite face. Clean studio lighting, soft shadow underneath, pure white background. Centered composition, polished, professional, premium feel. No text, no people. Square 1:1 aspect ratio.`,
    },
    {
      label: "flat-spectrum-icon",
      aspectRatio: "1:1",
      prompt: `Flat vector brand mark for a real-estate technology startup called "Prisma". A bold filled purple triangular prism (${TUHABI_PURPLE}) viewed from a slight angle, with three thick colored beams emerging from its right face (cyan, magenta, and amber) — suggesting refraction and decision-routing. Bauhaus-inspired geometric simplicity, slight rounded corners, app-icon style with bold contrast. Pure white background. Perfectly centered, square 1:1 aspect ratio. No text, no people, no realism.`,
    },
    {
      label: "abstract-gradient",
      aspectRatio: "1:1",
      prompt: `Abstract geometric brand mark for a real-estate technology startup called "Prisma". Three overlapping translucent triangular shapes in purple (${TUHABI_PURPLE}), cyan, and magenta, layered to create a refraction effect where the overlaps blend into intermediate hues. Modernist, sophisticated, gradient-mesh aesthetic. Pure white background, soft, premium. Centered composition, square 1:1 aspect ratio. No text, no people.`,
    },
    {
      label: "wordmark",
      aspectRatio: "16:9",
      prompt: `Premium minimal wordmark for a Mexican real-estate technology startup called "prisma". The word "prisma" in lowercase letters, custom geometric sans-serif typeface, deep purple color (${TUHABI_PURPLE}), confident and modern. To the left of the word, a small filled triangular prism icon (also purple) emitting a thin refracted three-color line (cyan, amber, magenta). Pure white background, very generous spacing, B2B professional aesthetic. Perfectly horizontally centered. Wide 16:9 aspect ratio. Sharp clean typography, no extra decoration.`,
    },
    {
      // 3D-rendered take on variant 3's composition: keep the bold purple
      // triangle + 3 colored beams, but render in modern 3D with depth +
      // glossy materials.
      label: "3d-spectrum-icon",
      aspectRatio: "1:1",
      prompt: `Modern 3D-rendered brand mark for a real-estate technology startup. A bold solid triangular prism in deep saturated purple (${TUHABI_PURPLE}) with subtle bevel and soft gloss, viewed from a slight three-quarter isometric angle that shows depth on its right face. From the right face, three thick parallel beams emerge horizontally toward the right edge of the frame — top beam in vibrant cyan, middle beam in vivid magenta, bottom beam in warm amber. Each beam is rendered with the same dimensional 3D quality, slight depth, gentle gloss, and a soft falloff. Clean studio lighting with a soft drop shadow beneath the prism. Pure white background. Centered composition, balanced negative space, premium app-icon aesthetic. Square 1:1 aspect ratio. Absolutely no text, no letters, no numbers, no symbols, no characters of any kind.`,
    },
  ],
};

const concepts = CONCEPTS[BRAND];
if (!concepts) {
  console.error(`No concepts defined for brand "${BRAND}". Add a key to CONCEPTS in this script.`);
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY missing. Run with --env-file=.env.local");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

const outDir = path.join(process.cwd(), "public", "brand", BRAND);
if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

const toRun = ONLY_VARIANT ? [concepts[ONLY_VARIANT - 1]] : concepts;
const startIdx = ONLY_VARIANT ? ONLY_VARIANT - 1 : 0;

console.log(`Generating ${toRun.length} variant(s) for "${BRAND}" via ${MODEL}…`);
console.log(`  output dir: ${path.relative(process.cwd(), outDir)}/`);
console.log(`  est cost:   ~$${(toRun.length * 0.04).toFixed(2)}\n`);

const startedAt = Date.now();
const results = [];

for (let i = 0; i < toRun.length; i++) {
  const concept = toRun[i];
  const n = startIdx + i + 1;
  console.log(`──── variant ${n} · ${concept.label} (${concept.aspectRatio}) ────`);
  const t0 = Date.now();
  try {
    const res = await ai.models.generateImages({
      model: MODEL,
      prompt: concept.prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: concept.aspectRatio,
      },
    });
    const g = res?.generatedImages?.[0];
    const b64 =
      g?.image?.imageBytes ?? g?.image?.bytesBase64 ?? g?.bytesBase64Encoded;
    if (!b64) throw new Error("no image bytes in response");
    const buf = Buffer.from(b64, "base64");
    const file = path.join(outDir, `variant-${n}-${concept.label}.png`);
    await writeFile(file, buf);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  ✓ ${(buf.length / 1024).toFixed(0)}KB in ${elapsed}s → ${path.relative(process.cwd(), file)}`);
    results.push({ n, label: concept.label, file, ok: true, elapsed });
  } catch (err) {
    console.error(`  ✗ failed: ${err?.message ?? err}`);
    results.push({ n, label: concept.label, ok: false, error: String(err) });
  }
}

const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} variants OK in ${totalElapsed}s`);
console.log(`Open them: open ${path.relative(process.cwd(), outDir)}/`);
