// Genera Prisma_Spec_ES.docx desde el spec interno.
// Uso: node docs/_build/build-prisma-doc.mjs
import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const OUT_PATH = path.resolve("docs/Prisma_Spec_ES.docx");

// --- Helpers --------------------------------------------------------------

const FONT = "Arial";
const ACCENT = "2A4DCB"; // azul Tuhabi-friendly
const MUTED = "5A6478";
const BORDER_GRAY = "CCCCCC";
const PAGE_WIDTH_DXA = 12240; // US Letter
const MARGIN_DXA = 1440; // 1"
const CONTENT_WIDTH = PAGE_WIDTH_DXA - 2 * MARGIN_DXA; // 9360 DXA

function txt(text, opts = {}) {
  return new TextRun({ text, font: FONT, ...opts });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 300 },
    ...opts,
    children: Array.isArray(text)
      ? text
      : [new TextRun({ text, font: FONT })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 36 })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 28 })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({ text, font: FONT, bold: true, size: 24, color: ACCENT }),
    ],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80, line: 280 },
    children: Array.isArray(text)
      ? text
      : [new TextRun({ text, font: FONT })],
  });
}

function numbered(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { after: 80, line: 280 },
    children: Array.isArray(text)
      ? text
      : [new TextRun({ text, font: FONT })],
  });
}

function quote(text) {
  return new Paragraph({
    spacing: { before: 160, after: 200, line: 300 },
    indent: { left: 720 },
    border: {
      left: {
        style: BorderStyle.SINGLE,
        size: 18,
        color: ACCENT,
        space: 14,
      },
    },
    children: [
      new TextRun({ text, font: FONT, italics: true, color: MUTED }),
    ],
  });
}

function cell({ content, widthDxa, header = false, shade = null }) {
  const paragraphs = Array.isArray(content) ? content : [content];
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
    },
    shading: shade
      ? { fill: shade, type: ShadingType.CLEAR, color: "auto" }
      : header
        ? { fill: "EEF2FB", type: ShadingType.CLEAR, color: "auto" }
        : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: paragraphs.map((c) =>
      typeof c === "string"
        ? new Paragraph({
            spacing: { after: 0 },
            children: [
              new TextRun({
                text: c,
                font: FONT,
                bold: header,
                size: header ? 20 : 20,
              }),
            ],
          })
        : c,
    ),
  });
}

function table({ headers, rows, colWidthsRel }) {
  const totalRel = colWidthsRel.reduce((a, b) => a + b, 0);
  const widths = colWidthsRel.map((w) =>
    Math.floor((CONTENT_WIDTH * w) / totalRel),
  );
  // Ajustar el último para que sume exacto
  const sum = widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] += CONTENT_WIDTH - sum;
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      cell({ content: h, widthDxa: widths[i], header: true }),
    ),
  });
  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((c, i) =>
          cell({ content: c, widthDxa: widths[i] }),
        ),
      }),
  );
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows],
  });
}

function spacer() {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: "", font: FONT })],
  });
}

// --- Contenido ------------------------------------------------------------

const children = [];

// Portada
children.push(
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: "PRISMA",
        font: FONT,
        bold: true,
        size: 56,
        color: ACCENT,
      }),
    ],
  }),
);
children.push(
  new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: "Triage de leads con IA para Tuhabi",
        font: FONT,
        size: 32,
      }),
    ],
  }),
);
children.push(
  new Paragraph({
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: "Especificación del PoC · Hackathon GTM CDMX · 24 de mayo de 2026",
        font: FONT,
        size: 22,
        color: MUTED,
      }),
    ],
  }),
);

// Resumen ejecutivo
children.push(h1("Resumen ejecutivo"));
children.push(
  p(
    "Prisma es una herramienta de triage de leads con IA pensada específicamente para el equipo de adquisición de Tuhabi. En menos de 30 segundos, después del primer mensaje de WhatsApp de un vendedor, el sistema decide la mejor ruta para esa propiedad —compra directa (iBuyer), broker de Pulppo o nurture— y le muestra al vendedor un desglose transparente de la comisión y del monto neto que recibiría en cada escenario.",
  ),
);
children.push(
  p(
    "El objetivo del PoC es demostrar, en una sola pantalla y en tres minutos, que se puede recuperar la mayoría de leads que Tuhabi pierde hoy por restricciones de buybox, cobertura geográfica o nivel de precio.",
  ),
);

