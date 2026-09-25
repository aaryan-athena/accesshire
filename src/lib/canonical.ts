// ─────────────────────────────────────────────────────────────────────────────
// AccessHire canonical domain model.
//
// This file is the single contract between:
//   employer intake form (Firestore)  →  canonical job  →  matching engine  →  UI
//   AccessHire assessments            →  canonical candidate profile
//
// Nothing here ever invents employer data: absent stays absent, and every
// derived value is labelled as derived.
// ─────────────────────────────────────────────────────────────────────────────

import { EDU_LEVELS, EXP_LEVELS, SKILL_AXES } from "@/lib/taxonomy";

/** Work/interest areas. Doubles as the "interests" vocabulary for candidates
 *  and the "role family" vocabulary for employers. */
export const INTEREST_AREAS = [
  "Administration & Office Support",
  "Customer Support",
  "Data & Analytics",
  "Design",
  "Education & Training",
  "Engineering / Software",
  "Finance & Accounting",
  "Healthcare Support",
  "Hospitality & Food Service",
  "Human Resources",
  "Legal & Compliance",
  "Logistics & Warehouse",
  "Manufacturing & Production",
  "Marketing",
  "Operations",
  "Product Management",
  "Quality Assurance",
  "Sales & Business Development",
  "Skilled Trades",
] as const;

export type InterestArea = (typeof INTEREST_AREAS)[number];

