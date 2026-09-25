// ─────────────────────────────────────────────────────────────────────────────
// AccessHire matching engine (runs in the browser against live Firestore data).
//
// SEPARATE DIMENSIONS — this separation is a product rule, not a detail:
//
//   A) Skills & Interests match  → the ONLY capability score. Accessibility
//      answers, access needs and work-style needs can never change it.
//   B) Physical & sensory compatibility → label + score over what the employer
//      published about its environment, plus work-type fit.
//   C) Neurodivergent work-style compatibility → label + score over published
//      work practices and work-style fit.
//   D) Employer openness → whether the employer said it hires people in the
//      disability category the candidate chose to share.
//
// B, C and D never lower A, never cap the recommendation and never hide a job.
// ─────────────────────────────────────────────────────────────────────────────

import { STYLE_KEYS, STYLE_LABELS, STYLE_SCALES } from "@/lib/taxonomy";
import {
  JOB_CATEGORY_SHORT,
  computeAvailability,
  deadlineLabel,
  isRecommendable,
  type AccessProvenance,
  type AvailabilityStatus,
  type ConfidenceReport,
  type EmployerInclusion,
  type SkillRequirement,
} from "@/lib/canonical";
import {
  DISABILITY_CATEGORIES,
  PATHWAY_NEURO,
  PATHWAY_PHYSICAL,
  WORK_TYPE_LABELS,
  combineStatus,
  scoreAccessDomain,
  type AccessStatus,
  type DomainAccessResult,
} from "@/lib/pathways";

export type { SkillRequirement };

export interface JobListing {
  id: string;
  company_id?: string;
  company_name: string;
  company_name_source?: "stated" | "derived";
  company_website?: string | null;
  job_title: string;
  location: string;
  cities?: string[];
  work_mode?: string | null;
  salary_range: string | null;
  exp_level: string;
  edu_level: string;
  skill_requirements: Record<string, SkillRequirement>;
  required_skills?: Record<string, SkillRequirement> | null;
  preferred_skills?: Record<string, SkillRequirement> | null;
  interest_areas?: string[] | null;
  employment_type?: string | null;
  apply_contact?: string | null;
  source_system?: string | null;
  work_style: Record<string, string>;
  accessibility_params: Record<string, string>;
  physical_access?: Record<string, string> | null;
  neuro_practices?: Record<string, string> | null;
  inclusion?: EmployerInclusion | null;
  sector?: string | null;
  description?: string | null;
  /** Real-role logistics — null means the employer did not provide it. */
  vacancies?: number | null;
  application_deadline?: string | null;
  working_hours?: string | null;
  apply_method?: string | null;
  job_category?: string | null;
  job_category_source?: "stated" | "derived" | null;
  department?: string | null;
  availability_status?: AvailabilityStatus | null;
  access_provenance?: AccessProvenance | null;
  data_confidence?: ConfidenceReport | null;
  source_record_id?: string | null;
  source_created_at?: string | null;
  validation_status?: string | null;
  validation_errors?: string[] | null;
}

export interface CandidateAccessProfile {
  physical?: string[];
  neuro?: string[];
  /** Optional self-described disability categories (pathways.ts DISABILITY_CATEGORIES). */
  categories?: string[];
  /** Kinds of work that suit the candidate physically (intake job categories). */
  work_types?: string[];
  notes?: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  user_id?: string | null;
  source?: string | null;
  /** False until the skills section of an assessment has been completed. */
  skills_assessed?: boolean;
  exp_level: string;
  edu_needed: string;
  skills_profile: Record<string, string>;
  work_style_pref: Record<string, string>;
  accessibility_needs: string[];
  interests?: string[] | null;
  assistive_tech?: string[] | null;
  comm_prefs?: Record<string, string> | null;
  pathways?: string[] | null;
  access_profile?: CandidateAccessProfile | null;
}

export type Recommendation = "Strong Match" | "Good Match" | "Partial Match" | "Not Suitable";

export interface SkillBreakdown {
  skill: string;
  required: string;
  importance: string;
  candidate: string;
  score: number;
  met: boolean;
  preferred?: boolean;
}

export interface StyleBreakdown {
  key: string;
  label: string;
  job: string;
  candidate: string;
  score: number;
}

export interface AccessibilityBreakdown {
  area: string;
  support: string;
  needed: boolean;
  score: number;
}

export type OpennessStatus =
  | "Open to your category"
  | "Possibly open"
  | "Your category not listed"
  | "Not currently open"
  | "Not stated";