// Por qué Tuhabi y por qué ahora
children.push(h1("Contexto: por qué Tuhabi y por qué ahora"));
children.push(
  p(
    "Tuhabi acaba de adquirir Pulppo (enero de 2026) y ahora opera un ecosistema combinado que facilitó aproximadamente mil millones de dólares en transacciones residenciales durante 2025. Sin embargo, los datos públicos muestran un hueco enorme entre los rangos de precio que cubre cada lado del negocio:",
  ),
);

children.push(
  table({
    headers: ["Métrica", "Valor", "Fuente"],
    colWidthsRel: [38, 28, 34],
    rows: [
      [
        "Volumen combinado Tuhabi + Pulppo 2025",
        "≈ 1 000 millones USD",
        "Bloomberg / Globe and Mail",
      ],
      ["Volumen Tuhabi solo 2025", "800 millones USD", "Expansión"],
      [
        "Volumen Pulppo 2024 → 2025",
        "200 → 215 millones USD (+7,5 %)",
        "Expansión",
      ],
      [
        "Rango buybox iBuyer Tuhabi",
        "500 000 – 4 000 000 MXN",
        "Expansión / El CEO",
      ],
      ["Ticket promedio Pulppo", "6 millones MXN o más", "Expansión"],
      [
        "Estados con cobertura iBuyer",
        "11 de 32 (CDMX, EDOMEX, Jalisco, NL, etc.)",
        "Centro de Ayuda Tuhabi",
      ],
      [
        "Consultas Habímetro acumuladas",
        "Más de 1 millón",
        "Construction Supply Magazine",
      ],
      [
        "Capital fresco en México (H1 2026)",
        "Aprox. 100 millones USD",
        "LexLatin / BBVA Spark",
      ],
      [
        "Estrategia explícita de Tuhabi a 2030",
        "Inversión en IA y datos",
        "Expansión / LatamList",
      ],
      [
        "Tasa de rechazo estimada en iBuyer (benchmark Opendoor)",
        "40 – 60 % de los leads",
        "Industria",
      ],
    ],
  }),
);
children.push(spacer());

children.push(
  p(
    "La conclusión es directa: cada vez que un vendedor mexicano contacta a Tuhabi con una propiedad fuera del buybox (por precio, ubicación o riesgo), el lead se pierde o se enruta de forma manual y lenta a Pulppo. Estimamos que esto representa entre 10 000 y 20 000 vendedores rechazados al año, equivalente a más de 9 millones de dólares anuales en comisiones recuperables si se enrutan correctamente al network de Pulppo.",
  ),
);

// Problema e idea
children.push(h1("Problema e idea"));
children.push(h2("El problema en una frase"));
children.push(
  quote(
    "Cada vendedor que no encaja en el buybox de Tuhabi hoy se enruta a Pulppo de forma manual o recibe un rechazo genérico. En ambos casos el lead pierde momentum o se muere.",
  ),
);
children.push(h2("La idea en una frase"));
children.push(
  quote(
    "Un triage conversacional con IA que, dentro de los primeros 30 segundos del mensaje de WhatsApp del vendedor, decide la ruta correcta (iBuyer, broker Pulppo o nurture) y muestra al vendedor el costo y el monto neto de cada opción de manera transparente.",
  ),
);

