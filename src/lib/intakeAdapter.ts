// ─────────────────────────────────────────────────────────────────────────────
// Employer intake adapter.
//
//   Firestore `companies/{id}` (written by the intake form in form/, or by the
//   portal's own "Post a role" form)  →  one CanonicalJob per entry in `jobs[]`
//
// The matcher and the UI never see the form's raw shape. Nothing is invented:
// values the employer did not give stay absent, and anything inferred from a
// related answer is labelled "derived" in access_provenance.
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildSkillRequirements,
  categoryForDepartment,
  cleanJobTitle,
  computeAvailability,
  computeConfidence,
  normalizeEduLevel,
  normalizeExpLevel,
  normalizeSalary,
  normalizeWorkMode,
  parseDeadline,
  parseVacancies,
  tidyCase,
  toInterestArea,
  validateCanonicalJob,
  type AccessProvenance,
  type CanonicalJob,
  type EmployerInclusion,
} from "@/lib/canonical";
import { ACCESSIBILITY_AREAS } from "@/lib/taxonomy";
import { NEURO_FEATURES, PHYSICAL_FEATURES } from "@/lib/pathways";

export const INTAKE_SOURCE_SYSTEM = "accesshire_intake_form";
export const PORTAL_SOURCE_SYSTEM = "accesshire_portal";

export type IntakeRecord = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(str).filter(Boolean) : str(v) ? [str(v)] : [];
const yes = (v: unknown) => str(v).toLowerCase() === "yes";
const no = (v: unknown) => str(v).toLowerCase() === "no";

const physicalKeys = new Set(PHYSICAL_FEATURES.map((f) => f.key));
const neuroKeys = new Set(NEURO_FEATURES.map((f) => f.key));
const SUPPORT_VALUES = new Set(["Yes", "Partial", "No"]);

const keep = (obj: Record<string, string>, allowed: Set<string>) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => allowed.has(k)));

/** Legacy accessibility_params, derived from the pathway features. */
const legacyAreas = (
  physical: Record<string, string>,
  neuro: Record<string, string>,
): Record<string, string> => {
  const map: Record<string, string> = {};
  const set = (area: string, value?: string) => {
    if (value && !map[area]) map[area] = value;
  };
  set(ACCESSIBILITY_AREAS[0], physical.screen_reader ?? physical.magnification);
  set(ACCESSIBILITY_AREAS[1], physical.captions);
  set(ACCESSIBILITY_AREAS[2], physical.sign_language);
  set(ACCESSIBILITY_AREAS[3], neuro.flexible_breaks ?? neuro.predictable_schedule);
  set(ACCESSIBILITY_AREAS[4], neuro.low_distraction ?? neuro.sensory_friendly);
  set(ACCESSIBILITY_AREAS[5], neuro.processing_time);
  set(ACCESSIBILITY_AREAS[6], neuro.written_instructions ?? physical.text_first);
  set(ACCESSIBILITY_AREAS[7], physical.remote_hybrid ?? neuro.remote_hybrid);
  return map;
};

// ── Company name ────────────────────────────────────────────────────────────

const PUBLIC_MAIL = /^(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|icloud|me|aol|proton(mail)?|rediffmail|zoho)\./i;

