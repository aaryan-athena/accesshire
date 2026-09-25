// Client entry points for the matching engine. Jobs come live from Firestore
// (lib/jobs.ts); the engine (lib/matcher.ts) runs in the browser, so a finished
// assessment is scored against every real role immediately — no server round trip.

import { fetchJobFeed } from "@/lib/jobs";
import { resolveCandidate } from "@/lib/candidateProfile";
import { matchAll, scorePair } from "@/lib/matcher";
import type { CandidateProfile, JobListing, MatchResult, Recommendation } from "@/lib/matcher";

export type {
  AccessibilityBreakdown,
  CandidateProfile,
  EmployerOpenness,
  JobListing,
  MatchResult,
  OpennessStatus,
  Recommendation,
  SkillBreakdown,
  SkillRequirement,
  StyleBreakdown,
  WorkTypeFit,
} from "@/lib/matcher";

export interface MatrixResponse {
  jobs: JobListing[];
  candidates: CandidateProfile[];
  results: MatchResult[];
}

export interface CandidateResponse {
  jobs: JobListing[];
  candidate: CandidateProfile;
  results: MatchResult[];
}

/**
 * Every live job, scored for the viewer only: the signed-in user's saved
 * profile, or the profile this device holds. Nobody else's profile is loaded.
 */
export async function runMatchMatrix(opts: {
  userId?: string | null;
  jobs?: JobListing[];
} = {}): Promise<MatrixResponse> {
  const [jobs, candidate] = await Promise.all([
    opts.jobs ? Promise.resolve(opts.jobs) : fetchJobFeed().then((f) => f.jobs),
    resolveCandidate(opts.userId),
  ]);
  const candidates = candidate ? [candidate] : [];
  return { jobs, candidates, results: matchAll(jobs, candidates) };
}

/** Scores one candidate — the viewer's saved profile, or an unsaved profile passed inline. */
export async function runCandidateMatch(opts: {
  userId?: string | null;
  candidate?: CandidateProfile;
  jobs?: JobListing[];
}): Promise<CandidateResponse> {
  const jobs = opts.jobs ?? (await fetchJobFeed()).jobs;
  const candidate = opts.candidate ?? (await resolveCandidate(opts.userId));
  if (!candidate) throw new Error("No candidate profile yet — take an assessment first.");
  const results = jobs
    .map((job) => scorePair(job, candidate))
    .sort(
      (a, b) =>
        Number(b.is_recommendable) - Number(a.is_recommendable) || b.match_score - a.match_score,
    );
  return { jobs, candidate, results };
}

export const recommendationStyles: Record<Recommendation, string> = {
  "Strong Match": "bg-success/10 text-success",
  "Good Match": "bg-primary/10 text-primary",
  "Partial Match": "bg-warning/15 text-warning",
  "Not Suitable": "bg-muted text-muted-foreground",
};

export const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

/**
 * Lowest salary figure in the employer's own wording, as a number, for sorting.
 * Handles Indian grouping ("4,00,000"), "5 LPA", "₹25k" and "$48k".
 */
export const salaryFloor = (range: string | null | undefined) => {
  if (!range) return 0;
  const m = range.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k|l|lpa|lakh|lac|cr)?/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = (m[2] ?? "").toLowerCase();
  if (unit === "k") return n * 1_000;
  if (unit === "l" || unit === "lpa" || unit === "lakh" || unit === "lac") return n * 100_000;
  if (unit === "cr") return n * 10_000_000;
  return n;
};

export const recommendationOrder: Recommendation[] = [
  "Strong Match",
  "Good Match",
  "Partial Match",
  "Not Suitable",
];