// Por qué gana
children.push(h1("Por qué gana frente al jurado"));
children.push(
  p(
    "Mapeo directo a los cinco criterios de evaluación del Hackathon (25 puntos en total):",
  ),
);
children.push(
  table({
    headers: ["Criterio", "Cómo lo cumple Prisma"],
    colWidthsRel: [25, 75],
    rows: [
      [
        "Impacto (5 pts)",
        "Más de 9 millones USD al año en comisiones recuperables sólo del flujo iBuyer. Cada caso de la demo es un patrón de pérdida que el jurado reconoce inmediatamente.",
      ],
      [
        "Ejecución (5 pts)",
        "Corre en vivo: llamadas reales a Claude, voz real en español mexicano vía ElevenLabs, persistencia real en Supabase y traza del agente en streaming. Los datos mockeados están claramente etiquetados.",
      ],
      [
        "Creatividad (5 pts)",
        "Diseñado específicamente para Tuhabi (no es otro SDR genérico). Primero WhatsApp, no email. Voz en español mexicano. Mapa con halo de riesgo. El momento de transparencia del fee es novedoso.",
      ],
      [
        "Automatización (5 pts)",
        "Sistema reutilizable por lead. Cada mensaje nuevo → triage → ruta → handoff → notificación. Es un flujo recurrente, no un one-shot.",
      ],
      [
        "Presentación (5 pts)",
        "Una sola pantalla. Cada caso corre en ~8 segundos. La revelación del trade-off de comisiones es visceral. Cuatro casos = cuatro outcomes diferentes en menos de 2 minutos.",
      ],
    ],
  }),
);
children.push(spacer());
children.push(
  p(
    "El test de “¿lo usaría el equipo de adquisición el lunes en la mañana?” se cumple literalmente: esto es una herramienta interna pensada para Tuhabi, no un pitch genérico de SaaS.",
  ),
);

// Flujo de la demo
children.push(h1("Flujo de la demo (3 minutos)"));
children.push(
  p(
    "Una sola pantalla con dos paneles: a la izquierda la conversación de WhatsApp y un mini-mapa de México con pin; a la derecha, la traza del agente y el bloque de decisión + tarjetas de escenarios de comisión.",
  ),
);
children.push(h3("0:00 – 0:20 · Encuadre"));
children.push(
  quote(
    "Tuhabi acaba de anunciar mil millones de dólares en transacciones combinadas. Pero el iBuyer promedia un millón de pesos y Pulppo seis millones. Hay una fuga. La medimos: entre 10 y 20 mil vendedores rechazados al año sólo por mismatch de buybox. Prisma la tapa.",
  ),
);
children.push(h3("0:20 – 0:50 · Caso 1: ruta verde iBuyer (Roma Norte, 2 M MXN, urgente)"));
children.push(
  bullet(
    "Se pega el opener de WhatsApp del vendedor; la traza del agente se transmite a la derecha con cuatro tool calls (extract, habímetro, INEGI, urgencia).",
  ),
);
children.push(
  bullet(
    "Tarjeta de decisión: iBuyer recomendado, 10 días, 1,74 M MXN netos (13 % de fee de conveniencia).",
  ),
);
children.push(
  bullet(
    "La voz suena en español mexicano: “Hola Carlos, somos Tuhabi. Podemos cerrar en 10 días con oferta directa…”",
  ),
);

children.push(h3("0:50 – 1:30 · Caso 2: bifurcación a Pulppo de alto valor (Pedregal, 8 M MXN)"));
children.push(
  bullet(
    "Mismo flujo, decisión distinta: Pulppo broker (luxury), tres brokers encontrados, ~45 días, 7,52 M MXN netos (6 % de comisión).",
  ),
);
children.push(
  bullet(
    "Tarjeta del trade-off: iBuyer imposible (>4 M de techo). Pulppo te recupera +7,5 M que habrías perdido.",
  ),
);

children.push(h3("1:30 – 2:00 · Caso 3: Ecatepec (riesgo + buybox rechazado, 850 K MXN, urgente)"));
children.push(
  bullet("El mapa muestra un halo rojo de riesgo sobre el polígono de Ecatepec."),
);
children.push(
  bullet(
    "iBuyer bloqueado (tier de riesgo 4) → Pulppo especializado en EDOMEX matcheado.",
  ),
);
children.push(
  bullet(
    "Handoff: mensaje de WhatsApp redactado para el broker con el contexto completo, listo para enviar.",
  ),
);

children.push(h3("2:00 – 2:30 · Caso 4: Oaxaca (sin cobertura, 600 K MXN, baja urgencia)"));
children.push(
  bullet("Sin presencia iBuyer, sin broker Pulppo en la zona."),
);
children.push(
  bullet(
    "Ruta nurture: el agente genera estimación personalizada con Habímetro, contexto de mercado y agrega al vendedor a la lista de espera de expansión.",
  ),
);
children.push(
  quote("Cero leads perdidos. Aunque Tuhabi no pueda comprar, mantenemos la relación."),
);

