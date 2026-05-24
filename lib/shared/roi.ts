import type { RoiInputs } from "./schemas";

export interface RoiBreakdown {
  estimatedSellerCount: number;
  hoursReclaimedPerYear: number;
  costReclaimedPerYear: number;
  pipelineUpliftPerYear: number;
  totalAnnualImpact: number;
}

const PIPELINE_TO_REVENUE_RATIO = 4; // assume 4x qualified pipeline coverage
const WIN_RATE_UPLIFT_PTS = 0.03;
const WORKING_WEEKS_PER_YEAR = 48;

export function computeRoi(input: RoiInputs): RoiBreakdown {
  const estimatedSellerCount = Math.max(1, Math.round(input.headcount * 0.12));
  const hoursReclaimedPerYear =
    estimatedSellerCount * input.hoursSavedPerRepPerWeek * WORKING_WEEKS_PER_YEAR;
  const costReclaimedPerYear = hoursReclaimedPerYear * input.avgFullyLoadedHourlyRate;

  const qualifiedPipeline = input.annualRevenue * PIPELINE_TO_REVENUE_RATIO;
  const pipelineUpliftPerYear = qualifiedPipeline * WIN_RATE_UPLIFT_PTS;

  return {
    estimatedSellerCount,
    hoursReclaimedPerYear,
    costReclaimedPerYear,
    pipelineUpliftPerYear,
    totalAnnualImpact: costReclaimedPerYear + pipelineUpliftPerYear,
  };
}

export function formatCurrency(value: number, currency = "USD"): string {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return fmt.format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
