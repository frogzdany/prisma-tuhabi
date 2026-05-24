import type { FeeScenario, PulppoBroker, ZoneInfo } from "./schemas";

// Tuhabi convenience discount range (urgency 0 → 10%, urgency 100 → 15%).
const URGENCY_MIN_DISCOUNT = 0.10;
const URGENCY_MAX_DISCOUNT = 0.15;

// Mexican broker standard commission.
const PULPPO_COMMISSION = 0.06;

// iBuyer close speed (Tuhabi public marketing).
const IBUYER_CLOSE_DAYS = 10;

// If urgency exceeds this and iBuyer is eligible, recommend iBuyer.
const URGENCY_IBUYER_THRESHOLD = 80;

export function scaleByUrgency(score: number, min: number, max: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return min + (clamped / 100) * (max - min);
}

export interface FeeInput {
  habimetroValueMXN: number;
  zone: ZoneInfo;
  urgencyScore: number;
  buyboxFit: { eligible: boolean; reason?: string };
  matchedBrokers: PulppoBroker[];
}

export function computeFeeScenarios(input: FeeInput): FeeScenario[] {
  const scenarios: FeeScenario[] = [];

  // iBuyer scenario (only if buybox eligible)
  if (input.buyboxFit.eligible) {
    const pct = scaleByUrgency(
      input.urgencyScore,
      URGENCY_MIN_DISCOUNT,
      URGENCY_MAX_DISCOUNT
    );
    const offer = Math.round(input.habimetroValueMXN * (1 - pct));
    scenarios.push({
      route: "iBuyer",
      estimatedTimeDays: IBUYER_CLOSE_DAYS,
      estimatedGrossMXN: offer,
      feeKind: "convenience_discount",
      feePct: pct,
      netToSellerMXN: offer,
      tradeoff: "Más rápido, menor precio. Cero comisiones.",
      recommended: false,
    });
  }

  // Pulppo scenario (only if at least one broker matched)
  if (input.matchedBrokers.length > 0) {
    const days = input.zone.avgDoMDays;
    const expectedGross = input.habimetroValueMXN;
    const net = Math.round(expectedGross * (1 - PULPPO_COMMISSION));
    scenarios.push({
      route: "Pulppo",
      estimatedTimeDays: days,
      estimatedGrossMXN: expectedGross,
      feeKind: "broker_commission",
      feePct: PULPPO_COMMISSION,
      netToSellerMXN: net,
      tradeoff: `Mejor precio, ~${days} días. Comisión 6%.`,
      recommended: false,
    });
  }

  // Nurture is always offered as the baseline / no-action option.
  scenarios.push({
    route: "Nurture",
    estimatedTimeDays: null,
    estimatedGrossMXN: input.habimetroValueMXN,
    feeKind: "none",
    feePct: 0,
    netToSellerMXN: input.habimetroValueMXN,
    tradeoff: "Espera y observa el mercado. Cero compromiso.",
    recommended: false,
  });

  // Recommendation logic:
  // - If urgency >= 80 AND iBuyer eligible → iBuyer (speed wins).
  // - Else if Pulppo brokers matched → Pulppo (better net).
  // - Else if iBuyer eligible → iBuyer (only option besides nurture).
  // - Else → Nurture (no real options).
  let recommendedRoute: FeeScenario["route"];
  if (input.buyboxFit.eligible && input.urgencyScore >= URGENCY_IBUYER_THRESHOLD) {
    recommendedRoute = "iBuyer";
  } else if (input.matchedBrokers.length > 0) {
    recommendedRoute = "Pulppo";
  } else if (input.buyboxFit.eligible) {
    recommendedRoute = "iBuyer";
  } else {
    recommendedRoute = "Nurture";
  }

  for (const s of scenarios) {
    if (s.route === recommendedRoute) s.recommended = true;
  }

  return scenarios;
}

export function formatMXN(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}