children.push(h3("2:30 – 3:00 · Cierre"));
children.push(
  bullet(
    "Slide de arquitectura con logos de patrocinadores (Anthropic, ElevenLabs, Supabase, Make/Clay si se usan).",
  ),
);
children.push(
  bullet(
    "“Construido hoy. Oportunidad de comisiones de 9 millones USD al año. Reutiliza el ecosistema propio de Tuhabi: Habímetro, Pulppo, propiedades.com. La URL de la demo está viva.”",
  ),
);

// Los cuatro casos
children.push(h1("Los cuatro casos (matriz de ruteo)"));
children.push(
  p(
    "Estos son los únicos datos de prueba que necesitamos. Cada caso es un opener de WhatsApp en español mexicano realista. Las cuatro decisiones cubren las cuatro patologías clásicas de pérdida de leads.",
  ),
);
children.push(
  table({
    headers: ["#", "Opener (es-MX)", "Inmueble", "Habímetro", "Urgencia", "Decisión"],
    colWidthsRel: [4, 36, 16, 14, 12, 18],
    rows: [
      [
        "1",
        "“Hola, vendo mi depa en Roma Norte. Me urge porque me transfieren a Madrid en tres semanas.”",
        "Depto 75 m², 2 rec — Roma Norte, CDMX",
        "2 000 000 MXN",
        "92/100",
        "iBuyer directo",
      ],
      [
        "2",
        "“Tenemos casa familiar en el Pedregal. La heredamos entre cuatro hermanos y queremos vender.”",
        "Casa 320 m², 4 rec — Pedregal, CDMX",
        "8 000 000 MXN",
        "55/100",
        "Pulppo (luxury)",
      ],
      [
        "3",
        "“Vendo casa en Ecatepec, me urge porque me mudo al norte por trabajo. La zona está difícil pero ahí está.”",
        "Casa 90 m², 3 rec — Ecatepec, EDOMEX",
        "850 000 MXN",
        "88/100",
        "Pulppo (EDOMEX)",
      ],
      [
        "4",
        "“Tengo casa pequeña en Oaxaca de Juárez, quiero saber qué opciones tengo.”",
        "Casa 60 m², 2 rec — Oaxaca",
        "600 000 MXN",
        "30/100",
        "Nurture + Habímetro",
      ],
    ],
  }),
);
children.push(spacer());
children.push(
  p(
    "Dos de cuatro casos van a Pulppo (lead salvado), uno al iBuyer (ingreso directo) y uno a nurture (ningún lead perdido). El mix cuenta la historia completa.",
  ),
);

// Arquitectura
children.push(h1("Arquitectura"));
children.push(
  p(
    "El stack es deliberadamente ligero porque reutilizamos el andamiaje del proyecto Aftercall ya construido:",
  ),
);
children.push(bullet("Next.js 16 + Chakra UI v3 + Supabase como base (ya en pie)."));
children.push(bullet("Nueva ruta /prisma como pantalla showcase."));
children.push(bullet("Nueva API /api/triage con streaming SSE para mostrar la traza."));
children.push(bullet("Herramientas del agente en lib/agent/tools-prisma.ts."));
children.push(
  bullet(
    "Esquemas Zod nuevos: Lead, TriageDecision, FeeScenario, PulppoBroker, ZoneInfo.",
  ),
);
children.push(
  bullet(
    "Tablas Supabase nuevas: leads y triage_decisions (más reutilización de room_events para tracking).",
  ),
);
children.push(
  bullet(
    "Helpers compartidos con Aftercall: tema, provider de Chakra, helper de ElevenLabs y clientes de Supabase.",
  ),
);
children.push(
  p(
    "Aftercall queda vivo en /generate como demo de respaldo en caso de cualquier problema durante la presentación.",
  ),
);