export const WORK_MODES = ["Remote", "Hybrid", "On-site"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const VALIDATION_STATUSES = ["valid", "warning", "invalid"] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

/** The intake form's job categories ("collar" groupings) and their departments. */
export const JOB_CATEGORIES: Record<string, string[]> = {
  "White Collar (Desk Jobs)": [
    "Engineering", "Design", "Product", "Marketing", "Sales", "Finance", "Human Resources",
    "Legal", "IT", "Quality Assurance", "Customer Support", "Operations",
  ],
  "Blue Collar (Skilled & Manual Labor)": [
    "Machine Operator", "Electrician", "Plumber", "Technician", "Driver", "Warehouse Worker",
    "Construction Worker", "Mechanic", "Fabricator / Welder",
  ],
  "Grey Collar (Support & Field Staff)": [
    "Office Boy / Peon", "Helper", "Housekeeping", "Security Guard", "Delivery / Courier",
    "Receptionist", "Field Assistant",
  ],
};

export const JOB_CATEGORY_NAMES = Object.keys(JOB_CATEGORIES);

/** Short, candidate-facing names for the job categories. */
export const JOB_CATEGORY_SHORT: Record<string, string> = {
  "White Collar (Desk Jobs)": "Desk-based",
  "Blue Collar (Skilled & Manual Labor)": "Hands-on / manual",
  "Grey Collar (Support & Field Staff)": "Support & field",
};

/** The intake form's disability categories, verbatim. */
export const EMPLOYER_PWD_CATEGORIES = [
  "Physical Disability (locomotor)",
  "Visual Impairment (blind / low vision)",
  "Hearing Impairment (deaf / hard of hearing)",
  "Intellectual Disability",
  "Neurodivergent Conditions (autism, ADHD, dyslexia, etc.)",
  "Multiple Disabilities",
  "Other",
] as const;

/** Assistive technology / accommodation preferences a candidate can declare. */
export const ASSISTIVE_TECH = [
  "Screen reader (JAWS, NVDA, VoiceOver)",
  "Screen magnification / high contrast",
  "Speech-to-text or dictation",
  "Alternative keyboard or pointing device",
  "Captions / live transcription",
  "Sign language interpretation",
  "Reading & writing support tools",
  "Adjustable desk or ergonomic seating",
  "Noise-cancelling headphones",
] as const;

export const COMM_PREF_KEYS = ["instructions", "meetings", "feedback", "interview"] as const;

export const COMM_PREF_LABELS: Record<string, string> = {
  instructions: "Instructions",
  meetings: "Meetings",
  feedback: "Feedback",
  interview: "Interviews",
};

export interface CandidateAssessmentVersions {
  neurodivergent?: string;
  physical_sensory?: string;
}

export interface SkillRequirement {
  level: string;
  importance: string;
}

// ── Availability & provenance ───────────────────────────────────────────────

/** How a published accessibility value was obtained. */
export type AccessBasis = "employer_confirmed" | "derived" | "not_provided";

export interface AccessProvenanceEntry {
  value: string;
  basis: AccessBasis;
  /** The source field(s) the value came from, verbatim field names. */
  source_fields: string[];
  /** Employer's own wording, when there is one. */
  source_value?: string | null;
}

export type AccessProvenance = Record<string, AccessProvenanceEntry>;

export const AVAILABILITY_STATUSES = ["Open", "Closes today", "Expired", "No vacancies"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export interface ConfidenceReport {
  level: "High" | "Medium" | "Low";
  score: number;
  provided: string[];
  missing: string[];
}

/** What the employer told us about who they are open to hiring. */
export interface EmployerInclusion {
  /** Employer's own pwdCategories answers, verbatim. */
  pwd_categories: string[];
  hires_pwd: string | null;
  willing_blind: string | null;
  willing_neurodivergent: string | null;
  pwd_quota: string | null;
  pwd_csr: string | null;
  pledge_accepted: boolean;
}

/** A job in AccessHire's own shape. The intake adapter must produce exactly this. */
export interface CanonicalJob {
  id: string;
  company_id: string;
  company_name: string;
  /** "stated" = the employer typed it; "derived" = taken from their website/email domain. */
  company_name_source: "stated" | "derived";
  company_website: string | null;
  job_title: string;
  location: string;
  cities: string[];
  work_mode: WorkMode;
  employment_type: string | null;
  salary_range: string | null;
  exp_level: string;
  edu_level: string;
  sector: string;
  description: string | null;
  apply_contact: string | null;
  /** Real-role logistics, never invented — null means "not provided". */
  vacancies: number | null;
  application_deadline: string | null;
  working_hours: string | null;
  apply_method: string | null;
  job_category: string | null;
  job_category_source: "stated" | "derived" | null;
  department: string | null;
  availability_status: AvailabilityStatus;
  /** Capability requirements — the ONLY thing that drives the primary match score. */
  required_skills: Record<string, SkillRequirement>;
  preferred_skills: Record<string, SkillRequirement>;
  interest_areas: string[];
  /** Employer-published physical & sensory features. */
  physical_access: Record<string, string>;
  /** Employer-published neuroinclusive work practices. */
  neuro_practices: Record<string, string>;
  /** Where every published access value came from. */
  access_provenance: AccessProvenance;
  inclusion: EmployerInclusion;
  /** How complete the employer's submission is. */
  data_confidence: ConfidenceReport;
  // Legacy fields still read by older UI paths — kept in sync with the above.
  skill_requirements: Record<string, SkillRequirement>;
  work_style: Record<string, string>;
  accessibility_params: Record<string, string>;

  // Source / audit trail
  source_system: string;
  source_record_id: string;
  source_created_at: string | null;
  validation_status: ValidationStatus;
  validation_errors: string[];
}

// ── Level scales ────────────────────────────────────────────────────────────

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function normalizeExpLevel(raw: unknown): string {
  const v = clean(raw).toLowerCase();
  if (!v) return "Junior";
  if (/fresh|entry|intern|trainee|graduate|junior|0-1|0 - 1/.test(v)) return "Junior";
  if (/senior|lead|head|principal|manager|director|10\+|15\+/.test(v)) return "Senior";
  if (/mid|inter|3-5|5-7|5-10|2-4/.test(v)) return "Intermediate";
  const years = Number(v.match(/\d+/)?.[0] ?? NaN);
  if (!Number.isNaN(years)) return years >= 8 ? "Senior" : years >= 3 ? "Intermediate" : "Junior";
  return EXP_LEVELS.includes(v as never) ? v : "Junior";
}

export function normalizeEduLevel(raw: unknown): string {
  const v = clean(raw).toLowerCase();
  if (!v) return "Diploma";
  if (/master|mba|m\.?tech|postgrad|pg\b/.test(v)) return "Master";
  if (/bachelor|graduat|b\.?tech|b\.?a\b|b\.?com|degree|undergrad/.test(v)) return "Bachelor";
  if (/diploma|12th|10th|iti|school|certificate|any/.test(v)) return "Diploma";
  return EDU_LEVELS.includes(v as never) ? v : "Diploma";
}

export function normalizeWorkMode(raw: unknown): WorkMode {
  const v = clean(raw).toLowerCase();
  if (/remote|wfh|work from home/.test(v)) return "Remote";
  if (/hybrid|flex/.test(v)) return "Hybrid";
  return "On-site";
}

/** Keeps the employer's own wording, only tidying whitespace/blank markers. */
export function normalizeSalary(min: unknown, max: unknown): string | null {
  const a = clean(min);
  const b = clean(max);
  if (!a && !b) return null;
  if (a && b) return a === b ? a : `${a} – ${b}`;
  return a || b;
}

// ── Role family → capability requirements ───────────────────────────────────
// Deterministic, documented mapping from the role information employers actually
// submit (role family, department, seniority). No random or hashed values.

type AxisTuple = { required: string[]; preferred: string[] };

export const ROLE_SKILL_PROFILES: Record<string, AxisTuple> = {
  "Administration & Office Support": { required: ["Organization", "Communication"], preferred: ["Technical Skills"] },
  "Customer Support": { required: ["Communication", "Problem Solving"], preferred: ["Adaptability"] },
  "Data & Analytics": { required: ["Technical Skills", "Problem Solving"], preferred: ["Organization"] },
  Design: { required: ["Creativity", "Communication"], preferred: ["Technical Skills"] },
  "Education & Training": { required: ["Communication", "Organization"], preferred: ["Creativity"] },
  "Engineering / Software": { required: ["Technical Skills", "Problem Solving"], preferred: ["Teamwork"] },
  "Finance & Accounting": { required: ["Organization", "Problem Solving"], preferred: ["Technical Skills"] },
  "Healthcare Support": { required: ["Communication", "Organization"], preferred: ["Adaptability"] },
  "Hospitality & Food Service": { required: ["Communication", "Adaptability"], preferred: ["Teamwork"] },
  "Human Resources": { required: ["Communication", "Organization"], preferred: ["Teamwork"] },
  "Legal & Compliance": { required: ["Organization", "Communication"], preferred: ["Problem Solving"] },
  "Logistics & Warehouse": { required: ["Organization", "Adaptability"], preferred: ["Teamwork"] },
  "Manufacturing & Production": { required: ["Organization", "Technical Skills"], preferred: ["Teamwork"] },
  Marketing: { required: ["Communication", "Creativity"], preferred: ["Problem Solving"] },
  Operations: { required: ["Organization", "Problem Solving"], preferred: ["Teamwork"] },
  "Product Management": { required: ["Communication", "Problem Solving"], preferred: ["Organization"] },
  "Quality Assurance": { required: ["Organization", "Problem Solving"], preferred: ["Technical Skills"] },
  "Sales & Business Development": { required: ["Communication", "Adaptability"], preferred: ["Teamwork"] },
  "Skilled Trades": { required: ["Technical Skills", "Adaptability"], preferred: ["Organization"] },
};

const INTEREST_ALIASES: Record<string, string> = {
  admin: "Administration & Office Support",
  administration: "Administration & Office Support",
  "office support": "Administration & Office Support",
  "back office": "Administration & Office Support",
  "computer operator": "Administration & Office Support",
  "data entry": "Administration & Office Support",
  receptionist: "Administration & Office Support",
  "customer support": "Customer Support",
  "customer service": "Customer Support",
  support: "Customer Support",
  "customer success": "Customer Support",
  data: "Data & Analytics",
  analytics: "Data & Analytics",
  "data & analytics": "Data & Analytics",
  design: "Design",
  creative: "Design",
  education: "Education & Training",
  training: "Education & Training",
  teaching: "Education & Training",
  engineering: "Engineering / Software",
  "engineering / software": "Engineering / Software",
  software: "Engineering / Software",
  developer: "Engineering / Software",
  it: "Engineering / Software",
  "it support": "Engineering / Software",
  "technical support": "Engineering / Software",
  technology: "Engineering / Software",
  finance: "Finance & Accounting",
  accounts: "Finance & Accounting",
  accounting: "Finance & Accounting",
  "finance & accounting": "Finance & Accounting",
  healthcare: "Healthcare Support",
  hospitality: "Hospitality & Food Service",
  "hospitality & tourism": "Hospitality & Food Service",
  restaurant: "Hospitality & Food Service",
  "food service": "Hospitality & Food Service",
  housekeeping: "Hospitality & Food Service",
  hr: "Human Resources",
  "human resources": "Human Resources",
  people: "Human Resources",
  legal: "Legal & Compliance",
  compliance: "Legal & Compliance",
  logistics: "Logistics & Warehouse",
  "logistics & supply chain": "Logistics & Warehouse",
  warehouse: "Logistics & Warehouse",
  "supply chain": "Logistics & Warehouse",
  packer: "Logistics & Warehouse",
  packager: "Logistics & Warehouse",
  delivery: "Logistics & Warehouse",
  courier: "Logistics & Warehouse",
  driver: "Logistics & Warehouse",
  manufacturing: "Manufacturing & Production",
  production: "Manufacturing & Production",
  factory: "Manufacturing & Production",
  "machine operator": "Manufacturing & Production",
  "sewing machine operator": "Manufacturing & Production",
  marketing: "Marketing",
  "digital marketing": "Marketing",
  operations: "Operations",
  ops: "Operations",
  product: "Product Management",
  "product management": "Product Management",
  qa: "Quality Assurance",
  "quality assurance": "Quality Assurance",
  quality: "Quality Assurance",
  testing: "Quality Assurance",
  sales: "Sales & Business Development",
  "sales & business development": "Sales & Business Development",
  "business development": "Sales & Business Development",
  "relationship manager": "Sales & Business Development",
  leasing: "Sales & Business Development",
  bd: "Sales & Business Development",
  trades: "Skilled Trades",
  electrical: "Skilled Trades",
  electrician: "Skilled Trades",
  plumber: "Skilled Trades",
  mechanic: "Skilled Trades",
  welder: "Skilled Trades",
  technician: "Skilled Trades",
  maintenance: "Skilled Trades",
};

/** Maps a free-text role/department/industry label onto the interest vocabulary. */
export function toInterestArea(raw: unknown): string | null {
  const v = clean(raw).toLowerCase();
  if (!v) return null;
  const exact = INTEREST_AREAS.find((a) => a.toLowerCase() === v);
  if (exact) return exact;
  if (INTEREST_ALIASES[v]) return INTEREST_ALIASES[v];
  // Longest alias first, so "sewing machine operator" beats "operator"-style hits.
  const aliases = Object.keys(INTEREST_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (alias.length <= 2) {
      if (new RegExp(`\\b${alias}\\b`).test(v)) return INTEREST_ALIASES[alias];
    } else if (v.includes(alias)) {
      return INTEREST_ALIASES[alias];
    }
  }
  return null;
}

/** The job category a department belongs to in the intake form, if it is unambiguous. */
export function categoryForDepartment(department: unknown): string | null {
  const d = clean(department).toLowerCase();
  if (!d || d === "other") return null;
  for (const [category, departments] of Object.entries(JOB_CATEGORIES)) {
    if (departments.some((x) => x.toLowerCase() === d)) return category;
  }
  return null;
}

const LEVEL_BY_EXP: Record<string, string> = {
  Junior: "Beginner",
  Intermediate: "Intermediate",
  Senior: "Advanced",
};

/**
 * Builds required/preferred capability requirements from the role family and
 * seniority the employer stated. Seniority sets the level; role family sets which
 * axes matter. Unmapped axes are simply absent (never guessed at).
 */
export function buildSkillRequirements(
  interestAreas: string[],
  expLevel: string,
): { required: Record<string, SkillRequirement>; preferred: Record<string, SkillRequirement> } {
  const level = LEVEL_BY_EXP[expLevel] ?? "Intermediate";
  const required: Record<string, SkillRequirement> = {};
  const preferred: Record<string, SkillRequirement> = {};

  for (const area of interestAreas) {
    const profile = ROLE_SKILL_PROFILES[area];
    if (!profile) continue;
    for (const axis of profile.required) {
      if (SKILL_AXES.includes(axis as never)) required[axis] = { level, importance: "High" };
    }
    for (const axis of profile.preferred) {
      if (SKILL_AXES.includes(axis as never) && !required[axis]) {
        preferred[axis] = { level: "Intermediate", importance: "Medium" };
      }
    }
  }
  return { required, preferred };
}

// ── Validation ──────────────────────────────────────────────────────────────

export interface ValidationOutcome {
  status: ValidationStatus;
  errors: string[];
}

/** Required fields must be present and real; everything else raises a warning. */
export function validateCanonicalJob(job: Partial<CanonicalJob>): ValidationOutcome {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!clean(job.job_title)) errors.push("job_title is missing");
  if (!job.source_record_id) errors.push("source_record_id is missing");
  if (!clean(job.company_name)) warnings.push("employer did not state a company name");
  else if (job.company_name_source === "derived") {
    warnings.push("company name taken from the employer's website/email domain");
  }
  if (!clean(job.location)) warnings.push("no hiring location provided");
  if (!job.interest_areas?.length) warnings.push("no recognised role/interest area");
  if (!Object.keys(job.required_skills ?? {}).length) {
    warnings.push("no capability requirements could be derived from the submitted role data");
  }
  if (!Object.keys(job.physical_access ?? {}).length) {
    warnings.push("employer published no physical & sensory accessibility information");
  }
  if (!Object.keys(job.neuro_practices ?? {}).length) {
    warnings.push("employer published no neuroinclusive work-practice information");
  }
  if (!job.salary_range) warnings.push("no salary information provided");
  if (!job.application_deadline) warnings.push("no application deadline provided");
  if (job.vacancies === null || job.vacancies === undefined) {
    warnings.push("number of vacancies not provided");
  }
  if (job.availability_status === "No vacancies") warnings.push("employer reported 0 vacancies");
  if (job.availability_status === "Expired") warnings.push("application deadline has passed");

  if (errors.length) return { status: "invalid", errors };
  return { status: warnings.length ? "warning" : "valid", errors: warnings };
}

// ── Real-employer field normalization ───────────────────────────────────────
// Everything below deals with the messiness of actual intake submissions:
// punctuation-only titles, several roles typed into one title field, blank
// deadlines, "0" vacancies. Nothing is ever invented — absent stays absent.

const JUNK_TITLE = /^[^\p{L}\p{N}]*$/u;

/** "MARKETING MANAGER" → "Marketing Manager"; mixed-case input is left alone. */
export function tidyCase(value: string): string {
  if (!value || value !== value.toUpperCase() || !/[A-Z]{3}/.test(value)) return value;
  return value.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/**
 * Cleans an employer-typed job title.
 *   "· /"                                   → { title: null }
 *   "Computer Operator, Sewing Operator"    → { title: "Computer Operator",
 *                                               additional: ["Sewing Operator"] }
 */
export function cleanJobTitle(raw: unknown): { title: string | null; additional: string[] } {
  const v = tidyCase(
    clean(raw)
      .replace(/[·•|]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s\-–—/,.:;&]+|[\s\-–—/,.:;&]+$/g, "")
      .trim(),
  );
  if (!v || JUNK_TITLE.test(v)) return { title: null, additional: [] };

  const parts = v
    .split(/\s*(?:,|\/|\band\b|&)\s*/i)
    .map((p) => p.replace(/[.\s]+$/, "").trim())
    .filter((p) => p && !JUNK_TITLE.test(p));
  if (parts.length <= 1) return { title: v, additional: [] };
  return { title: parts[0], additional: parts.slice(1) };
}

/** "2" → 2, "" → null, "0" → 0. Never guesses a headcount. */
export function parseVacancies(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.trunc(raw) : null;
  const v = clean(raw).replace(/[,\s]/g, "");
  if (!v) return null;
  const n = Number(v.match(/-?\d+/)?.[0] ?? NaN);
  return Number.isFinite(n) ? n : null;
}

/** Parses a deadline to an ISO date (YYYY-MM-DD). Blank/garbage → null. */
export function parseDeadline(raw: unknown): string | null {
  const v = clean(raw);
  if (!v) return null;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const [, d, m] = dmy;
    let y = dmy[3];
    if (y.length === 2) y = `20${y}`;
    // Intake forms are India-based: day-first unless the first part cannot be a day.
    if (Number(d) > 12 || Number(m) <= 12) {
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export const DEADLINE_NOT_PROVIDED = "Not provided";

export const todayIso = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

export function deadlineLabel(deadline: string | null, today = todayIso()): string {
  if (!deadline) return DEADLINE_NOT_PROVIDED;
  if (deadline === today) return "Closes today";
  if (deadline < today) return `Closed ${deadline}`;
  return `Closes ${deadline}`;
}

/**
 * Availability from the employer's own numbers only.
 *   vacancies === 0            → "No vacancies"     (never recommended)
 *   deadline  <  today         → "Expired"          (never recommended)
 *   deadline === today         → "Closes today"     (still recommended)
 *   missing deadline/vacancies → "Open"             (never invented)
 */
export function computeAvailability(
  deadline: string | null,
  vacancies: number | null,
  today = todayIso(),
): AvailabilityStatus {
  if (vacancies !== null && vacancies <= 0) return "No vacancies";
  if (deadline && deadline < today) return "Expired";
  if (deadline && deadline === today) return "Closes today";
  return "Open";
}

export const RECOMMENDABLE_STATUSES: AvailabilityStatus[] = ["Open", "Closes today"];

export const isRecommendable = (status: AvailabilityStatus | string | null | undefined): boolean =>
  RECOMMENDABLE_STATUSES.includes((status ?? "Open") as AvailabilityStatus);

/** Availability of a listing, computed from the employer's own numbers only. */
export function availabilityOf(job: {
  availability_status?: string | null;
  application_deadline?: string | null;
  vacancies?: number | null;
}): AvailabilityStatus {
  return (
    (job.availability_status as AvailabilityStatus | undefined) ??
    computeAvailability(job.application_deadline ?? null, job.vacancies ?? null)
  );
}

/** Fields we tell candidates about; missing ones lower the listing's confidence. */
const CONFIDENCE_FIELDS: { key: string; label: string; weight: number }[] = [
  { key: "job_title", label: "Role title", weight: 1 },
  { key: "location", label: "Location", weight: 1 },
  { key: "description", label: "Role description", weight: 1 },
  { key: "salary_range", label: "Salary", weight: 1 },
  { key: "edu_level_stated", label: "Education requirement", weight: 0.5 },
  { key: "employment_type", label: "Employment type", weight: 0.5 },
  { key: "working_hours", label: "Working hours", weight: 0.5 },
  { key: "vacancies", label: "Number of vacancies", weight: 0.5 },
  { key: "application_deadline", label: "Application deadline", weight: 0.5 },
  { key: "apply_contact", label: "How to apply", weight: 0.5 },
  { key: "physical_access", label: "Physical & sensory access details", weight: 1.5 },
  { key: "neuro_practices", label: "Neuroinclusive work practices", weight: 1.5 },
];

export function computeConfidence(
  job: Partial<CanonicalJob> & { edu_level_stated?: boolean },
): ConfidenceReport {
  const present = (key: string): boolean => {
    switch (key) {
      case "physical_access": return Object.keys(job.physical_access ?? {}).length > 0;
      case "neuro_practices": return Object.keys(job.neuro_practices ?? {}).length > 0;
      case "vacancies": return job.vacancies !== null && job.vacancies !== undefined;
      case "edu_level_stated": return Boolean(job.edu_level_stated);
      default: return Boolean(clean((job as Record<string, unknown>)[key]));
    }
  };

  const provided: string[] = [];
  const missing: string[] = [];
  let got = 0;
  let total = 0;
  for (const f of CONFIDENCE_FIELDS) {
    total += f.weight;
    if (present(f.key)) { got += f.weight; provided.push(f.label); }
    else missing.push(f.label);
  }
  const score = total ? Math.round((got / total) * 100) / 100 : 0;
  return {
    level: score >= 0.8 ? "High" : score >= 0.55 ? "Medium" : "Low",
    score,
    provided,
    missing,
  };
}

// ── UI styles ───────────────────────────────────────────────────────────────

export const AVAILABILITY_STYLES: Record<AvailabilityStatus, string> = {
  Open: "bg-success/10 text-success",
  "Closes today": "bg-warning/15 text-warning",
  Expired: "bg-muted text-muted-foreground",
  "No vacancies": "bg-muted text-muted-foreground",
};

export const CONFIDENCE_STYLES: Record<ConfidenceReport["level"], string> = {
  High: "bg-success/10 text-success",
  Medium: "bg-primary/10 text-primary",
  Low: "bg-warning/15 text-warning",
};
