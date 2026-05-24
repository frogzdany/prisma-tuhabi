import type {
  HabimetroEstimate,
  PulppoBroker,
  WhatsAppOpener,
  ZoneInfo,
} from "./schemas";

// ----------------------------------------------------------------------------
// Tuhabi public buybox — values reverse-engineered from public Habi MX
// communications (ticket band ~500K–4M MXN, presence in ~11 of 32 states).
// ----------------------------------------------------------------------------

export const TUHABI_BUYBOX = {
  minMXN: 500_000,
  maxMXN: 4_000_000,
  maxRiskTier: 3,
  coveredStates: [
    "CDMX",
    "EDOMEX",
    "JAL",
    "NL",
    "QRO",
    "PUE",
    "GTO",
    "HID",
    "MOR",
    "SLP",
    "AGS",
  ] as const,
} as const;

export type TuhabiCoveredState = (typeof TUHABI_BUYBOX.coveredStates)[number];

// ----------------------------------------------------------------------------
// Zone risk table — colonia → ZoneInfo. Risk tier 1=safe, 5=avoid.
// Coordinates are approximate centroids from public sources. avgDoMDays is
// a rough plausible figure for a value-tier listing in that area.
// ----------------------------------------------------------------------------

export const ZONE_RISK_TABLE: Record<string, ZoneInfo> = {
  "roma-norte": {
    colonia: "Roma Norte",
    state: "Ciudad de México",
    stateCode: "CDMX",
    lat: 19.4150,
    lng: -99.1690,
    riskTier: 1,
    avgDoMDays: 45,
  },
  "condesa": {
    colonia: "Condesa",
    state: "Ciudad de México",
    stateCode: "CDMX",
    lat: 19.4126,
    lng: -99.1730,
    riskTier: 1,
    avgDoMDays: 50,
  },
  "polanco": {
    colonia: "Polanco",
    state: "Ciudad de México",
    stateCode: "CDMX",
    lat: 19.4324,
    lng: -99.1903,
    riskTier: 1,
    avgDoMDays: 60,
  },
  "pedregal": {
    colonia: "Pedregal",
    state: "Ciudad de México",
    stateCode: "CDMX",
    lat: 19.3045,
    lng: -99.1948,
    riskTier: 1,
    avgDoMDays: 90,
  },
  "coyoacan": {
    colonia: "Coyoacán",
    state: "Ciudad de México",
    stateCode: "CDMX",
    lat: 19.3464,
    lng: -99.1597,
    riskTier: 2,
    avgDoMDays: 70,
  },
  "tlalpan": {
    colonia: "Tlalpan",
    state: "Ciudad de México",
    stateCode: "CDMX",
    lat: 19.2826,
    lng: -99.1659,
    riskTier: 2,
    avgDoMDays: 80,
  },
  "doctores": {
    colonia: "Doctores",
    state: "Ciudad de México",
    stateCode: "CDMX",
    lat: 19.4226,
    lng: -99.1485,
    riskTier: 3,
    avgDoMDays: 120,
  },
  "iztapalapa": {
    colonia: "Iztapalapa",
    state: "Ciudad de México",
    stateCode: "CDMX",
    lat: 19.3574,
    lng: -99.0691,
    riskTier: 4,
    avgDoMDays: 180,
  },
  "ecatepec": {
    colonia: "Ecatepec de Morelos",
    state: "Estado de México",
    stateCode: "EDOMEX",
    lat: 19.6018,
    lng: -99.0501,
    riskTier: 4,
    avgDoMDays: 187,
  },
  "naucalpan": {
    colonia: "Naucalpan",
    state: "Estado de México",
    stateCode: "EDOMEX",
    lat: 19.4783,
    lng: -99.2407,
    riskTier: 3,
    avgDoMDays: 130,
  },
  "tlalnepantla": {
    colonia: "Tlalnepantla",
    state: "Estado de México",
    stateCode: "EDOMEX",
    lat: 19.5377,
    lng: -99.1953,
    riskTier: 3,
    avgDoMDays: 125,
  },
  "cuautitlan-izcalli": {
    colonia: "Cuautitlán Izcalli",
    state: "Estado de México",
    stateCode: "EDOMEX",
    lat: 19.6519,
    lng: -99.2127,
    riskTier: 3,
    avgDoMDays: 140,
  },
  "guadalajara-centro": {
    colonia: "Guadalajara Centro",
    state: "Jalisco",
    stateCode: "JAL",
    lat: 20.6597,
    lng: -103.3496,
    riskTier: 2,
    avgDoMDays: 80,
  },
  "zapopan": {
    colonia: "Zapopan",
    state: "Jalisco",
    stateCode: "JAL",
    lat: 20.7236,
    lng: -103.3848,
    riskTier: 2,
    avgDoMDays: 75,
  },
  "oaxaca-de-juarez": {
    colonia: "Oaxaca de Juárez",
    state: "Oaxaca",
    stateCode: "OAX",
    lat: 17.0732,
    lng: -96.7266,
    riskTier: 2,
    avgDoMDays: 150,
  },
};