// Herramientas del agente
children.push(h1("Herramientas del agente"));
children.push(
  p(
    "El agente Claude opera un loop de tool use de 6-9 pasos. Cada herramienta tiene un schema Zod con tipos estrictos. Algunas son funciones deterministas (sin llamadas LLM); otras son llamadas anidadas al modelo para tareas específicas.",
  ),
);
children.push(
  table({
    headers: ["#", "Herramienta", "Propósito", "Real / Mock"],
    colWidthsRel: [5, 25, 50, 20],
    rows: [
      [
        "1",
        "extract_intent",
        "Parsea el opener → ubicación, tipo de inmueble, urgencia, motivaciones, precio mencionado.",
        "Real (Claude)",
      ],
      [
        "2",
        "lookup_habimetro",
        "Dado ubicación + tipo de inmueble, devuelve valor estimado.",
        "Mock (tabla canned)",
      ],
      [
        "3",
        "lookup_zone_risk",
        "Dado polígono/colonia, devuelve tier de riesgo 1-5 + DoM promedio.",
        "Mock (tabla canned)",
      ],
      [
        "4",
        "check_buybox",
        "Aplica las reglas públicas de Tuhabi: 500 K – 4 M MXN, riesgo ≤ 3, estado cubierto.",
        "Real (lógica determinista en Node)",
      ],
      [
        "5",
        "find_brokers",
        "Devuelve 0-3 brokers Pulppo según zona + banda de precio.",
        "Mock (10 brokers falsos)",
      ],
      [
        "6",
        "compute_fee_scenarios",
        "Devuelve 1-3 escenarios con ruta, tiempo, monto bruto, fee y monto neto.",
        "Real (determinista, sin LLM)",
      ],
      [
        "7",
        "draft_reply",
        "Genera el texto del reply en WhatsApp en español mexicano.",
        "Real (Claude)",
      ],
      [
        "8",
        "generate_voice_reply",
        "Convierte el reply a MP3 en español mexicano y lo sube a Supabase Storage.",
        "Real (ElevenLabs)",
      ],
      [
        "9",
        "persist_triage",
        "Escribe filas en leads y triage_decisions.",
        "Real (Supabase)",
      ],
    ],
  }),
);

// Modelo de fees
children.push(h1("Modelo de comisiones (transparencia de trade-off)"));
children.push(
  p(
    "El nuevo beat teatral de la demo: después de elegir la ruta, el agente muestra 1-3 tarjetas con el costo real y el neto que recibe el vendedor en cada escenario. Está basado en los esquemas reales del mercado mexicano:",
  ),
);
children.push(
  table({
    headers: ["Ruta", "Tipo de fee", "Rango típico", "Cómo lo ve el vendedor"],
    colWidthsRel: [20, 25, 20, 35],
    rows: [
      [
        "iBuyer Tuhabi",
        "Descuento de conveniencia",
        "7 – 15 % sobre Habímetro",
        "La oferta es menor al precio de mercado; sin comisión adicional.",
      ],
      [
        "Pulppo / broker socio",
        "Comisión de broker",
        "5 – 7 % sobre el precio de venta",
        "Venta a precio cercano al de mercado, ~45 días, comisión ~6 %.",
      ],
      [
        "Habímetro nurture / AEO",
        "Sin fee",
        "0 %",
        "Sólo estimación de mercado + lista de espera, sin compromiso.",
      ],
    ],
  }),
);
children.push(spacer());
children.push(h3("Ejemplo: Caso 1 (Roma Norte, 2 M MXN, urgente)"));
children.push(
  table({
    headers: ["Escenario", "Tiempo", "Bruto esperado", "Fee", "Neto al vendedor"],
    colWidthsRel: [22, 16, 22, 18, 22],
    rows: [
      [
        "iBuyer (recomendado)",
        "10 días",
        "1 740 000 MXN",
        "13 % (conveniencia)",
        "1 740 000 MXN",
      ],
      [
        "Pulppo broker",
        "~60 días",
        "2 000 000 MXN",
        "6 % comisión",
        "1 880 000 MXN",
      ],
      [
        "Nurture",
        "—",
        "2 000 000 MXN (teórico)",
        "0 %",
        "Depende del futuro",
      ],
    ],
  }),
);
children.push(spacer());
children.push(
  p(
    "El vendedor ve, por primera vez, que el broker le netearía 140 mil pesos más pero esperaría 50 días adicionales. Hoy esa comparación no existe y la decisión se toma a ciegas.",
  ),
);

