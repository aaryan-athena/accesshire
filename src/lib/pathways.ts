// Two overlapping accessibility pathways.
// A candidate can belong to BOTH. Nothing here ever lowers a candidate's
// skills/employability score — these lists describe what an EMPLOYER offers
// and what a candidate has chosen to tell us they need at work.

export const PATHWAY_PHYSICAL = "physical_sensory";
export const PATHWAY_NEURO = "neurodivergent";
export const PATHWAYS = [PATHWAY_PHYSICAL, PATHWAY_NEURO] as const;
export type Pathway = (typeof PATHWAYS)[number];

export const PATHWAY_LABELS: Record<Pathway, string> = {
  [PATHWAY_PHYSICAL]: "Physical & sensory disability",
  [PATHWAY_NEURO]: "Neurodivergent",
};

/**
 * Optional, self-described disability categories. A candidate never has to pick
 * one. They are used for one thing only: showing which employers have said they
 * are open to hiring people in that category (the intake form's pwdCategories,
 * willingBlind and willingNeurodivergent answers).
 */
export interface DisabilityCategory {
  key: string;
  label: string;
  pathway: Pathway;
  /** The matching category on the employer intake form. */
  employerCategory: string;
}

export const DISABILITY_CATEGORIES: DisabilityCategory[] = [
  { key: "locomotor", label: "Physical / mobility disability", pathway: PATHWAY_PHYSICAL, employerCategory: "Physical Disability (locomotor)" },
  { key: "visual", label: "Blind or low vision", pathway: PATHWAY_PHYSICAL, employerCategory: "Visual Impairment (blind / low vision)" },
  { key: "hearing", label: "Deaf or hard of hearing", pathway: PATHWAY_PHYSICAL, employerCategory: "Hearing Impairment (deaf / hard of hearing)" },
  { key: "speech", label: "Speech or language disability", pathway: PATHWAY_PHYSICAL, employerCategory: "Other" },
  { key: "autism", label: "Autistic", pathway: PATHWAY_NEURO, employerCategory: "Neurodivergent Conditions (autism, ADHD, dyslexia, etc.)" },
  { key: "adhd", label: "ADHD", pathway: PATHWAY_NEURO, employerCategory: "Neurodivergent Conditions (autism, ADHD, dyslexia, etc.)" },
  { key: "specific_learning", label: "Dyslexia, dyscalculia or dyspraxia", pathway: PATHWAY_NEURO, employerCategory: "Neurodivergent Conditions (autism, ADHD, dyslexia, etc.)" },
  { key: "intellectual", label: "Intellectual disability", pathway: PATHWAY_NEURO, employerCategory: "Intellectual Disability" },
];

export const DISABILITY_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DISABILITY_CATEGORIES.map((c) => [c.key, c.label]),
);

export const categoriesForPathway = (pathway: Pathway) =>
  DISABILITY_CATEGORIES.filter((c) => c.pathway === pathway);

/**
 * Kinds of work a candidate says suit them physically. Keys are the intake
 * form's job categories, so they compare directly with a job's job_category.
 */
export const WORK_TYPES = [
  {
    key: "White Collar (Desk Jobs)",
    label: "Desk-based work",
    help: "Mostly seated at a computer or desk — office, IT, admin, design, finance.",
  },
  {
    key: "Grey Collar (Support & Field Staff)",
    label: "Light support or field work",
    help: "Some standing, walking or moving around — reception, front desk, field assistance.",
  },
  {
    key: "Blue Collar (Skilled & Manual Labor)",
    label: "Hands-on or manual work",
    help: "Operating machines, lifting, trades, warehouse or production work.",
  },
] as const;

export const WORK_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  WORK_TYPES.map((w) => [w.key, w.label]),
);

export interface AccessFeature {
  key: string;
  label: string;
  help: string;
}

/** Workplace/environment attributes for the physical & sensory access pathway. */
export const PHYSICAL_FEATURES: AccessFeature[] = [
  { key: "step_free", label: "Step-free workplace", help: "Level or ramped entry, lifts, step-free routes to desks and meeting rooms." },
  { key: "accessible_facilities", label: "Accessible restroom & workstation", help: "Accessible toilets, doorways and circulation space at the workstation." },
  { key: "seated_adjustable", label: "Seated or adjustable work", help: "Work can be done seated, or with sit-stand flexibility throughout the day." },
  { key: "dexterity_support", label: "Upper-body / dexterity support", help: "Alternative input devices, voice control, no heavy lifting or fine-motor gatekeeping." },
  { key: "screen_reader", label: "Screen-reader compatibility", help: "Core tools tested with JAWS, NVDA or VoiceOver." },
  { key: "magnification", label: "Magnification & high contrast", help: "Zoom, large text and high-contrast themes work across the toolchain." },
  { key: "captions", label: "Captioned meetings", help: "Live captions or CART on calls, captions on recorded content." },
  { key: "sign_language", label: "Sign language support", help: "Interpreter booking available for meetings and onboarding." },
  { key: "text_first", label: "Text-first communication", help: "Written updates by default; calls are optional, not assumed." },
  { key: "remote_hybrid", label: "Remote / hybrid available", help: "Role can be done fully remote or on a hybrid pattern." },
  { key: "accessible_commute", label: "Accessible commute information", help: "Accessible transport routes, parking and door-to-door details published." },
  { key: "ergonomic_equipment", label: "Adjustable workstation & ergonomic equipment", help: "Employer provides adjustable desks, seating and ergonomic peripherals." },
  { key: "assistive_tech", label: "Assistive technology support", help: "Budget and IT support for assistive hardware and software." },
];

