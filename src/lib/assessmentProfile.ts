// The canonical capability profile the matching engine consumes.
// Produced only by the Career Skills & Interests assessment (src/lib/assessments.ts).
// Access needs are stored separately and never appear here.

import { SKILL_AXES, type EduLevel, type ExpLevel, type SkillAxis } from "@/lib/taxonomy";

export { SKILL_AXES };
export type { SkillAxis };

export interface DerivedProfile {
  /** Canonical skill axis → Beginner | Intermediate | Advanced */
  skills_profile: Record<string, string>;
  /** Canonical work-style keys → canonical values */
  work_style_pref: Record<string, string>;
  /** Canonical accessibility areas (support-side language, never a diagnosis) */
  accessibility_needs: string[];
  exp_level: ExpLevel;
  edu_needed: EduLevel;
  /** 0–100 confidence per canonical skill axis, for display only */
  skill_confidence: Record<string, number>;
}