export interface EmployerOpenness {
  status: OpennessStatus;
  detail: string;
}

export interface WorkTypeFit {
  status: "Suits you" | "Check the physical demands";
  detail: string;
}

export interface MatchResult {
  job_id: string;
  candidate_id: string;
  company: string;
  job_title: string;
  candidate: string;
  /** Dimension A — capability only. Identical to skills_interest_score. */
  match_score: number;
  skills_interest_score?: number;
  skills_score: number;
  interests_score?: number;
  exp_edu_score: number;
  work_pref_score: number;
  accessibility_score: number;
  top_strengths: string[];
  possible_gaps: string[];
  accessibility_fit: "High" | "Moderate";
  recommendation: Recommendation;
  /** Dimension B */
  physical_access_score?: number | null;
  physical_access_status?: AccessStatus | null;
  work_type_fit?: WorkTypeFit | null;
  /** Dimension C */
  neuro_access_score?: number | null;
  neuro_access_status?: AccessStatus | null;
  /** Dimension D */
  employer_openness?: EmployerOpenness | null;
  access_status?: AccessStatus;
  pathway_breakdown?: { physical: DomainAccessResult | null; neuro: DomainAccessResult | null };
  /** Human-readable reasons per dimension. */
  evidence?: { skills: string[]; interests: string[]; physical: string[]; neuro: string[] };
  accommodations_needed?: string[];
  /** Employer explicitly said "No" to something the candidate needs. */
  access_conflicts?: string[];
  /** Availability of the real role, from the employer's own numbers. */
  availability_status?: AvailabilityStatus;
  deadline_label?: string;
  vacancies?: number | null;
  /** False when the role is expired or has no vacancies. */
  is_recommendable?: boolean;
  /** How complete the employer's submission is. */
  confidence_level?: ConfidenceReport["level"];
  missing_information?: string[];
  blockers?: string[];
  notes?: string[];
  skill_breakdown?: SkillBreakdown[];
  style_breakdown?: StyleBreakdown[];
  accessibility_breakdown?: AccessibilityBreakdown[];
}

const LEVEL_MAP: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };
const IMPORTANCE_MAP: Record<string, number> = { Low: 0.25, Medium: 0.6, High: 1.0 };
const SUPPORT_MAP: Record<string, number> = { Yes: 1.0, Partial: 0.5, No: 0.0 };
const EXP_MAP: Record<string, number> = { Junior: 1, Intermediate: 2, Senior: 3 };
const EDU_MAP: Record<string, number> = { Diploma: 1, Bachelor: 2, Master: 3 };

/** Dimension A weights. Nothing accessibility-related appears here by design. */
export const WEIGHTS = { skills: 0.65, interests: 0.2, expEdu: 0.15 };

function styleScore(key: string, jobVal?: string, candVal?: string): number {
  if (!jobVal || !candVal) return 0.5;
  if (jobVal === candVal) return 1;
  const scale = STYLE_SCALES[key] ?? [];
  const a = scale.indexOf(jobVal);
  const b = scale.indexOf(candVal);
  if (a === -1 || b === -1) return 0.5;
  return Math.max(0, 1 - 0.5 * Math.abs(a - b));
}

const round = (n: number) => Math.round(n * 10000) / 10000;
const said = (v: string | null | undefined, word: string) => (v ?? "").trim().toLowerCase() === word;

