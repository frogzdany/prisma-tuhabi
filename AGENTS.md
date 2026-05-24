# Notes for AI coding agents working on Prisma

Read this file before editing. It documents conventions specific to this repo so you do not have to rediscover them every session. `CLAUDE.md` inlines this file via `@AGENTS.md`, so anything here applies to Claude Code too.

## What this repo is

Prisma is a WhatsApp triage demo for Tuhabi. A property seller sends a WhatsApp message, the agent decides the best route (iBuyer, Pulppo asesor, or nurture) in about 30 seconds, and replies with a transparent fee breakdown and a voice note.

The live agent runs as a Next.js 16 API route (`/api/triage`) that streams Server Sent Events while a nine tool chain executes. The frontend renders a particle visualizer, a WhatsApp mockup, a React Flow node graph, and a decision card.

## Next.js 16 caveat

This version has breaking changes vs Next 14 or 15. APIs, conventions, and file structure may differ from your training data. Before writing route handlers, server actions, caching, or middleware, check `node_modules/next/dist/docs/` for the current guide. Heed deprecation notices.

## Project layout (the important parts)

```
app/
  page.tsx                 The root URL serves the demo. Renders PrismaClient.
  PrismaClient.tsx         All the client state for the demo. Section reveals, scenarios, decision.
  api/triage/route.ts      POST endpoint. Streams trace events via SSE. Rate limited.
  layout.tsx               Hardcodes dark mode on the html element.

components/
  prisma/                  Header and listing tour card.
  prisma-core/             The particle visualizer. Shape and color drive from props.
  agent-flow/              React Flow node graph with the nine step chain.
  whatsapp/                Phone mockup (text bubble, voice note, video tour).
  leaflet/                 OSM map with a custom marker.
  agent-trace/             Type definitions for the SSE trace events.
  ui/                      Chakra provider + emotion registry.

lib/
  agent/
    run-triage.ts          The agent loop. Runs Anthropic, dispatches tools, yields events.
    tools-prisma.ts        Tool definitions (extract_intent, lookup_zone_risk, ...).
    prompts-prisma.ts      System prompt + draft reply prompt. Edit here to retune the agent.
  shared/
    schemas.ts             Zod schemas for the triage decision, scenarios, brokers.
    mocks-prisma.ts        Fixture seller messages + zone risk table + Habimetro mock + broker list.
    fees.ts                Fee scenario computation (iBuyer / Pulppo / Nurture).
  elevenlabs.ts            Voice note generation + Supabase storage upload.
  supabase/                Client + admin client. Admin needs SUPABASE_SECRET_KEY.
  rate-limit.ts            In memory sliding window. 10 / hour per IP.

scripts/                   One off CLI helpers. Run with `node --env-file=.env.local scripts/<file>.mjs`.
supabase/migrations/       Database schema. Apply via Supabase CLI or dashboard.
deck/                      Presentation slides and demo scripts.
docs/                      Screenshots and the longer demo script.
```

## Conventions to keep

- **Seller facing copy.** All on screen text is in es-MX and written for a property seller, not for engineers. When you add a tool or a label, write the seller variant first (`hintSeller`) and the technical variant (`hint`) second. Tool names like `extract_intent` must never appear on screen unless the `Detalles tecnicos` toggle is on.
- **No red theme.** The visualizer palette is emerald, indigo, cyan, teal, amber. Rose is reserved for error states only.
- **Plain text in user facing copy.** No em dashes, no smart quotes, no decorative unicode. The README and demo materials follow this rule too.
- **Per tool shape and color in the visualizer.** When you add a tool, also add an entry to `TOOL_VISUAL` in `app/PrismaClient.tsx` and (optionally) a custom shape path in `components/prisma-core/PrismaCore.tsx`. Falls back to a generic shape if missing.
- **Mock mode must always work.** `/api/triage?mock=1` returns a canned decision without calling Anthropic or ElevenLabs. Never break this path. It is the demo backup when network or credits fail.
- **Rate limiting bypass.** Mock calls and authenticated Make.com server to server calls skip the limit. Anything else is capped at 10 per hour per IP.

## Adding a new tool to the agent chain

1. Define the schema in `lib/agent/tools-prisma.ts` (`name`, `description`, `input_schema`, handler).
2. Add it to the agent dispatch in the same file.
3. Add a `TOOL_META` entry in `components/agent-flow/AgentFlow.tsx` (icon, seller label, seller hint, technical hint, provider, kind).
4. Add a `TOOL_SELLER_LABELS` entry in `app/PrismaClient.tsx`.
5. Add a `TOOL_VISUAL` entry in `app/PrismaClient.tsx` to map the tool to a visualizer shape and color.
6. Add it to the snake position table in `AgentFlow.tsx` so the chain renders correctly.
7. Test with `?mock=1` first, then live.

## Adding a new seller scenario (cloud)

1. Add the opener text to `FIXTURES` in `lib/shared/mocks-prisma.ts`.
2. Add a `FIXTURE_META` entry in `app/PrismaClient.tsx` with the colonia, lat / lng, tag, color palette.
3. Update `ZONE_RISK_TABLE` in `mocks-prisma.ts` if the new colonia is not already covered.

## Verifying changes

```
npm run dev               # local dev server on :3000
npx tsc --noEmit          # typecheck (no test suite yet)
npx vercel deploy --prod  # ship to production
```

There is no test suite. Typecheck plus a manual run through the Ecatepec scenario covers the happy path.

## Useful entry points when stuck

- The full nine step flow runs inside `lib/agent/run-triage.ts`. Start there to understand sequencing.
- For UI state machine questions read `app/PrismaClient.tsx`. The section reveal logic and decision derivation live there.
- For "why does the visualizer look like X right now" read `prismaShape` and `prismaTheme` in `PrismaClient.tsx`.
- For deployment quirks see the top level `README.md`.