/** The hostname of the employer's website, without "www." or tracking params. */
export function websiteHost(raw: unknown): string | null {
  const v = str(raw);
  if (!v) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return url.hostname.replace(/^www\./i, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * The employer's stated name, or — when they left it blank — their own website
 * or business email domain. Never a guessed brand name.
 */
export function resolveCompanyName(company: IntakeRecord): {
  name: string;
  source: "stated" | "derived";
} {
  const stated = str(company.companyName).replace(/\s{2,}/g, " ");
  if (stated) return { name: stated, source: "stated" };
  const host = websiteHost(company.companyWebsite);
  if (host) return { name: host, source: "derived" };
  const domain = str(company.contactEmail).split("@")[1]?.toLowerCase();
  if (domain && !PUBLIC_MAIL.test(domain)) return { name: domain, source: "derived" };
  return { name: "", source: "derived" };
}

// ── Accessibility ───────────────────────────────────────────────────────────

/**
 * Only employer-stated willingness/category fields become access features, and
 * every value carries its provenance:
 *   employer_confirmed → the employer answered this directly
 *   derived            → inferred from a related answer (work model, PwD quota)
 * Anything not covered stays absent, i.e. "not provided".
 */
function accessFromIntake(company: IntakeRecord, job: IntakeRecord) {
  const physical: Record<string, string> = {};
  const neuro: Record<string, string> = {};
  const provenance: AccessProvenance = {};

  const set = (
    target: Record<string, string>,
    key: string,
    value: string,
    basis: "employer_confirmed" | "derived",
    sourceFields: string[],
    sourceValue?: unknown,
  ) => {
    if (target[key] !== undefined) return;
    target[key] = value;
    provenance[key] ??= {
      value,
      basis,
      source_fields: sourceFields,
      source_value: sourceValue === undefined ? null : str(sourceValue) || null,
    };
  };

  // Roles posted on the portal carry explicit per-feature answers — those win.
  const explicit = (raw: unknown, target: Record<string, string>, allowed: Set<string>, field: string) => {
    if (!raw || typeof raw !== "object") return;
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const v = str(value);
      if (allowed.has(key) && SUPPORT_VALUES.has(v)) set(target, key, v, "employer_confirmed", [field], v);
    }
  };
  explicit(job.physicalAccess, physical, physicalKeys, "physicalAccess");
  explicit(job.neuroPractices, neuro, neuroKeys, "neuroPractices");

  const mode = normalizeWorkMode(company.workModel);
  const remote = mode === "On-site" ? "No" : "Yes";
  set(physical, "remote_hybrid", remote, "derived", ["workModel"], company.workModel);
  set(neuro, "remote_hybrid", remote, "derived", ["workModel"], company.workModel);

  const categories = list(company.pwdCategories).map((c) => c.toLowerCase());
  const cats = list(company.pwdCategories).join(", ");

  if (yes(company.willingBlind)) {
    set(physical, "screen_reader", "Yes", "employer_confirmed", ["willingBlind"], company.willingBlind);
    set(physical, "magnification", "Yes", "employer_confirmed", ["willingBlind"], company.willingBlind);
    set(physical, "assistive_tech", "Partial", "derived", ["willingBlind"], company.willingBlind);
  } else if (no(company.willingBlind)) {
    set(physical, "screen_reader", "No", "employer_confirmed", ["willingBlind"], company.willingBlind);
    set(physical, "magnification", "No", "employer_confirmed", ["willingBlind"], company.willingBlind);
  }

  if (categories.some((c) => c.includes("visual"))) {
    set(physical, "screen_reader", "Partial", "derived", ["pwdCategories"], cats);
    set(physical, "magnification", "Partial", "derived", ["pwdCategories"], cats);
  }
  if (categories.some((c) => c.includes("hearing"))) {
    set(physical, "captions", "Partial", "derived", ["pwdCategories"], cats);
    set(physical, "sign_language", "Partial", "derived", ["pwdCategories"], cats);
    set(physical, "text_first", "Partial", "derived", ["pwdCategories"], cats);
  }
  if (categories.some((c) => c.includes("locomotor") || c.includes("physical"))) {
    set(physical, "step_free", "Partial", "derived", ["pwdCategories"], cats);
    set(physical, "accessible_facilities", "Partial", "derived", ["pwdCategories"], cats);
    set(physical, "seated_adjustable", "Partial", "derived", ["pwdCategories"], cats);
  }
  if (yes(company.pwdQuota) || yes(company.hiresPWD)) {
    const fields = [yes(company.pwdQuota) ? "pwdQuota" : "hiresPWD"];
    set(physical, "ergonomic_equipment", "Partial", "derived", fields, "Yes");
    set(physical, "assistive_tech", "Partial", "derived", fields, "Yes");
  }

  // Older submissions asked one combined question (willingNeurodiverseBlind).
  const neuroWilling = yes(company.willingNeurodivergent) || yes(company.willingNeurodiverseBlind);
  const neuroField = yes(company.willingNeurodivergent)
    ? "willingNeurodivergent"
    : "willingNeurodiverseBlind";
  const neuroDeclined =
    no(company.willingNeurodivergent) &&
    (no(company.willingNeurodiverseBlind) || !str(company.willingNeurodiverseBlind));
  if (neuroWilling) {
    for (const key of [
      "written_instructions",
      "clear_expectations",
      "predictable_schedule",
      "flexible_breaks",
      "interview_accommodations",
    ]) {
      set(neuro, key, "Partial", "employer_confirmed", [neuroField], "Yes");
    }
  } else if (categories.some((c) => c.includes("neurodivergent") || c.includes("intellectual"))) {
    for (const key of ["written_instructions", "clear_expectations", "predictable_schedule"]) {
      set(neuro, key, "Partial", "derived", ["pwdCategories"], cats);
    }
  } else if (neuroDeclined) {
    set(neuro, "written_instructions", "No", "employer_confirmed", ["willingNeurodivergent"], "No");
    set(neuro, "clear_expectations", "No", "employer_confirmed", ["willingNeurodivergent"], "No");
  }

  const allowed = new Set([...physicalKeys, ...neuroKeys]);
  return {
    physical: keep(physical, physicalKeys),
    neuro: keep(neuro, neuroKeys),
    provenance: Object.fromEntries(
      Object.entries(provenance).filter(([k]) => allowed.has(k)),
    ) as AccessProvenance,
  };
}

const answer = (v: unknown) => str(v) || null;

function inclusionFromIntake(company: IntakeRecord): EmployerInclusion {
  return {
    pwd_categories: list(company.pwdCategories),
    hires_pwd: answer(company.hiresPWD),
    willing_blind: answer(company.willingBlind),
    // The older combined question counts as the neurodivergent answer when that's all we have.
    willing_neurodivergent:
      answer(company.willingNeurodivergent) ?? answer(company.willingNeurodiverseBlind),
    pwd_quota: answer(company.pwdQuota),
    pwd_csr: answer(company.pwdCSR),
    pledge_accepted: company.pledgeAccepted === true,
  };
}

/** Firestore Timestamp | ISO string | Date → ISO string. */
function toIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  const ts = v as { toDate?: () => Date; seconds?: number };
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000).toISOString();
  return null;
}

