// Stores the accessibility pathway(s) a candidate opted into and the workplace
// needs they selected. Nothing here is a diagnosis, and none of it is ever used
// to lower a candidate's skills score or hide jobs from them.

import { PATHWAY_NEURO, PATHWAY_PHYSICAL, type Pathway } from "@/lib/pathways";
import { getOwnCandidateProfile, saveAccessProfile } from "@/lib/candidateProfile";

const KEY = "accesshire.access_needs";

export interface AccessNeeds {
  /** Empty array = "prefer not to say / skipped". */
  pathways: Pathway[];
  physical: string[];
  neuro: string[];
  /** Optional self-described disability categories. */
  categories: string[];
  /** Kinds of work that suit the candidate physically. */
  workTypes: string[];
  skipped: boolean;
  completed: boolean;
}

export const emptyAccessNeeds: AccessNeeds = {
  pathways: [],
  physical: [],
  neuro: [],
  categories: [],
  workTypes: [],
  skipped: false,
  completed: false,
};

export const hasPhysical = (n: AccessNeeds) => n.pathways.includes(PATHWAY_PHYSICAL);
export const hasNeuro = (n: AccessNeeds) => n.pathways.includes(PATHWAY_NEURO);

const onlyPathways = (list: unknown): Pathway[] =>
  (Array.isArray(list) ? list : []).filter(
    (p): p is Pathway => p === PATHWAY_PHYSICAL || p === PATHWAY_NEURO,
  );

export function readLocalAccessNeeds(): AccessNeeds {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyAccessNeeds;
    const parsed = JSON.parse(raw) as Partial<AccessNeeds>;
    return {
      pathways: onlyPathways(parsed.pathways),
      physical: parsed.physical ?? [],
      neuro: parsed.neuro ?? [],
      categories: parsed.categories ?? [],
      workTypes: parsed.workTypes ?? [],
      skipped: Boolean(parsed.skipped),
      completed: Boolean(parsed.completed),
    };
  } catch {
    return emptyAccessNeeds;
  }
}

export function writeLocalAccessNeeds(needs: AccessNeeds) {
  try {
    localStorage.setItem(KEY, JSON.stringify(needs));
  } catch {
    /* storage unavailable — the in-memory selection still works */
  }
}

/** Persists the selection onto the candidate profile (Firestore when signed in). */
export async function saveAccessNeeds(
  userId: string | null,
  fallbackName: string,
  needs: AccessNeeds,
) {
  return saveAccessProfile({
    userId,
    name: fallbackName,
    pathways: needs.pathways,
    physical: needs.physical,
    neuro: needs.neuro,
    categories: needs.categories,
    workTypes: needs.workTypes,
  });
}

export async function loadAccessNeeds(userId: string): Promise<AccessNeeds | null> {
  const profile = await getOwnCandidateProfile(userId);
  if (!profile || (!profile.pathways?.length && !profile.access_profile?.physical?.length && !profile.access_profile?.neuro?.length)) {
    return null;
  }
  const pathways = onlyPathways(profile.pathways);
  return {
    pathways,
    physical: profile.access_profile?.physical ?? [],
    neuro: profile.access_profile?.neuro ?? [],
    categories: profile.access_profile?.categories ?? [],
    workTypes: profile.access_profile?.work_types ?? [],
    skipped: pathways.length === 0,
    completed: true,
  };
}