/** Dimension D — what the employer said about hiring people in the candidate's categories. */
export function employerOpenness(
  inclusion: EmployerInclusion | null | undefined,
  categoryKeys: string[],
): EmployerOpenness | null {
  const cats = categoryKeys
    .map((k) => DISABILITY_CATEGORIES.find((c) => c.key === k))
    .filter((c): c is (typeof DISABILITY_CATEGORIES)[number] => Boolean(c));
  if (!cats.length) return null;
  if (!inclusion) return { status: "Not stated", detail: "This employer hasn't said which disability categories it hires for." };

  const listed = inclusion.pwd_categories.map((c) => c.toLowerCase());
  const open = new Set<string>();
  const maybe = new Set<string>();
  const closed = new Set<string>();

  for (const c of cats) {
    const answer =
      c.key === "visual"
        ? inclusion.willing_blind
        : c.pathway === PATHWAY_NEURO && c.key !== "intellectual"
          ? inclusion.willing_neurodivergent
          : null;
    if (listed.includes(c.employerCategory.toLowerCase()) && c.employerCategory !== "Other") open.add(c.label);
    else if (said(answer, "yes")) open.add(c.label);
    else if (cats.length > 1 && listed.includes("multiple disabilities")) open.add(c.label);
    else if (said(answer, "maybe")) maybe.add(c.label);
    else if (said(answer, "no")) closed.add(c.label);
  }

  const join = (s: Set<string>) => [...s].join(", ").toLowerCase();
  if (open.size) {
    return { status: "Open to your category", detail: `Employer says it is open to hiring people who are ${join(open)}.` };
  }
  if (maybe.size) {
    return { status: "Possibly open", detail: `Employer answered "Maybe" about hiring people who are ${join(maybe)}.` };
  }
  if (closed.size) {
    return {
      status: "Not currently open",
      detail: `Employer answered "No" about hiring people who are ${join(closed)}. You can still apply — this never hides the role.`,
    };
  }
  if (listed.length || said(inclusion.hires_pwd, "yes")) {
    return {
      status: "Your category not listed",
      detail: listed.length
        ? `Employer hires people with disabilities (lists: ${inclusion.pwd_categories.join(", ")}) but didn't list yours.`
        : "Employer says it hires people with disabilities, but didn't say which categories.",
    };
  }
  return { status: "Not stated", detail: "This employer hasn't said which disability categories it hires for." };
}

/** Part of dimension B — does the kind of work fit what the candidate said suits them? */
export function workTypeFit(jobCategory: string | null | undefined, workTypes: string[]): WorkTypeFit | null {
  if (!jobCategory || !workTypes.length || !WORK_TYPE_LABELS[jobCategory]) return null;
  const kind = (JOB_CATEGORY_SHORT[jobCategory] ?? jobCategory).toLowerCase();
  if (workTypes.includes(jobCategory)) {
    return { status: "Suits you", detail: `A ${kind} role — you said this kind of work suits you.` };
  }
  const preferred = workTypes.map((w) => (WORK_TYPE_LABELS[w] ?? w).toLowerCase()).join(" or ");
  return {
    status: "Check the physical demands",
    detail: `A ${kind} role; you said ${preferred} suits you best. Ask the employer what the role involves and which adjustments are possible.`,
  };
}

