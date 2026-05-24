import { z } from "zod";

export const StakeholderPersonaSchema = z.enum([
  "champion",
  "cfo",
  "it",
  "end_user",
  "cmo",
  "legal",
  "other",
]);
export type StakeholderPersona = z.infer<typeof StakeholderPersonaSchema>;

export const CtaSchema = z.object({
  label: z.string().min(1),
  href: z.string().url().or(z.string().startsWith("#")),
  variant: z.enum(["solid", "outline", "ghost"]).default("solid"),
});

export const StakeholderSchema = z.object({
  persona: StakeholderPersonaSchema,
  name: z.string().min(1),
  email: z.string().email().optional(),
  title: z.string().optional(),
  headline: z.string().min(1),
  pageMarkdown: z.string().min(1),
  ctas: z.array(CtaSchema).default([]),
});
export type Stakeholder = z.infer<typeof StakeholderSchema>;

export const VoiceIntroSchema = z.object({
  script: z.string().min(1),
  audioUrl: z.string().url().nullable(),
  voiceId: z.string().min(1),
  durationSec: z.number().positive().optional(),
});
export type VoiceIntro = z.infer<typeof VoiceIntroSchema>;

export const RoiInputsSchema = z.object({
  currency: z.string().default("USD"),
  annualRevenue: z.number().nonnegative(),
  headcount: z.number().int().nonnegative(),
  assumedSavingsPct: z.number().min(0).max(1),
  hoursSavedPerRepPerWeek: z.number().nonnegative(),
  avgFullyLoadedHourlyRate: z.number().nonnegative(),
});
export type RoiInputs = z.infer<typeof RoiInputsSchema>;

export const ActionItemSchema = z.object({
  step: z.string().min(1),
  owner: z.enum(["seller", "buyer", "shared"]),
  dueDate: z.string().optional(),
  done: z.boolean().default(false),
});
export type ActionItem = z.infer<typeof ActionItemSchema>;

export const DealRoomSchema = z.object({
  dealId: z.string().min(1),
  slug: z.string().min(1),
  companyName: z.string().min(1),
  companyDomain: z.string().optional(),
  championName: z.string().min(1),
  championTitle: z.string().optional(),
  championEmail: z.string().email().optional(),
  sellerName: z.string().min(1),
  sellerTitle: z.string().optional(),
  sellerCompany: z.string().min(1),
  sellerAvatarUrl: z.string().url().optional(),
  stakeholders: z.array(StakeholderSchema).min(1),
  voiceIntro: VoiceIntroSchema,
  roiInputs: RoiInputsSchema,
  mutualActionPlan: z.array(ActionItemSchema).default([]),
  createdAt: z.string().datetime().optional(),
});
export type DealRoom = z.infer<typeof DealRoomSchema>;

export const RoomEventTypeSchema = z.enum([
  "page_view",
  "tab_switch",
  "roi_input_change",
  "voice_play",
  "voice_complete",
  "cta_click",
  "time_on_page",
]);
export type RoomEventType = z.infer<typeof RoomEventTypeSchema>;

export const RoomEventSchema = z.object({
  dealSlug: z.string().min(1),
  stakeholderEmail: z.string().email().optional(),
  type: RoomEventTypeSchema,
  payload: z.record(z.string(), z.any()).optional(),
});
export type RoomEvent = z.infer<typeof RoomEventSchema>;

