import { describe, expect, it } from "vitest";
import * as tx from "@/lib/taxonomy";
import { INTEREST_AREAS, ROLE_SKILL_PROFILES, WORK_MODES } from "@/lib/canonical";
import { DISABILITY_CATEGORIES, NEURO_FEATURES, PHYSICAL_FEATURES, WORK_TYPES } from "@/lib/pathways";
import { EMPLOYER_PWD_CATEGORIES, JOB_CATEGORY_NAMES } from "@/lib/canonical";

describe("taxonomy is internally consistent", () => {
  it("every style key has a label and an ordered scale", () => {
    for (const key of tx.STYLE_KEYS) {
      expect(tx.STYLE_LABELS[key]).toBeTruthy();
      expect(tx.STYLE_SCALES[key]?.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("work-mode scale matches the canonical work modes", () => {
    expect(tx.STYLE_SCALES.work_mode).toEqual([...WORK_MODES]);
  });

  it("every interest area has a role skill profile over known skill axes", () => {
    for (const area of INTEREST_AREAS) {
      const profile = ROLE_SKILL_PROFILES[area];
      expect(profile, area).toBeTruthy();
      for (const axis of [...profile.required, ...profile.preferred]) {
        expect(tx.SKILL_AXES as readonly string[]).toContain(axis);
      }
    }
  });

  it("access feature keys are unique within each pathway", () => {
    for (const list of [PHYSICAL_FEATURES, NEURO_FEATURES]) {
      const keys = list.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("candidate categories map onto the intake form's disability categories", () => {
    for (const c of DISABILITY_CATEGORIES) {
      expect(EMPLOYER_PWD_CATEGORIES as readonly string[]).toContain(c.employerCategory);
    }
  });

  it("work types are exactly the intake form's job categories", () => {
    expect(WORK_TYPES.map((w) => w.key).sort()).toEqual([...JOB_CATEGORY_NAMES].sort());
  });
});