// Plan de construcción
children.push(h1("Plan de construcción (5 fases · 6 a 8 horas)"));
children.push(
  numbered(
    "Fase A · Fundación (1 h): esquemas Zod, mock data de los 4 casos, migración Supabase de leads y triage_decisions, endpoint /api/triage?mock=1 que devuelve un TriageDecision canned.",
  ),
);
children.push(
  numbered(
    "Fase B · Frontend sobre mocks (2 h, paralelo a C): página /prisma con chat estilo WhatsApp, selector de casos, mapa SVG de México con pin, panel de traza del agente y stack de tarjetas de comisiones.",
  ),
);
children.push(
  numbered(
    "Fase C · Agente + herramientas (3 h, paralelo a B): implementación de las 9 herramientas, prompt de sistema, agente Claude conectado al endpoint con SSE para el streaming.",
  ),
);
children.push(
  numbered(
    "Fase D · Voz (1 h): voz preset en español mexicano de ElevenLabs, draft_reply + generate_voice_reply, reproductor de audio en la UI del chat.",
  ),
);
children.push(
  numbered(
    "Fase E · Pulido y ensayo (1-2 h): animación de la bifurcación, halo de riesgo del mapa para Ecatepec, pre-cargar los 4 casos, dry run de 3 minutos dos veces y grabación de respaldo.",
  ),
);

// Real vs mock
children.push(h1("Real vs mock (decisiones del equipo)"));
children.push(
  p(
    "Defaults conservadores. Si alguien del equipo tiene acceso a APIs reales que valgan la pena cambiar, lo discutimos antes de Fase C.",
  ),
);
children.push(
  table({
    headers: ["Capacidad", "Default", "¿Cambiarlo?"],
    colWidthsRel: [30, 30, 40],
    rows: [
      ["Loop del agente Claude (Haiku 4.5 + caching)", "Real", "No — ya probado en Aftercall."],
      ["Voz ElevenLabs en español mexicano", "Real", "Sólo elegir preset (Mateo, Sofía o Diego)."],
      ["Persistencia Supabase + RLS", "Real", "No — reutiliza el proyecto de Aftercall."],
      [
        "Valuación Habímetro",
        "Mock",
        "API real es interna de Tuhabi; mock está bien salvo que alguien tenga acceso.",
      ],
      [
        "Seguridad INEGI / Semáforo Delictivo",
        "Mock",
        "API real existe pero es compleja para 1 h; sugerencia: mock con nota al pie.",
      ],
      [
        "Matching de brokers Pulppo",
        "Mock",
        "No hay API pública; usamos roster de 10 brokers ficticios con nombres realistas.",
      ],
      [
        "Mapa de México",
        "SVG estático con pin",
        "Mapbox sería más bonito pero suma complejidad; SVG basta para la demo.",
      ],
      [
        "Mensajes entrantes de WhatsApp",
        "Botones de casos + textarea libre",
        "Sin integración real WBA (requiere verificación Meta).",
      ],
      [
        "Mensajes salientes de WhatsApp",
        "Sólo drafting, no envío real",
        "Drafting basta para la demo.",
      ],
      [
        "Trigger con Make / n8n",
        "Opcional",
        "Sumar sólo si queremos optar por el prize de Make (30 min de trabajo).",
      ],
      [
        "Alertas Slack",
        "Opcional",
        "Sumar si tenemos SLACK_WEBHOOK_URL listo.",
      ],
    ],
  }),
);
children.push(spacer());
children.push(h3("Preguntas concretas para el equipo (antes de empezar a codear Fase C)"));
children.push(numbered("¿Algún voice preset preferido de ElevenLabs en español mexicano?"));
children.push(numbered("¿OK con mockear Habímetro, INEGI y Pulppo?"));
children.push(numbered("¿OK con mapa SVG estático en vez de Mapbox?"));
children.push(numbered("¿Confirmamos UI de WhatsApp con botones + textarea (sin WBA real)?"));
children.push(numbered("¿Skip Make/n8n a menos que vayamos por el prize de Make?"));
children.push(numbered("¿Skip Slack a menos que ya tengamos webhook?"));