/** Work practices for the neurodivergent work-style pathway. */
export const NEURO_FEATURES: AccessFeature[] = [
  { key: "written_instructions", label: "Written instructions", help: "Briefs and tasks are documented, not only spoken." },
  { key: "low_distraction", label: "Quiet / low-distraction workspace", help: "Focus space, quiet rooms or a no-open-plan option." },
  { key: "predictable_schedule", label: "Predictable scheduling", help: "Stable routine, agendas ahead of time, few surprise meetings." },
  { key: "clear_expectations", label: "Clear task expectations", help: "Explicit definitions of done, priorities and deadlines." },
  { key: "low_task_switching", label: "Reduced task-switching", help: "Blocks of focused work instead of constant context switching." },
  { key: "flexible_breaks", label: "Flexible breaks", help: "Breaks taken as needed, without asking each time." },
  { key: "sensory_friendly", label: "Sensory-friendly environment", help: "Control over noise, lighting and sensory load." },
  { key: "processing_time", label: "Extra processing time", help: "Thinking time before answers, extended deadlines where reasonable." },
  { key: "text_first", label: "Text-first communication", help: "Written updates by default; calls are optional, not assumed." },
  { key: "remote_hybrid", label: "Remote / hybrid available", help: "Role can be done fully remote or on a hybrid pattern." },
  { key: "interview_accommodations", label: "Structured interview accommodations", help: "Questions shared ahead, extra time, task-based alternatives to live interviews." },
];

export const FEATURES_BY_PATHWAY: Record<Pathway, AccessFeature[]> = {
  [PATHWAY_PHYSICAL]: PHYSICAL_FEATURES,
  [PATHWAY_NEURO]: NEURO_FEATURES,
};

export const FEATURE_LABELS: Record<string, string> = Object.fromEntries(
  [...PHYSICAL_FEATURES, ...NEURO_FEATURES].map((f) => [f.key, f.label]),
);

export const SUPPORT_WEIGHT: Record<string, number> = { Yes: 1, Partial: 0.6, No: 0 };

export type AccessStatus =
  | "Strong access match"
  | "Partial access match — accommodation may be needed"
  | "Access information unavailable";

export interface DomainAccessResult {
  /** null when the employer published nothing about any of the candidate's needs. */
  score: number | null;
  /** Share of the candidate's needs the employer has published information about. */
  coverage: number;
  status: AccessStatus;
  supported: string[];
  partial: string[];
  missing: string[];
  unstated: string[];
}

/**
 * Scores how well a job's published environment supports the needs the candidate
 * selected. A missing support NEVER hides a job — it only changes the label.
 */
export function scoreAccessDomain(
  needs: string[],
  offered: Record<string, unknown> | null | undefined,
): DomainAccessResult {
  const supported: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];
  const unstated: string[] = [];
  const values: number[] = [];
  const map = (offered ?? {}) as Record<string, unknown>;

  for (const need of needs) {
    const raw = map[need];
    if (raw === undefined || raw === null || raw === "" || raw === "Unknown") {
      unstated.push(need);
      continue;
    }
    const value = raw === true ? "Yes" : raw === false ? "No" : String(raw);
    const weight = SUPPORT_WEIGHT[value] ?? 0;
    values.push(weight);
    if (weight >= 1) supported.push(need);
    else if (weight > 0) partial.push(need);
    else missing.push(need);
  }

  if (!needs.length || !values.length) {
    return {
      score: null,
      coverage: needs.length ? values.length / needs.length : 0,
      status: "Access information unavailable",
      supported, partial, missing, unstated,
    };
  }

  // Only what the employer actually published is scored — silence is "unknown",
  // never a fail. Coverage tells the candidate how much is unknown.
  const score = values.reduce((a, b) => a + b, 0) / values.length;
  const coverage = values.length / needs.length;
  const status: AccessStatus =
    score > 0.95 && coverage === 1
      ? "Strong access match"
      : "Partial access match — accommodation may be needed";
  return { score, coverage, status, supported, partial, missing, unstated };
}

export const ACCESS_STATUS_ORDER: AccessStatus[] = [
  "Strong access match",
  "Partial access match — accommodation may be needed",
  "Access information unavailable",
];

/** Combined status across the pathways a candidate uses. */
export function combineStatus(statuses: (AccessStatus | null)[]): AccessStatus {
  const present = statuses.filter(Boolean) as AccessStatus[];
  if (!present.length) return "Access information unavailable";
  if (present.every((s) => s === "Strong access match")) return "Strong access match";
  if (present.some((s) => s === "Partial access match — accommodation may be needed")) {
    return "Partial access match — accommodation may be needed";
  }
  return present[0];
}
