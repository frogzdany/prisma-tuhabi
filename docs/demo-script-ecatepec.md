# Prisma demo script — Ecatepec walkthrough

**Team:** Braulio · Joseph · Daniel
**Target length:** ~5 min live demo + 2 min Q&A buffer
**Hero case:** **Ecatepec** (Pulppo route · riesgo alto)
**URL:** `localhost:3000/prisma` (or staging)

The demo only triggers one cloud — Ecatepec — but the other three (Roma Norte, Pedregal, Oaxaca) stay visible on screen as silent proof that Prisma routes every type of lead, not just this one. Use them for Q&A if asked.

---

## Roles at a glance

| # | Owner | Section | Time |
|---|---|---|---|
| 1 | **Braulio** | Hook + problem | 1:00 |
| 2 | **Joseph** | Live walkthrough (Ecatepec) | 2:30 |
| 3 | **Daniel** | Business close + tech depth | 1:30 |
| — | All three | Q&A | open |

Swap roles freely — match the strongest speaker to the section they own best. The script below names presenters for clarity, not authority.

---

## Pre-demo checklist (do this 5 min before)

- [ ] `cd aftercall && npm run dev` — server up on `:3000`
- [ ] Browser: open `localhost:3000/prisma` in a fresh tab, hard-refresh (`⌘⇧R`)
- [ ] **Hide bottom-corner dev badge** — should already be off via `devIndicators: false`; if you see one, restart `npm run dev`
- [ ] `Detalles técnicos` toggle in the agent-flow header is **OFF** (default seller view)
- [ ] Sound check — laptop volume up; the voice note plays back from WhatsApp mockup
- [ ] Resize Chrome to ~1440×900 so the 3-col layout breathes
- [ ] Have **slide 1** ready (problem hook, optional) on a second screen, OR skip slides entirely and own it from the browser
- [ ] Pin the Ecatepec text in muscle memory: *"Vendo casa en Ecatepec, son 90 metros y 3 recámaras. Me urge porque me mudo al norte por trabajo en 4 semanas. Sé que la zona está difícil pero ahí está la propiedad."*

---

## 1 · Hook + problem — **Braulio** (1:00)

> *Stand at the laptop, don't click anything yet. Page is on `/prisma`, header + 4 clouds + step indicator visible. Steps 2 & 3 are dimmed.*

**Opener (verbatim suggestion):**

> "Tuhabi acaba de cerrar mil millones de dólares en transacciones combinadas. Pero hay una fuga que nadie está midiendo. El iBuyer promedia un millón de pesos. Pulppo promedia seis. En el medio — propiedades de uno a cinco millones, zonas con riesgo medio, vendedores con urgencia — hay entre **10 y 20 mil vendedores al año** que llegan a Tuhabi, no encajan en el buybox del iBuyer, y se pierden antes de llegar a Pulppo."

**Bridge to demo:**

> "Construimos Prisma. Un agente de IA que en menos de 30 segundos, después del primer WhatsApp del vendedor, decide la mejor ruta — iBuyer directo, asesor Pulppo, o nurture — y le manda al vendedor una nota de voz con el desglose transparente de la comisión y el neto que recibe en cada escenario. Joseph les va a mostrar cómo funciona con un caso real."

**Hand off:** "Joseph, llévatelo."

> *Step away from the laptop. Joseph takes the mouse.*

---

## 2 · Live walkthrough — **Joseph** (2:30)

> *You drive. Don't apologize, don't narrate clicks ("I'm going to click here"). Narrate what the **agent** is doing.*

### Beat 1 — pick the case (0:15)

> *Hover over the Ecatepec cloud. Read the preview out loud.*

> "Este es un vendedor real. Casa en Ecatepec, riesgo alto según INEGI, urgencia de cuatro semanas. Históricamente este lead se cae — no entra al buybox del iBuyer y se pierde antes de llegar al asesor correcto. Vamos a triarlo."

> *Click Ecatepec.* The cloud highlights, the page smooth-scrolls to **Step 2**, agent run starts.

### Beat 2 — narrate the live triage (1:30)