// ── Mapping ─────────────────────────────────────────────────────────────────

/** Maps one job entry of one company document onto the canonical job shape. */
export function mapIntakeJob(
  companyId: string,
  company: IntakeRecord,
  job: IntakeRecord,
  index: number,
  today?: string,
): CanonicalJob {
  const sourceSystem =
    str(company.source) === PORTAL_SOURCE_SYSTEM ? PORTAL_SOURCE_SYSTEM : INTAKE_SOURCE_SYSTEM;
  const exp_level = normalizeExpLevel(str(job.experienceLevel) || str(job.requiredExperience));

  // Employers sometimes type punctuation only ("· /") or several roles into one
  // title field. Clean the primary title; keep extra roles as interest signals.
  const { title, additional } = cleanJobTitle(job.jobTitle);
  const department = tidyCase(str(job.department)) || null;

  const roleInterests = [
    toInterestArea(department),
    toInterestArea(title),
    ...additional.map(toInterestArea),
  ].filter((x): x is string => Boolean(x));
  const interests = [
    ...new Set(
      [
        ...roleInterests,
        ...list(company.rolesOffered).map(toInterestArea),
        toInterestArea(list(company.industries)[0]),
      ].filter((x): x is string => Boolean(x)),
    ),
  ];
  // Requirements come from the role family the job itself declares first.
  const { required, preferred } = buildSkillRequirements(
    roleInterests.length ? [...new Set(roleInterests)] : interests,
    exp_level,
  );

  const access = accessFromIntake(company, job);
  const mode = normalizeWorkMode(company.workModel);
  const cities = list(company.hiringCities);

  const work_style: Record<string, string> = { work_mode: mode };
  if (str(job.workingHours)) work_style.schedule_type = "Fixed";

  // Older submissions have no jobCategory; the department often pins it down.
  const statedCategory = str(job.jobCategory);
  const derivedCategory = statedCategory ? null : categoryForDepartment(job.department);

  const { name: company_name, source: company_name_source } = resolveCompanyName(company);
  const jobTitle = title ? [title, ...additional].join(" / ") : "";
  const application_deadline = parseDeadline(job.applicationDeadline);
  const vacancies = parseVacancies(job.vacancies);
  const availability_status = computeAvailability(application_deadline, vacancies, today);
  const website = str(company.companyWebsite);

  const fields = {
    id: `${companyId}#${index}`,
    company_id: companyId,
    company_name,
    company_name_source,
    company_website: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null,
    job_title: jobTitle,
    location: cities.join(", ") || str(company.hqAddress),
    cities,
    work_mode: mode,
    employment_type: str(job.employmentType) || null,
    salary_range: normalizeSalary(job.salaryMin, job.salaryMax),
    exp_level,
    edu_level: normalizeEduLevel(job.education),
    sector: list(company.industries)[0] ?? "General",
    description: str(job.jobDescription) || null,
    apply_contact: str(company.contactEmail) || null,
    vacancies,
    application_deadline,
    working_hours: str(job.workingHours) || null,
    apply_method: str(job.applicationMethod) || null,
    job_category: statedCategory || derivedCategory,
    job_category_source: statedCategory ? "stated" : derivedCategory ? "derived" : null,
    department,
    availability_status,
    required_skills: required,
    preferred_skills: preferred,
    interest_areas: interests,
    physical_access: access.physical,
    neuro_practices: access.neuro,
    access_provenance: access.provenance,
    inclusion: inclusionFromIntake(company),
    skill_requirements: required,
    work_style,
    accessibility_params: legacyAreas(access.physical, access.neuro),
    source_system: sourceSystem,
    source_record_id: `${companyId}#${index}`,
    source_created_at: toIso(company.createdAt),
  } satisfies Omit<CanonicalJob, "data_confidence" | "validation_status" | "validation_errors">;

  const canonical: CanonicalJob = {
    ...fields,
    data_confidence: computeConfidence({ ...fields, edu_level_stated: Boolean(str(job.education)) }),
    validation_status: "valid",
    validation_errors: [],
  };
  const outcome = validateCanonicalJob(canonical);
  canonical.validation_status = outcome.status;
  canonical.validation_errors = outcome.errors;
  return canonical;
}

export interface RejectedRecord {
  source_record_id: string;
  company: string;
  errors: string[];
}

export interface IntakeMappingResult {
  jobs: CanonicalJob[];
  rejected: RejectedRecord[];
}

/** Maps every job of every company document; invalid rows are reported, not guessed. */
export function mapCompanies(
  docs: { id: string; data: IntakeRecord }[],
  today?: string,
): IntakeMappingResult {
  const jobs: CanonicalJob[] = [];
  const rejected: RejectedRecord[] = [];
  for (const { id, data } of docs) {
    const entries = Array.isArray(data.jobs) ? (data.jobs as IntakeRecord[]) : [];
    entries.forEach((entry, index) => {
      const job = mapIntakeJob(id, data, entry ?? {}, index, today);
      if (job.validation_status === "invalid") {
        rejected.push({
          source_record_id: job.source_record_id,
          company: job.company_name,
          errors: job.validation_errors,
        });
      } else {
        jobs.push(job);
      }
    });
  }
  return { jobs, rejected };
}