export function scorePair(job: JobListing, cand: CandidateProfile): MatchResult {
  const required = job.required_skills ?? job.skill_requirements ?? {};
  const preferred = job.preferred_skills ?? {};

  // ── A1. Required capability ───────────────────────────────────────────────
  const strengths: string[] = [];
  const gaps: string[] = [];
  const skillBreakdown: SkillBreakdown[] = [];
  let weighted = 0;
  let weightSum = 0;

  const scoreSkill = (skill: string, req: SkillRequirement, isPreferred: boolean) => {
    const candLabel = cand.skills_profile?.[skill] ?? "Beginner";
    const candLv = LEVEL_MAP[candLabel] ?? 1;
    const reqLv = LEVEL_MAP[req?.level] ?? 2;
    const imp = IMPORTANCE_MAP[req?.importance] ?? 0.6;
    const score = candLv >= reqLv ? 1 : candLv / reqLv;
    skillBreakdown.push({
      skill,
      required: req?.level ?? "Intermediate",
      importance: req?.importance ?? "Medium",
      candidate: candLabel,
      score: Math.round(score * 100) / 100,
      met: score >= 1,
      preferred: isPreferred,
    });
    if (score >= 1) strengths.push(skill);
    else if (!isPreferred) gaps.push(skill);
    return { score, imp };
  };

  for (const [skill, req] of Object.entries(required)) {
    const { score, imp } = scoreSkill(skill, req, false);
    weighted += score * imp;
    weightSum += imp;
  }
  for (const [skill, req] of Object.entries(preferred)) {
    const { score, imp } = scoreSkill(skill, req, true);
    weighted += score * imp * 0.5;
    weightSum += imp * 0.5;
  }
  // No requirements published → we cannot claim a capability score; stay neutral.
  const skillsFinal = weightSum ? weighted / weightSum : 0.6;

  // ── A2. Interests ─────────────────────────────────────────────────────────
  const jobInterests = job.interest_areas ?? [];
  const candInterests = cand.interests ?? [];
  const overlap = jobInterests.filter((a) => candInterests.includes(a));
  const interestsFinal = !jobInterests.length || !candInterests.length
    ? 0.6
    : Math.min(1, 0.35 + 0.65 * (overlap.length / Math.min(jobInterests.length, 3)));

  // ── A3. Experience & education (never penalises over-qualification) ───────
  const notes: string[] = [];
  const candExp = EXP_MAP[cand.exp_level] ?? 1;
  const jobExp = EXP_MAP[job.exp_level] ?? 1;
  const candEdu = EDU_MAP[cand.edu_needed] ?? 1;
  const jobEdu = EDU_MAP[job.edu_level] ?? 1;
  const expScore = candExp >= jobExp ? 1 : 0.6;
  const eduScore = candEdu >= jobEdu ? 1 : 0.6;
  if (candExp < jobExp) notes.push(`Role asks for ${job.exp_level.toLowerCase()} experience`);
  if (candEdu < jobEdu) notes.push(`Role lists a ${job.edu_level} qualification`);
  const expEduFinal = (expScore + eduScore) / 2;

  const skillsInterest =
    skillsFinal * WEIGHTS.skills + interestsFinal * WEIGHTS.interests + expEduFinal * WEIGHTS.expEdu;

  let recommendation: Recommendation;
  if (skillsInterest > 0.85) recommendation = "Strong Match";
  else if (skillsInterest > 0.7) recommendation = "Good Match";
  else if (skillsInterest > 0.5) recommendation = "Partial Match";
  else recommendation = "Not Suitable";

  // ── B. Physical & sensory compatibility (separate dimension) ──────────────
  const pathways = cand.pathways ?? [];
  const physNeeds = cand.access_profile?.physical ?? [];
  const neuroNeeds = cand.access_profile?.neuro ?? [];
  const physical =
    pathways.includes(PATHWAY_PHYSICAL) && physNeeds.length
      ? scoreAccessDomain(physNeeds, job.physical_access)
      : null;
  const workType = pathways.includes(PATHWAY_PHYSICAL)
    ? workTypeFit(job.job_category, cand.access_profile?.work_types ?? [])
    : null;

  // ── C. Neurodivergent work-style compatibility (separate dimension) ───────
  const neuro =
    pathways.includes(PATHWAY_NEURO) && neuroNeeds.length
      ? scoreAccessDomain(neuroNeeds, job.neuro_practices)
      : null;

  // ── D. Employer openness to the candidate's category ──────────────────────
  const openness = employerOpenness(job.inclusion, cand.access_profile?.categories ?? []);

  // Work-style comparison informs dimension C's narrative only.
  const styleBreakdown: StyleBreakdown[] = STYLE_KEYS.map((k) => {
    const jobVal = job.work_style?.[k];
    const candVal = cand.work_style_pref?.[k];
    return {
      key: k,
      label: STYLE_LABELS[k] ?? k,
      job: jobVal ?? "—",
      candidate: candVal ?? "—",
      score: styleScore(k, jobVal, candVal),
    };
  });
  const workPrefFinal = styleBreakdown.reduce((a, b) => a + b.score, 0) / STYLE_KEYS.length;

  // Per-area accessibility view (kept for the detail panel).
  const accBreakdown: AccessibilityBreakdown[] = [];
  const needs = cand.accessibility_needs ?? [];
  const accScores: number[] = [];
  for (const [area, supported] of Object.entries(job.accessibility_params ?? {})) {
    const needed = needs.includes(area);
    const s = SUPPORT_MAP[supported] ?? 0;
    accBreakdown.push({ area, support: supported, needed, score: s });
    if (needed) accScores.push(s);
  }
  for (const need of needs) {
    if (!(need in (job.accessibility_params ?? {}))) {
      accBreakdown.push({ area: need, support: "Not stated", needed: true, score: 0 });
    }
  }
  const accFinal = accScores.length ? accScores.reduce((a, b) => a + b, 0) / accScores.length : 1;

  const pathwayScores = [physical?.score, neuro?.score].filter((v): v is number => typeof v === "number");
  const accessibilityFinal = pathwayScores.length
    ? pathwayScores.reduce((a, b) => a + b, 0) / pathwayScores.length
    : accFinal;

  const accommodations = [
    ...(physical?.missing ?? []),
    ...(neuro?.missing ?? []),
  ].map((label) => `${label} — would need to be arranged as an accommodation`);

  // Provenance-aware wording: candidates should always know whether a support
  // was confirmed by the employer or inferred from a related answer.
  const prov = job.access_provenance ?? {};
  const basisNote = (feature: string) => {
    const entry = prov[feature];
    if (!entry) return "";
    if (entry.basis === "employer_confirmed") return " (employer-confirmed)";
    return ` (inferred from the employer's ${entry.source_fields.join(", ")} answer)`;
  };

  // A conflict is only ever an employer-stated "No" against a stated need.
  const conflicts: string[] = [];
  const addConflicts = (
    missing: string[] | undefined,
    map: Record<string, string> | null | undefined,
  ) => {
    for (const feature of missing ?? []) {
      if ((map?.[feature] ?? "") !== "No") continue;
      const entry = prov[feature];
      conflicts.push(
        entry?.basis === "employer_confirmed"
          ? `${feature}: the employer has stated this is not available`
          : `${feature}: likely unavailable based on the employer's ${entry?.source_fields.join(", ") ?? "submission"}`,
      );
    }
  };
  addConflicts(physical?.missing, job.physical_access);
  addConflicts(neuro?.missing, job.neuro_practices);

  const availability = (job.availability_status as AvailabilityStatus | undefined) ??
    computeAvailability(job.application_deadline ?? null, job.vacancies ?? null);

  const evidence = {
    skills: skillBreakdown
      .filter((s) => !s.preferred)
      .map((s) =>
        s.met
          ? `${s.skill}: your ${s.candidate.toLowerCase()} level meets the ${s.required.toLowerCase()} requirement`
          : `${s.skill}: role asks for ${s.required.toLowerCase()}, your profile shows ${s.candidate.toLowerCase()}`,
      ),
    interests: overlap.length
      ? [`Shared work areas: ${overlap.join(", ")}`]
      : jobInterests.length
        ? [`This role sits in ${jobInterests.slice(0, 2).join(", ")} — not in your stated interests`]
        : ["Employer did not state a role/interest area"],
    physical: physical
      ? [
          ...physical.supported.map((f) => `${f}: published as available${basisNote(f)}`),
          ...physical.partial.map((f) => `${f}: partially available${basisNote(f)}`),
          ...physical.missing.map((f) => `${f}: not available${basisNote(f)} — accommodation needed`),
          ...physical.unstated.map((f) => `${f}: employer has not published this yet`),
        ]
      : [],
    neuro: neuro
      ? [
          ...neuro.supported.map((f) => `${f}: published as available${basisNote(f)}`),
          ...neuro.partial.map((f) => `${f}: partially available${basisNote(f)}`),
          ...neuro.missing.map((f) => `${f}: not available${basisNote(f)} — accommodation needed`),
          ...neuro.unstated.map((f) => `${f}: employer has not published this yet`),
        ]
      : [],
  };

  return {
    job_id: job.id,
    candidate_id: cand.id,
    company: job.company_name,
    job_title: job.job_title,
    candidate: cand.name,
    match_score: round(skillsInterest),
    skills_interest_score: round(skillsInterest),
    skills_score: round(skillsFinal),
    interests_score: round(interestsFinal),
    exp_edu_score: round(expEduFinal),
    work_pref_score: round(workPrefFinal),
    accessibility_score: round(accessibilityFinal),
    top_strengths: strengths,
    possible_gaps: gaps,
    accessibility_fit: accessibilityFinal > 0.8 ? "High" : "Moderate",
    recommendation,
    physical_access_score: physical?.score == null ? null : round(physical.score),
    physical_access_status: physical?.status ?? null,
    work_type_fit: workType,
    neuro_access_score: neuro?.score == null ? null : round(neuro.score),
    neuro_access_status: neuro?.status ?? null,
    employer_openness: openness,
    access_status:
      physical || neuro
        ? combineStatus([physical?.status ?? null, neuro?.status ?? null])
        : "Access information unavailable",
    pathway_breakdown: { physical, neuro },
    evidence,
    accommodations_needed: accommodations,
    access_conflicts: conflicts,
    availability_status: availability,
    deadline_label: deadlineLabel(job.application_deadline ?? null),
    vacancies: job.vacancies ?? null,
    is_recommendable: isRecommendable(availability),
    confidence_level: job.data_confidence?.level ?? "Low",
    missing_information: job.data_confidence?.missing ?? [],
    notes,
    skill_breakdown: skillBreakdown,
    style_breakdown: styleBreakdown,
    accessibility_breakdown: accBreakdown,
  };
}

export function matchAll(jobs: JobListing[], candidates: CandidateProfile[]): MatchResult[] {
  const out: MatchResult[] = [];
  for (const job of jobs) for (const cand of candidates) out.push(scorePair(job, cand));
  // Closed / no-vacancy roles always sort below live ones.
  return out.sort(
    (a, b) =>
      Number(b.is_recommendable) - Number(a.is_recommendable) || b.match_score - a.match_score,
  );
}
