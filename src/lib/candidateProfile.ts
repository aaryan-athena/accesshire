// A candidate's profile lives in Firestore at candidate_profiles/{uid}. A copy is
// also kept on the device so signed-out visitors still get personal matches
// straight after an assessment.
//
// Capability fields (skills, interests, experience, education) and access fields
// (pathways, needs, categories) are written by separate functions so access
// answers can never touch the capability score.

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTIONS, db } from "@/integrations/firebase/client";
import type { DerivedProfile } from "@/lib/assessmentProfile";
import type { CandidateAccessProfile, CandidateProfile } from "@/lib/matcher";

const LOCAL_KEY = "accesshire.candidate_profile";
export const LOCAL_CANDIDATE_ID = "local";

/** Firestore rejects `undefined`; drop those keys (deeply). */
function compact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(compact) as T;
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, compact(v)]),
    ) as T;
  }
  return value;
}

const candidateRef = (userId: string) => doc(db, COLLECTIONS.candidateProfiles, userId);

export const emptyCandidate = (id: string, name: string): CandidateProfile => ({
  id,
  name,
  skills_assessed: false,
  exp_level: "Junior",
  edu_needed: "Diploma",
  skills_profile: {},
  work_style_pref: {},
  accessibility_needs: [],
  interests: [],
  pathways: [],
  access_profile: { physical: [], neuro: [], categories: [], work_types: [] },
});

function fromDoc(id: string, data: Record<string, unknown>): CandidateProfile {
  const base = emptyCandidate(id, String(data.name ?? "You"));
  return {
    ...base,
    ...(data as Partial<CandidateProfile>),
    id,
    user_id: id,
    skills_assessed: Boolean(data.skills_assessment_at) || data.skills_assessed === true,
    access_profile: { ...base.access_profile, ...((data.access_profile as CandidateAccessProfile) ?? {}) },
  };
}

// ── Device copy ─────────────────────────────────────────────────────────────

export function readLocalCandidate(): CandidateProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return fromDoc(LOCAL_CANDIDATE_ID, JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalCandidate(patch: Partial<CandidateProfile>) {
  try {
    const current = readLocalCandidate() ?? emptyCandidate(LOCAL_CANDIDATE_ID, "You");
    const next = {
      ...current,
      ...patch,
      access_profile: { ...current.access_profile, ...(patch.access_profile ?? {}) },
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the in-memory result still works */
  }
}

// ── Capability (skills & interests) ─────────────────────────────────────────

export interface SaveCareerArgs {
  userId: string | null;
  name: string;
  derived: DerivedProfile;
  /** Interest areas from the skills & interests section. */
  interests?: string[];
  /** Assessment track id and version, recorded for audit. */
  track: string;
  version?: string;
}

/** Saves capability evidence only — skills, interests, experience, education. */
export async function saveCandidateProfile({
  userId,
  name,
  derived,
  interests,
  track,
  version,
}: SaveCareerArgs) {
  const payload = {
    name: name || "You",
    exp_level: derived.exp_level,
    edu_needed: derived.edu_needed,
    skills_profile: derived.skills_profile,
    work_style_pref: derived.work_style_pref,
    accessibility_needs: derived.accessibility_needs,
    skills_assessed: true,
    ...(interests ? { interests } : {}),
  };
  writeLocalCandidate(payload);
  if (!userId) return LOCAL_CANDIDATE_ID;

  await setDoc(
    candidateRef(userId),
    compact({
      ...payload,
      user_id: userId,
      source: "assessment",
      skills_assessment_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      assessment_versions: version ? { [track]: version } : undefined,
    }),
    { merge: true },
  );
  await setDoc(
    doc(db, COLLECTIONS.users, userId),
    { assessment_completed_at: serverTimestamp() },
    { merge: true },
  );
  return userId;
}

// ── Access & work-style ─────────────────────────────────────────────────────

export interface SaveAccessArgs {
  userId: string | null;
  name: string;
  pathways: string[];
  physical: string[];
  neuro: string[];
  categories?: string[];
  workTypes?: string[];
  workStyle?: Record<string, string>;
  assistiveTech?: string[];
  commPrefs?: Record<string, string>;
  track?: string;
  version?: string;
}

/** Saves the accessibility & work-style profile. Never touches skill fields. */
export async function saveAccessProfile({
  userId,
  name,
  pathways,
  physical,
  neuro,
  categories,
  workTypes,
  workStyle,
  assistiveTech,
  commPrefs,
  track,
  version,
}: SaveAccessArgs) {
  const current = userId ? await getOwnCandidateProfile(userId) : readLocalCandidate();
  const access_profile: CandidateAccessProfile = compact({
    physical,
    neuro,
    categories,
    work_types: workTypes,
  });
  const patch: Partial<CandidateProfile> = {
    name: current?.name || name || "You",
    pathways,
    access_profile,
    ...(workStyle && Object.keys(workStyle).length
      ? { work_style_pref: { ...(current?.work_style_pref ?? {}), ...workStyle } }
      : {}),
    ...(assistiveTech ? { assistive_tech: assistiveTech } : {}),
    ...(commPrefs && Object.keys(commPrefs).length ? { comm_prefs: commPrefs } : {}),
  };
  writeLocalCandidate(patch);
  if (!userId) return LOCAL_CANDIDATE_ID;

  await setDoc(
    candidateRef(userId),
    compact({
      ...patch,
      user_id: userId,
      access_assessment_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      assessment_versions: track && version ? { [track]: version } : undefined,
    }),
    { merge: true },
  );
  return userId;
}

export async function getOwnCandidateProfile(userId: string): Promise<CandidateProfile | null> {
  const snap = await getDoc(candidateRef(userId));
  return snap.exists() ? fromDoc(userId, snap.data()) : null;
}

/**
 * The profile to match with: the signed-in user's saved profile, else what this
 * device holds from an assessment taken while signed out.
 */
export async function resolveCandidate(userId: string | null | undefined): Promise<CandidateProfile | null> {
  if (userId) {
    try {
      const own = await getOwnCandidateProfile(userId);
      if (own) return own;
    } catch {
      /* offline or rules not deployed — fall back to the device copy */
    }
  }
  return readLocalCandidate();
}