// Aliases so the agent can match free-text variations.
export const ZONE_ALIASES: Record<string, string> = {
  "roma norte": "roma-norte",
  "roma": "roma-norte",
  "condesa": "condesa",
  "polanco": "polanco",
  "pedregal": "pedregal",
  "pedregal de san angel": "pedregal",
  "coyoacan": "coyoacan",
  "coyoacán": "coyoacan",
  "tlalpan": "tlalpan",
  "doctores": "doctores",
  "iztapalapa": "iztapalapa",
  "ecatepec": "ecatepec",
  "ecatepec de morelos": "ecatepec",
  "naucalpan": "naucalpan",
  "tlalnepantla": "tlalnepantla",
  "cuautitlan izcalli": "cuautitlan-izcalli",
  "cuautitlán izcalli": "cuautitlan-izcalli",
  "guadalajara": "guadalajara-centro",
  "guadalajara centro": "guadalajara-centro",
  "zapopan": "zapopan",
  "oaxaca": "oaxaca-de-juarez",
  "oaxaca de juarez": "oaxaca-de-juarez",
  "oaxaca de juárez": "oaxaca-de-juarez",
};

export function resolveZone(query: string): ZoneInfo | null {
  const norm = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  const slug = ZONE_ALIASES[norm];
  if (slug && ZONE_RISK_TABLE[slug]) return ZONE_RISK_TABLE[slug];
  if (ZONE_RISK_TABLE[norm]) return ZONE_RISK_TABLE[norm];
  // Fallback: partial match on colonia name.
  for (const z of Object.values(ZONE_RISK_TABLE)) {
    if (z.colonia.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(norm)) {
      return z;
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Habímetro lookup table — keyed by zone slug + property profile.
// Format: `${zoneSlug}:${propertyType}:${sizeBand}` where sizeBand is
// 'small' (<80m²), 'mid' (80-150m²), 'large' (>150m²).
// Confidence interval is ±7-8%.
// ----------------------------------------------------------------------------

function pricePoint(value: number, spreadPct = 0.075): HabimetroEstimate {
  return {
    valueMXN: value,
    low: Math.round(value * (1 - spreadPct)),
    high: Math.round(value * (1 + spreadPct)),
    confidence: "medium",
    source: "mock",
  };
}

export const HABIMETRO_TABLE: Record<string, HabimetroEstimate> = {
  // Roma Norte
  "roma-norte:departamento:small": pricePoint(2_000_000),
  "roma-norte:departamento:mid": pricePoint(4_200_000),
  "roma-norte:casa:mid": pricePoint(6_800_000),
  // Condesa
  "condesa:departamento:small": pricePoint(2_300_000),
  "condesa:departamento:mid": pricePoint(4_600_000),
  // Polanco
  "polanco:departamento:mid": pricePoint(7_500_000),
  "polanco:departamento:large": pricePoint(13_000_000),
  // Pedregal
  "pedregal:casa:large": pricePoint(8_000_000),
  "pedregal:casa:mid": pricePoint(5_500_000),
  // Coyoacán
  "coyoacan:casa:mid": pricePoint(4_800_000),
  "coyoacan:departamento:small": pricePoint(1_900_000),
  // Tlalpan
  "tlalpan:casa:mid": pricePoint(3_900_000),
  // Doctores
  "doctores:departamento:small": pricePoint(1_500_000),
  // Iztapalapa
  "iztapalapa:casa:small": pricePoint(950_000),
  // Ecatepec — 90 m² casa matches spec fixture 3 at 850K MXN.
  "ecatepec:casa:small": pricePoint(700_000),
  "ecatepec:casa:mid": pricePoint(850_000),
  "ecatepec:casa:large": pricePoint(1_400_000),
  // Naucalpan
  "naucalpan:casa:mid": pricePoint(2_700_000),
  // Tlalnepantla
  "tlalnepantla:casa:mid": pricePoint(2_400_000),
  // Cuautitlán Izcalli
  "cuautitlan-izcalli:casa:mid": pricePoint(2_100_000),
  // Guadalajara
  "guadalajara-centro:departamento:mid": pricePoint(3_200_000),
  "zapopan:casa:mid": pricePoint(4_600_000),
  // Oaxaca
  "oaxaca-de-juarez:casa:small": pricePoint(600_000),
  "oaxaca-de-juarez:casa:mid": pricePoint(1_100_000),
};

export function sizeBand(sizeM2?: number): "small" | "mid" | "large" {
  if (!sizeM2) return "mid";
  if (sizeM2 < 80) return "small";
  if (sizeM2 > 150) return "large";
  return "mid";
}

export function lookupHabimetro(
  zoneSlug: string,
  propertyType: string,
  sizeM2?: number
): HabimetroEstimate | null {
  const band = sizeBand(sizeM2);
  const key = `${zoneSlug}:${propertyType}:${band}`;
  if (HABIMETRO_TABLE[key]) return HABIMETRO_TABLE[key];
  // Fallback: try mid size band.
  const midKey = `${zoneSlug}:${propertyType}:mid`;
  if (HABIMETRO_TABLE[midKey]) return HABIMETRO_TABLE[midKey];
  // Fallback: any property type in that zone.
  for (const k of Object.keys(HABIMETRO_TABLE)) {
    if (k.startsWith(`${zoneSlug}:`)) return HABIMETRO_TABLE[k];
  }
  return null;
}

// ----------------------------------------------------------------------------
// Pulppo broker roster — fake but realistic. Tagged by state + tier.
// Intentionally no Oaxaca broker so Fixture 4 routes to Nurture.
// ----------------------------------------------------------------------------

export const PULPPO_BROKERS: PulppoBroker[] = [
  {
    id: "broker-001",
    name: "Luisa Pereda",
    state: "Ciudad de México",
    stateCode: "CDMX",
    specialtyTier: "luxury",
    languages: ["es", "en"],
    recentClosings: 12,
    whatsappOptIn: true,
  },
  {
    id: "broker-002",
    name: "Roberto Alcázar",
    state: "Ciudad de México",
    stateCode: "CDMX",
    specialtyTier: "luxury",
    languages: ["es", "en"],
    recentClosings: 18,
    whatsappOptIn: true,
  },
  {
    id: "broker-003",
    name: "Carolina Mendoza",
    state: "Ciudad de México",
    stateCode: "CDMX",
    specialtyTier: "mid",
    languages: ["es"],
    recentClosings: 9,
    whatsappOptIn: true,
  },
  {
    id: "broker-004",
    name: "Daniel Ortiz",
    state: "Ciudad de México",
    stateCode: "CDMX",
    specialtyTier: "mid",
    languages: ["es"],
    recentClosings: 14,
    whatsappOptIn: true,
  },
  {
    id: "broker-005",
    name: "Ricardo Martínez",
    state: "Estado de México",
    stateCode: "EDOMEX",
    specialtyTier: "value",
    languages: ["es"],
    recentClosings: 22,
    whatsappOptIn: true,
  },
  {
    id: "broker-006",
    name: "Sofía Aguilar",
    state: "Estado de México",
    stateCode: "EDOMEX",
    specialtyTier: "value",
    languages: ["es"],
    recentClosings: 19,
    whatsappOptIn: true,
  },
  {
    id: "broker-007",
    name: "Mateo Ríos",
    state: "Estado de México",
    stateCode: "EDOMEX",
    specialtyTier: "value",
    languages: ["es"],
    recentClosings: 11,
    whatsappOptIn: true,
  },
  {
    id: "broker-008",
    name: "Andrea Salinas",
    state: "Jalisco",
    stateCode: "JAL",
    specialtyTier: "mid",
    languages: ["es"],
    recentClosings: 8,
    whatsappOptIn: true,
  },
  {
    id: "broker-009",
    name: "Javier Padilla",
    state: "Jalisco",
    stateCode: "JAL",
    specialtyTier: "luxury",
    languages: ["es", "en"],
    recentClosings: 7,
    whatsappOptIn: true,
  },
  {
    id: "broker-010",
    name: "Patricia Vega",
    state: "Ciudad de México",
    stateCode: "CDMX",
    specialtyTier: "value",
    languages: ["es"],
    recentClosings: 16,
    whatsappOptIn: true,
  },
];

export function tierForValue(valueMXN: number): "value" | "mid" | "luxury" {
  if (valueMXN < 1_500_000) return "value";
  if (valueMXN < 4_500_000) return "mid";
  return "luxury";
}

export function findBrokers(
  stateCode: string,
  tier: "value" | "mid" | "luxury",
  limit = 3
): PulppoBroker[] {
  // Primary: same state + same tier.
  const primary = PULPPO_BROKERS.filter(
    (b) => b.stateCode === stateCode && b.specialtyTier === tier
  );
  if (primary.length >= limit) return primary.slice(0, limit);
  // Fallback: same state, adjacent tier.
  const adjacent = PULPPO_BROKERS.filter(
    (b) => b.stateCode === stateCode && !primary.includes(b)
  );
  return [...primary, ...adjacent].slice(0, limit);
}

// ----------------------------------------------------------------------------
// Four canonical fixture openers (Spec §4) — written in conversational es-MX.
// ----------------------------------------------------------------------------

export const FIXTURES: Record<string, WhatsAppOpener> = {
  "roma-norte": {
    fixtureId: "roma-norte",
    locale: "es-MX",
    text: "Hola, vendo mi depa en Roma Norte. Es de 75 metros, 2 recámaras. Me urge porque me transfieren a Madrid en 3 semanas y necesito cerrar rápido. Está limpio de adeudos.",
  },
  "pedregal": {
    fixtureId: "pedregal",
    locale: "es-MX",
    text: "Buen día. Tenemos una casa familiar en Pedregal, 320 m² con 4 recámaras. La heredamos entre 4 hermanos y queremos venderla. Estamos pensando entre 7.5 y 8.5 millones.",
  },
  "ecatepec": {
    fixtureId: "ecatepec",
    locale: "es-MX",
    text: "Vendo casa en Ecatepec, son 90 metros y 3 recámaras. Me urge porque me mudo al norte por trabajo en 4 semanas. Sé que la zona está difícil pero ahí está la propiedad.",
  },
  "oaxaca": {
    fixtureId: "oaxaca",
    locale: "es-MX",
    text: "Hola, tengo una casita pequeña en Oaxaca de Juárez, como 60 metros, 2 recámaras. No tengo prisa, solo quiero saber qué opciones tengo para venderla más adelante.",
  },
};

export const FIXTURE_IDS = Object.keys(FIXTURES) as Array<keyof typeof FIXTURES>;
