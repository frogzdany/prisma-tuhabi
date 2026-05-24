#!/usr/bin/env node
// Brainstorm a product name with Gemini.
// Usage:
//   node --env-file=.env.local scripts/brainstorm-name.mjs
//   node --env-file=.env.local scripts/brainstorm-name.mjs --n=15
//   node --env-file=.env.local scripts/brainstorm-name.mjs --vibe=tech
//   node --env-file=.env.local scripts/brainstorm-name.mjs --model=gemini-2.5-pro
//   node --env-file=.env.local scripts/brainstorm-name.mjs --extra="must sound serious, no pet names"
//
// Output: prints a sorted shortlist + writes ../docs/name-candidates-YYYY-MM-DD.md

import { GoogleGenAI, Type } from "@google/genai";
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

const N = Number(flagKv.n ?? 12);
const VIBE = flagKv.vibe ?? "any"; // any | warm | tech | serious | playful | minimal
const MODEL = flagKv.model ?? "gemini-2.5-flash";
const EXTRA = flagKv.extra ?? "";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY missing. Run with --env-file=.env.local");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

const BRIEF = `Product brief — name brainstorm.

WHAT IT IS
A WhatsApp-first AI agent for the Mexican real-estate market. A seller texts a property opener in Mexican Spanish — within ~30 seconds the agent decides whether to route them to:
  1. iBuyer (Tuhabi direct cash purchase, fast, smaller net)
  2. Pulppo broker (Tuhabi's broker network, slower close, bigger net)
  3. Nurture (no immediate fit, stay in touch with market context)

PLUS the agent:
  • Shows a transparent fee + net-proceeds breakdown across the three routes (no broker has done this before in MX)
  • Drafts a Spanish reply, generates a Mexican-Spanish voice note (ElevenLabs)
  • Pre-generates an AI listing tour video (Imagen 4 + Veo 3) per property
  • Persists every decision (Supabase)

CONTEXT
  • Built for the GTM Hackathon CDMX (May 24, 2026), positioned as an internal tool for Tuhabi (Habi México + Pulppo, ~$1B combined transactions in 2025)
  • Currently uses a placeholder name "Prisma" (Spanish for "lifesaver / lifeguard") because it rescues leads that would otherwise be dropped at Tuhabi's buybox boundary (price ceiling, risk-tier, state-coverage gaps)
  • Could ship as either Tuhabi internal tool or standalone B2B SaaS for any Latin American iBuyer / brokerage
  • Primary audience: Mexican real-estate operators (CSMs, sales ops, AEs) — secondary: sellers themselves via WhatsApp

NAMING GOALS
  • Memorable in Mexican Spanish — should not feel like an awkward English transliteration
  • Brandable: ideally 2-3 syllables, easy to say, .com or .mx friendly (don't worry about availability, that's a separate check)
  • Convey ONE of: rescue/triage, routing/decisioning, transparency, speed, or a fresh take on "the right path for your home"
  • Could be a Spanish word, a hybrid, a coined word, or a metaphor — variety welcome
  • Should NOT feel like a copy of "Habi", "Pulppo", "Compass", "Opendoor", "Zillow"
  • Pronounceable by a non-Spanish speaker without too much pain (for international expansion)

VIBE FILTER for this run: ${VIBE}
${EXTRA ? `EXTRA CONSTRAINTS: ${EXTRA}` : ""}

Return ${N} candidates as JSON, ranked from strongest to weakest. For each:
  • name: the brand name (no taglines in this field)
  • tagline: a 4-8 word es-MX tagline that pairs with the name
  • rationale: 1-2 sentences explaining why this name fits the brief
  • vibe: warm | tech | serious | playful | minimal | poetic
  • etymology: short note on origin (Spanish word, coined, hybrid, etc.)
  • pronounceability: 1-5 (5 = easy globally)
  • riskFlags: array of short risks (e.g. "too close to Pulppo", "negative connotation", "trademark crowded"), empty array if none

Be honest. If a name has a real risk, flag it.`;

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    candidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          tagline: { type: Type.STRING },
          rationale: { type: Type.STRING },
          vibe: { type: Type.STRING },
          etymology: { type: Type.STRING },
          pronounceability: { type: Type.INTEGER },
          riskFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["name", "tagline", "rationale", "vibe", "pronounceability"],
      },
    },
    notes: { type: Type.STRING },
  },
  required: ["candidates"],
};

