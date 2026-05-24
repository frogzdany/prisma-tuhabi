#!/usr/bin/env node
// Image-to-image edit via Gemini's gemini-2.5-flash-image (nano-banana) model.
// Takes an existing image + an edit instruction, produces an edited version.
//
// Usage:
//   node --env-file=.env.local scripts/edit-logo.mjs \
//     --in=public/brand/prisma/variant-3-flat-spectrum-icon.png \
//     --out=public/brand/prisma/variant-7-3d-from-v3.png \
//     --prompt="Render in 3D with depth and soft gloss; isometric angle."

import { GoogleGenAI } from "@google/genai";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flagKv = Object.fromEntries(
  args.filter((a) => a.startsWith("--") && a.includes("=")).map((a) => {
    const [k, ...rest] = a.slice(2).split("=");
    return [k, rest.join("=")];
  })
);

const IN = flagKv.in;
const OUT = flagKv.out;
const PROMPT = flagKv.prompt;
const MODEL = flagKv.model ?? "gemini-2.5-flash-image";

if (!IN || !OUT || !PROMPT) {
  console.error("Required: --in=<path> --out=<path> --prompt=<text>");
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY missing. Run with --env-file=.env.local");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

const inPath = path.resolve(IN);
if (!existsSync(inPath)) {
  console.error(`Input not found: ${inPath}`);
  process.exit(1);
}

console.log(`Editing image via ${MODEL}…`);
console.log(`  in:     ${path.relative(process.cwd(), inPath)}`);
console.log(`  out:    ${path.relative(process.cwd(), OUT)}`);
console.log(`  prompt: "${PROMPT.slice(0, 100)}${PROMPT.length > 100 ? "…" : ""}"\n`);

const buf = await readFile(inPath);
const b64 = buf.toString("base64");
const mimeType = inPath.endsWith(".png")
  ? "image/png"
  : inPath.endsWith(".jpg") || inPath.endsWith(".jpeg")
  ? "image/jpeg"
  : "image/png";

const t0 = Date.now();
let response;
try {
  response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          { inlineData: { mimeType, data: b64 } },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  });
} catch (err) {
  console.error(`Edit failed: ${err?.message ?? err}`);
  process.exit(1);
}
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

// Find the image part in the response.
const parts = response?.candidates?.[0]?.content?.parts ?? [];
const imagePart = parts.find((p) => p.inlineData?.data);
const textParts = parts.filter((p) => p.text).map((p) => p.text);

if (!imagePart) {
  console.error("No image in response.");
  if (textParts.length > 0) console.error("Model text response:", textParts.join("\n"));
  console.error("Full response (first 600 chars):", JSON.stringify(response).slice(0, 600));
  process.exit(1);
}

const outBuf = Buffer.from(imagePart.inlineData.data, "base64");
const outDir = path.dirname(path.resolve(OUT));
if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
await writeFile(OUT, outBuf);

console.log(`✓ ${(outBuf.length / 1024).toFixed(0)}KB in ${elapsed}s → ${OUT}`);
if (textParts.length > 0) {
  console.log("\nModel text:");
  console.log("  " + textParts.join("\n  "));
}