> *Stay quiet for a beat while the particle visualizer morphs from speech-bubble → pin → coin → check → group → scales → document → waveform → disk. Each shape lights a node in the chain on the right, each node fills its bubble green.*

Talking points (don't list — pick 2-3 that land):

- **Speech bubble** — *"Lee el WhatsApp del vendedor"* — entiende la zona, urgencia, metros, recámaras.
- **Pin** — *"Resuelve la colonia"* — Ecatepec, Estado de México, riesgo 4 sobre 5.
- **Coin** — *"Estima el valor"* — Habímetro Tuhabi marca cerca de dos millones netos.
- **Check** — *"Compara con el buybox de Tuhabi"* — riesgo alto, queda fuera del iBuyer.
- **Group** — *"Busca asesores Pulppo en Ecatepec"* — encuentra a Ricardo Martínez, con 22 cierres recientes en la zona.
- **Scales** — *"Compara las tres rutas"* y elige la mejor para el vendedor, no para el más rentable.
- **Document → Waveform → Disk** — *"Redacta el mensaje, genera la nota de voz, guarda el caso"*.

> *When the green check appears + `Análisis completado` lands + page slides to Step 3:*

> "Listo. Ocho segundos, nueve herramientas, cero intervención humana."

### Beat 3 — show the seller experience (0:30)

> *Point at the WhatsApp mockup on the left.*

> "Esto es lo que el vendedor recibe. Un mensaje claro, en es-MX, con el nombre del asesor y un compromiso concreto. Y arriba — *(point at video)* — el tour generado con IA de su propiedad, para que el asesor ya tenga material que mandar a posibles compradores antes de la visita."

> *Tap the play button on the voice note. Let it play 3-4 seconds, then pause.*

### Beat 4 — open the decision (0:15)

> *Scroll to Step 3. Three fee-scenario cards visible.*

> "Aquí está el momento de transparencia. Le mostramos al vendedor las tres rutas con el neto que recibe en cada una. iBuyer no califica, Pulppo le da 1.88 millones, nurture le da dos. La recomendación es Pulppo, porque cierra en 45 días con un asesor que conoce su colonia. Decide el vendedor, no nosotros."

**Hand off:** "Daniel cierra con los números del negocio."

> *Step back. Daniel takes over.*

---

## 3 · Business close + tech depth — **Daniel** (1:30)

> *Stand near the laptop but don't click yet. Audience attention reset to you.*

### Beat 1 — business landing (0:45)

Three numbers:

1. **30 segundos por triaje.** Operativamente cabe en cualquier embudo de WhatsApp que ya tiene Tuhabi.
2. **Cero comisiones para el iBuyer, transparencia total para Pulppo.** El vendedor ve el desglose antes de elegir — eso baja la fricción y sube el cierre.
3. **5 centavos de dólar por corrida** sobre el modelo más barato. A 50 mil leads al año son **dos mil quinientos dólares** en costo de IA — menos de lo que cuesta un asesor junior un mes.

> "Si Prisma recupera apenas el 5% de los 10-20 mil vendedores que hoy se caen, son **500 a 1,000 transacciones incrementales al año**. A ticket Pulppo promedio, eso es entre tres y seis millones de dólares de GMV recuperado, con un costo de IA por debajo de cinco mil dólares."

### Beat 2 — tech proof point (0:30)

> *Reach over, click the `Detalles técnicos` toggle in the agent-flow header. The chain reveals tool names + provider chips: `Anthropic · INEGI · Tuhabi · Pulppo · ElevenLabs · Supabase · Make.com`.*

> "Esto no es una demo de papel. Son nueve herramientas, cinco integraciones reales — Anthropic para el lenguaje, ElevenLabs para la voz, INEGI para riesgo zonal, el CRM de Pulppo para encontrar al asesor, Supabase para persistencia. La capa de Tuhabi — Habímetro, buybox, comisiones — corre internamente. Lo construimos en dos días sobre Next.js. **Lo podemos shippear sobre la infraestructura existente de Tuhabi en dos sprints.**"

> *Toggle `Detalles técnicos` back OFF before Q&A so the screen is calm.*

### Beat 3 — close (0:15)

> "Prisma cierra la fuga entre iBuyer y Pulppo. Sin pelearse con ningún producto. Sin pedirle al vendedor que escoja antes de tener información. Y con la IA pagándose sola desde el primer mes."

> "Preguntas."

---

## Q&A prep — split by who answers what

| Likely question | Owner |
|---|---|
| "¿Qué pasa con los otros tres casos?" | **Joseph** — click Roma Norte cloud, run it; show iBuyer route (~10 días, neto $1.7M). |
| "¿Y si la zona no está cubierta?" | **Joseph** — click Oaxaca cloud; show Nurture route (lista de espera, cero comisión). |
| "¿Cómo manejan riesgo / compliance / PII?" | **Daniel** — PII redacted on save (visible in the textarea label), Supabase RLS, decisión auditada con `decisionId` y `leadId`. |
| "¿Cuánto cuesta entrenar / mantener?" | **Daniel** — no fine-tuning, prompt-engineering puro sobre Haiku; los prompts viven en `lib/agent/prompts-prisma.ts`, los cambia un PM sin tocar código. |
| "¿Por qué Haiku y no GPT-4 / Sonnet?" | **Daniel** — 5x más barato por corrida, latencia consistente sub-segundo por tool, es-MX nativo. Sonnet es backup. |
| "¿Cómo se integra con Make.com / el embudo actual?" | **Braulio** — `/api/triage` recibe POST con el texto del WhatsApp + fixtureId opcional; Make.com llama esto desde el webhook actual de Twilio/Meta. |
| "¿Sound del audio? ¿Por qué esa voz?" | **Joseph** — ElevenLabs `eleven_multilingual_v2`, voz Sarah; se cambia con una variable de entorno; tenemos script para audicionar otras (`scripts/preview-elevenlabs-female-voices.mjs`). |
| "¿Qué pasa si el modelo se equivoca?" | **Daniel** — cada decisión tiene `confidence` numérica; abajo del umbral cae a nurture humano con asesor de guardia. La decisión queda guardada para retroalimentar el modelo. |
| "¿Multi-tenant / por broker?" | **Daniel** — el agente es stateless, el buybox y la tabla de comisiones son configurables por org. Pulppo y Tuhabi correrían cada uno con su buybox. |

---

## If something breaks on stage

| Failure | Recovery |
|---|---|
| `/api/triage` hangs or errors | **Joseph:** add `?mock=1` to the URL, refresh, click Ecatepec again. Mock mode replays a baked Pulppo decision without hitting Anthropic/ElevenLabs. |
| Voice note silent | **Joseph:** skip the play button, point at the text reply + the video tour, move on. Audio is gravy, not the core message. |
| Internet drops | Switch to phone hotspot; the demo is small (~200KB of streaming JSON), it'll work on 3G. If totally offline, run with `?mock=1` (works without network for the LLM call). |
| Browser zooms wrong, layout breaks | `⌘0` to reset zoom, hard refresh. |
| Particles freeze mid-run | Don't apologize — say "el agente sigue trabajando en el backend" and let the WhatsApp + flow chain carry the moment. Refresh only if you can do it under 3 seconds. |

---

## What we are NOT showing (resist scope creep)

- Roma Norte / Pedregal / Oaxaca clouds — only on demand during Q&A.
- The Aftercall deal-room route (`/generate`, `/room`) — different product, separate demo.
- Make.com flow internals, Supabase tables, Anthropic dashboards — too much for 5 minutes, save for follow-up.
- The "Escribir mi propio mensaje" editor — only if a judge asks "can I try one?", then Joseph opens it on demand.

---

## Timing template (rehearse against this)

```
00:00 – Braulio opens (hook + problem)
01:00 – Joseph clicks Ecatepec, demo starts
01:15 – Particle visualizer + flow chain narration
02:45 – WhatsApp seller experience + voice note
03:15 – Decision card + fee scenarios
03:30 – Daniel takes over for business close
04:15 – Toggle Detalles técnicos for the tech proof point
04:45 – Close + open Q&A
```

If you run long, cut the `Detalles técnicos` toggle — the business numbers earn the slot more than the tech detail. If you run short, take a beat after the green check lands and let the audience absorb it before moving on.