console.log(`Brainstorming with ${MODEL} (vibe=${VIBE}, n=${N})…\n`);

const t0 = Date.now();
const res = await ai.models.generateContent({
  model: MODEL,
  contents: [{ role: "user", parts: [{ text: BRIEF }] }],
  config: {
    responseMimeType: "application/json",
    responseSchema: SCHEMA,
    temperature: 0.85,
    maxOutputTokens: 16000,
  },
});
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

let parsed;
try {
  parsed = JSON.parse(res.text ?? "{}");
} catch (err) {
  console.error("Could not parse JSON response:");
  console.error(res.text?.slice(0, 600));
  process.exit(1);
}

const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
if (candidates.length === 0) {
  console.error("No candidates returned.");
  process.exit(1);
}

// ----- Pretty print to stdout -----
console.log(`Got ${candidates.length} candidates in ${elapsed}s\n`);
console.log("═".repeat(80));
for (let i = 0; i < candidates.length; i++) {
  const c = candidates[i];
  const rank = String(i + 1).padStart(2, "0");
  const pron = "★".repeat(c.pronounceability ?? 0) + "·".repeat(5 - (c.pronounceability ?? 0));
  console.log(`\n${rank}. ${c.name}    [${c.vibe}]    pron ${pron}`);
  console.log(`    "${c.tagline}"`);
  console.log(`    ${c.rationale}`);
  if (c.etymology) console.log(`    etym: ${c.etymology}`);
  if (c.riskFlags?.length > 0) {
    console.log(`    ⚠ ${c.riskFlags.join(" · ")}`);
  }
}
console.log("\n" + "═".repeat(80));
if (parsed.notes) console.log(`\nModel notes: ${parsed.notes}`);

// ----- Write markdown file for archival -----
const today = new Date().toISOString().slice(0, 10);
const outDir = path.join(process.cwd(), "..", "docs");
if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, `name-candidates-${today}.md`);

const md = [
  `# Name candidates — ${today}`,
  ``,
  `Generated by \`scripts/brainstorm-name.mjs\` against \`${MODEL}\`.`,
  ``,
  `**Brief:** WhatsApp-first AI agent for Mexican real-estate seller triage. Routes leads between Tuhabi iBuyer, Pulppo broker, and nurture, with transparent fee scenarios and pre-baked AI listing tour video.`,
  ``,
  `**Filter:** vibe=\`${VIBE}\`, n=${candidates.length}${EXTRA ? `, extra=\`${EXTRA}\`` : ""}`,
  ``,
  `---`,
  ``,
  `| # | Name | Tagline | Vibe | Pron | Notes |`,
  `|---|---|---|---|---|---|`,
  ...candidates.map((c, i) => {
    const flags = c.riskFlags?.length ? ` ⚠ ${c.riskFlags.join("; ")}` : "";
    return `| ${i + 1} | **${c.name}** | _${c.tagline}_ | ${c.vibe} | ${c.pronounceability ?? "?"}/5 | ${c.rationale}${flags} |`;
  }),
  ``,
  `## Etymology details`,
  ``,
  ...candidates.flatMap((c) => [`- **${c.name}** — ${c.etymology ?? "—"}`]),
  ``,
  ...(parsed.notes ? [`## Model notes`, ``, parsed.notes, ``] : []),
].join("\n");

await writeFile(outFile, md);
console.log(`\n→ Wrote ${path.relative(process.cwd(), outFile)}`);
console.log("");
