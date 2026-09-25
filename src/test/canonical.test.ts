import { describe, expect, it } from "vitest";
import * as fe from "@/lib/canonical";
import {
  TRACKS,
  TRACK_LIST,
  questionsFor,
  scoreAssessment,
  type AssessmentAnswers,
  type TrackId,
} from "@/lib/assessments";
import { PATHWAY_NEURO, PATHWAY_PHYSICAL } from "@/lib/pathways";

const bestAnswers = (trackId: TrackId): AssessmentAnswers => {
  const answers: AssessmentAnswers = {};
  for (const q of TRACKS[trackId].coreQuestions) {
    const best = q.options.reduce(
      (bi, o, i) => ((o.credit ?? 0) > (q.options[bi].credit ?? 0) ? i : bi),
      0,
    );
    answers[q.id] = q.multi ? [0] : best;
  }
  return answers;
};

/** Picks the first option of every module question — i.e. declares needs. */
const moduleAnswers = (trackId: TrackId): AssessmentAnswers =>
  Object.fromEntries(TRACKS[trackId].moduleQuestions.map((q) => [q.id, q.multi ? [0, 1] : 0]));

describe("assessment content", () => {
  it("interest options only use canonical interest areas", () => {
    const used = new Set<string>();
    for (const track of TRACK_LIST) {
      for (const q of questionsFor(track.id)) {
        for (const opt of q.options) opt.interests?.forEach((i) => used.add(i));
      }
    }
    expect(used.size).toBeGreaterThan(0);
    for (const area of used) expect(fe.INTEREST_AREAS as readonly string[]).toContain(area);
  });

  it("both categories share the identical skills core", () => {
    expect(TRACKS.neurodivergent.coreQuestions).toBe(TRACKS["physical-sensory"].coreQuestions);
  });

  it("question ids are unique within each assessment", () => {
    for (const track of TRACK_LIST) {
      const ids = questionsFor(track.id).map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("module questions never carry skill credit", () => {
    for (const track of TRACK_LIST) {
      for (const q of track.moduleQuestions) {
        for (const opt of q.options) expect(opt.credit).toBeUndefined();
      }
    }
  });
});

describe("assessment separation of concerns", () => {
  it.each(["neurodivergent", "physical-sensory"] as const)(
    "%s module on its own never produces skill scores",
    (trackId) => {
      const outcome = scoreAssessment(trackId, moduleAnswers(trackId), "module");
      expect(outcome.derived).toBeNull();
      expect(outcome.overall).toBeNull();
      expect(Object.keys(outcome.strengths)).toHaveLength(0);
      expect(outcome.accessProfile).not.toBeNull();
    },
  );

  it.each(["neurodivergent", "physical-sensory"] as const)(
    "%s: declaring access needs never changes the capability score",
    (trackId) => {
      const base = bestAnswers(trackId);
      const withoutNeeds = scoreAssessment(trackId, base);
      const withNeeds = scoreAssessment(trackId, { ...base, ...moduleAnswers(trackId) });
      expect(withNeeds.overall).toEqual(withoutNeeds.overall);
      expect(withNeeds.derived?.skills_profile).toEqual(withoutNeeds.derived?.skills_profile);
      expect(withNeeds.needs.length).toBeGreaterThan(0);
    },
  );

  it("each track keeps only its own pathway's needs", () => {
    const neuro = scoreAssessment("neurodivergent", moduleAnswers("neurodivergent"), "module");
    expect(neuro.pathways).toEqual([PATHWAY_NEURO]);
    expect(neuro.accessProfile.physical).toEqual([]);
    expect(neuro.accessProfile.neuro.length).toBeGreaterThan(0);

    const physical = scoreAssessment("physical-sensory", moduleAnswers("physical-sensory"), "module");
    expect(physical.pathways).toEqual([PATHWAY_PHYSICAL]);
    expect(physical.accessProfile.neuro).toEqual([]);
    expect(physical.accessProfile.physical.length).toBeGreaterThan(0);
  });

  it("captures optional categories and work types", () => {
    const physical = scoreAssessment("physical-sensory", { ps1: [1], ps8: [0, 1] }, "module");
    expect(physical.categories).toEqual(["visual"]);
    expect(physical.workTypes).toEqual(["White Collar (Desk Jobs)", "Grey Collar (Support & Field Staff)"]);

    const skipped = scoreAssessment("neurodivergent", { nd1: [4] }, "module");
    expect(skipped.categories).toEqual([]);
  });

  it("scores objective answers honestly", () => {
    const worst: AssessmentAnswers = {};
    TRACKS.neurodivergent.coreQuestions.forEach((q) => {
      const wi = q.options.reduce(
        (bi, o, i) => ((o.credit ?? 0) < (q.options[bi].credit ?? 0) ? i : bi),
        0,
      );
      worst[q.id] = q.multi ? [] : wi;
    });
    const low = scoreAssessment("neurodivergent", worst);
    expect(low.overall).toBeLessThan(70);
    expect(low.overall).toBeGreaterThanOrEqual(45);
  });
});