// Costos
children.push(h1("Costos esperados"));
children.push(
  table({
    headers: ["Concepto", "Por test", "Demo day (~20 corridas)"],
    colWidthsRel: [40, 30, 30],
    rows: [
      ["Claude Haiku con cache hit en system prompt", "~0,003 USD", "~0,06 USD"],
      [
        "Claude Haiku para extract_intent y draft_reply (calls anidadas)",
        "~0,005 USD",
        "~0,10 USD",
      ],
      [
        "ElevenLabs voz en español mexicano (~200 chars)",
        "~0,04 USD",
        "~0,80 USD",
      ],
      ["Supabase lecturas/escrituras", "0", "0"],
      ["Túnel ngrok", "0", "0"],
      ["Total estimado", "~0,05 USD", "~1 USD"],
    ],
  }),
);
children.push(spacer());
children.push(
  p(
    "Comparado con Aftercall corriendo en Sonnet (~0,20 – 0,30 USD por corrida), Prisma es 5× más barato por iteración y permite ensayar la demo muchas veces sin estrés de billing.",
  ),
);

// Fuera de alcance
children.push(h1("Fuera de alcance"));
children.push(bullet("API real de Pulppo (no existe endpoint público)."));
children.push(
  bullet("API real de WhatsApp Business (requiere verificación Meta y webhook)."),
);
children.push(bullet("Integración real con INEGI / Semáforo Delictivo."));
children.push(bullet("Multi-tenant, organizaciones o facturación."));
children.push(
  bullet("Autenticación en la URL de demo (queda detrás de ngrok; la URL es el secreto)."),
);
children.push(bullet("Manejo robusto de errores, reintentos y observabilidad de producción."));
children.push(bullet("Infraestructura de testing automatizado (lo sustituye el ensayo manual)."));
children.push(bullet("Despliegue en Vercel productivo (ngrok-only para demo day)."));

// Definición de done
children.push(h1("Definición de hecho"));
children.push(
  p("El PoC se considera “hecho” cuando se cumple lo siguiente:"),
);
children.push(numbered("Los 4 casos generan un TriageDecision completo end-to-end en menos de 8 segundos cada uno."));
children.push(numbered("El stack de tarjetas de fee renderiza 1-3 tarjetas correctamente según el caso."));
children.push(numbered("El reply en voz reproduce con naturalidad en español mexicano en al menos los Casos 1 y 2."));
children.push(numbered("El mapa muestra pin y halo de riesgo (específicamente para el Caso 3)."));
children.push(numbered("La decisión se persiste en triage_decisions y se puede recargar."));
children.push(numbered("La demo de 3 minutos corre limpia dos veces seguidas."));
children.push(numbered("Video de respaldo grabado."));

// Próximos pasos
children.push(h1("Próximos pasos"));
children.push(
  bullet(
    "Recibir confirmación o ajustes del equipo sobre el bloque “Real vs mock” (las 6 preguntas).",
  ),
);
children.push(
  bullet(
    "Confirmar tono y copy de los 4 openers de WhatsApp con alguien con feel local fuerte.",
  ),
);
children.push(
  bullet(
    "Decidir si queremos también optar por los prizes de Make/Slack/Clay añadiendo integraciones mínimas (cada una agrega ~30-45 min).",
  ),
);
children.push(
  bullet(
    "Una vez confirmadas las decisiones, ejecutar Fase A y subir un primer screenshot del shell para validación visual antes de continuar.",
  ),
);

// Construcción del documento
const doc = new Document({
  creator: "Equipo Prisma",
  title: "Prisma — Especificación del PoC",
  description:
    "Triage de leads con IA para Tuhabi · Hackathon GTM CDMX · Mayo 2026",
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } }, // 11pt
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 36, bold: true, font: FONT, color: ACCENT },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: FONT },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: ACCENT },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
          {
            level: 1,
            format: LevelFormat.BULLET,
            text: "◦",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
          },
        ],
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH_DXA, height: 15840 },
          margin: {
            top: MARGIN_DXA,
            right: MARGIN_DXA,
            bottom: MARGIN_DXA,
            left: MARGIN_DXA,
          },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "Prisma · Spec interno del equipo · ",
                  font: FONT,
                  size: 18,
                  color: MUTED,
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: FONT,
                  size: 18,
                  color: MUTED,
                }),
                new TextRun({
                  text: " / ",
                  font: FONT,
                  size: 18,
                  color: MUTED,
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  font: FONT,
                  size: 18,
                  color: MUTED,
                }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, buffer);
console.log(`Generated: ${OUT_PATH} (${buffer.length} bytes)`);