export const GenerateRequestSchema = z.object({
  transcriptId: z.string().optional(),
  transcriptText: z.string().optional(),
  dealId: z.string().optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// ============================================================================
// Prisma — TuHabi lead-triage schemas
// ============================================================================

export const TriageRouteSchema = z.enum(["iBuyer", "Pulppo", "Nurture"]);
export type TriageRoute = z.infer<typeof TriageRouteSchema>;

export const WhatsAppOpenerSchema = z.object({
  text: z.string().min(1),
  fixtureId: z.string().optional(),
  locale: z.literal("es-MX").default("es-MX"),
});
export type WhatsAppOpener = z.infer<typeof WhatsAppOpenerSchema>;

export const ZoneInfoSchema = z.object({
  colonia: z.string().min(1),
  state: z.string().min(1),
  stateCode: z.string().min(2).max(6),
  lat: z.number(),
  lng: z.number(),
  riskTier: z.number().int().min(1).max(5),
  avgDoMDays: z.number().int().nonnegative(),
});
export type ZoneInfo = z.infer<typeof ZoneInfoSchema>;

export const HabimetroEstimateSchema = z.object({
  valueMXN: z.number().positive(),
  low: z.number().positive(),
  high: z.number().positive(),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  source: z.literal("mock"),
});
export type HabimetroEstimate = z.infer<typeof HabimetroEstimateSchema>;

export const PropertyTypeSchema = z.enum([
  "departamento",
  "casa",
  "terreno",
  "other",
]);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const PulppoBrokerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  state: z.string().min(1),
  stateCode: z.string().min(2).max(6),
  specialtyTier: z.enum(["value", "mid", "luxury"]),
  languages: z.array(z.string()).default(["es"]),
  recentClosings: z.number().int().nonnegative(),
  photoUrl: z.string().url().optional(),
  whatsappOptIn: z.boolean().default(true),
});
export type PulppoBroker = z.infer<typeof PulppoBrokerSchema>;

export const FeeScenarioSchema = z.object({
  route: TriageRouteSchema,
  estimatedTimeDays: z.number().int().positive().nullable(),
  estimatedGrossMXN: z.number().nonnegative(),
  feeKind: z.enum(["convenience_discount", "broker_commission", "none"]),
  feePct: z.number().min(0).max(1),
  netToSellerMXN: z.number().nonnegative(),
  tradeoff: z.string().min(1),
  recommended: z.boolean().default(false),
});
export type FeeScenario = z.infer<typeof FeeScenarioSchema>;

export const ExtractedIntentSchema = z.object({
  colonia: z.string().optional(),
  state: z.string().optional(),
  propertyType: PropertyTypeSchema.optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  sizeM2: z.number().positive().optional(),
  urgencyScore: z.number().int().min(0).max(100),
  motivationTags: z.array(z.string()).default([]),
  mentionedPriceMXN: z.number().positive().optional(),
  rationale: z.string().optional(),
});
export type ExtractedIntent = z.infer<typeof ExtractedIntentSchema>;

export const LeadSchema = z.object({
  id: z.string().uuid().optional(),
  opener: WhatsAppOpenerSchema,
  location: ZoneInfoSchema,
  habimetro: HabimetroEstimateSchema,
  urgencyScore: z.number().int().min(0).max(100),
  motivationTags: z.array(z.string()).default([]),
  propertyType: PropertyTypeSchema.optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  sizeM2: z.number().positive().optional(),
  inferredPriceMXN: z.number().positive().optional(),
  source: z.enum(["web", "make", "test"]).default("web"),
});
export type Lead = z.infer<typeof LeadSchema>;

export const TriageReplySchema = z.object({
  text: z.string().min(1),
  audioUrl: z.string().url().nullable().optional(),
  voiceId: z.string().optional(),
  durationSec: z.number().positive().optional(),
});
export type TriageReply = z.infer<typeof TriageReplySchema>;

export const TriageDecisionSchema = z.object({
  leadId: z.string().uuid().optional(),
  decisionId: z.string().uuid().optional(),
  chosenRoute: TriageRouteSchema,
  reason: z.string().min(1),
  scenarios: z.array(FeeScenarioSchema).min(1),
  reply: TriageReplySchema,
  brokers: z.array(PulppoBrokerSchema).default([]),
  persistedAt: z.string().datetime().optional(),
});
export type TriageDecision = z.infer<typeof TriageDecisionSchema>;

export const TriageRequestSchema = z
  .object({
    text: z.string().min(1).optional(),
    fixtureId: z.string().optional(),
    source: z.enum(["web", "make", "test"]).default("web"),
  })
  .refine((d) => Boolean(d.text || d.fixtureId), {
    message: "either text or fixtureId is required",
  });
export type TriageRequest = z.infer<typeof TriageRequestSchema>;
