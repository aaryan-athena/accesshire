import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import MatchScoreRing from "@/components/MatchScoreRing";
import MatchDetailDialog from "@/components/MatchDetailDialog";
import {
  runMatchMatrix,
  recommendationStyles,
  pct,
  type CandidateProfile,
  type JobListing,
  type MatchResult,
} from "@/lib/matching";
import { useAuth } from "@/contexts/AuthContext";
import { useJobFeed } from "@/lib/jobs";
import { isRecommendable } from "@/lib/canonical";
import { AlertTriangle, Users } from "lucide-react";

const EmployerShortlist = () => {
  const { user } = useAuth();
  const feed = useJobFeed();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [activeJob, setActiveJob] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MatchResult | null>(null);

  useEffect(() => {
    if (feed.error) {
      setError(feed.error instanceof Error ? feed.error.message : "Could not load the talent pipeline.");
      setLoading(false);
    }
    if (!feed.data) return;
    // Open roles first; candidate profiles are private, so only the viewer's own is scored.
    const live = [...feed.data.jobs].sort(
      (a, b) => Number(isRecommendable(b.availability_status)) - Number(isRecommendable(a.availability_status)),
    );
    runMatchMatrix({ userId: user?.id, jobs: live })
      .then((data) => {
        setJobs(data.jobs ?? []);
        setCandidates(data.candidates ?? []);
        setResults(data.results ?? []);
        setActiveJob((prev) => prev || data.jobs?.[0]?.id || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the talent pipeline."))
      .finally(() => setLoading(false));
  }, [feed.data, feed.error, user?.id]);

  const job = jobs.find((j) => j.id === activeJob);
  const candidateById = useMemo(
    () => Object.fromEntries(candidates.map((c) => [c.id, c])),
    [candidates],
  );

  const shortlist = useMemo(
    () =>
      results
        .filter((r) => r.job_id === activeJob)
        .sort((a, b) => b.match_score - a.match_score),
    [results, activeJob],
  );

  return (
    <section className="border-b border-border bg-surface py-20">
      <div className="container">
        <div className="max-w-2xl">
          <span className="pill bg-primary/10 text-primary">
            <Users className="h-3.5 w-3.5" /> Live talent pipeline
          </span>
          <h2 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
            See a ranked shortlist for any open role
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pick one of the roles currently on the platform. The matching engine scores candidates
            on skills, interests and experience, and separately shows how well your workplace fits
            their access needs — so you review people by fit, not by CV formatting. Candidate
            profiles stay private until a candidate applies; signed in, you'll see how your own
            profile scores.
          </p>
        </div>

        {error && (
          <p className="mt-8 flex items-center gap-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
        )}

        {loading ? (
          <div className="mt-8 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Role picker */}
            <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
              {jobs.map((j) => (
                <button
                  key={j.id}
                  onClick={() => setActiveJob(j.id)}
                  aria-pressed={activeJob === j.id}
                  className={`w-full rounded-2xl p-4 text-left shadow-soft transition-all ${
                    activeJob === j.id ? "bg-primary text-primary-foreground shadow-glow" : "bg-card hover:shadow-md"
                  }`}
                >
                  <span className="block text-sm font-bold">{j.job_title}</span>
                  <span
                    className={`block text-xs ${
                      activeJob === j.id ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {j.company_name || "Employer name not provided"} · {j.work_mode ?? j.location}
                  </span>
                </button>
              ))}
            </div>

            {/* Shortlist */}
            <div className="surface-card p-6">
              {job && (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
                  <div>
                    <h3 className="text-lg font-bold">{job.job_title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {job.company_name} · {job.exp_level} · {job.edu_level} ·{" "}
                      {job.salary_range ?? "Salary on request"}
                    </p>
                  </div>
                  <span className="pill bg-secondary text-xs">
                    {shortlist.length} candidate{shortlist.length === 1 ? "" : "s"} scored
                  </span>
                </div>
              )}

              {shortlist.length === 0 && (
                <p className="rounded-2xl bg-surface p-4 text-sm text-muted-foreground">
                  No candidate profiles to show for this role yet. Take an assessment to see how a
                  profile is scored against it.
                </p>
              )}
              <ul className="space-y-3">
                {shortlist.slice(0, 8).map((r, i) => {
                  const cand = candidateById[r.candidate_id];
                  return (
                    <li key={r.candidate_id}>
                      <button
                        onClick={() => setDetail(r)}
                        className="flex w-full items-center gap-4 rounded-2xl bg-surface p-4 text-left transition-colors hover:bg-secondary/60"
                      >
                        <span className="w-5 shrink-0 text-sm font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <MatchScoreRing value={r.match_score} size={48} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{r.candidate}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {cand?.exp_level} · Skills {pct(r.skills_score)} · Accessibility{" "}
                            {pct(r.accessibility_score)}
                          </span>
                          {!!r.top_strengths.length && (
                            <span className="mt-1 block truncate text-[11px] text-success">
                              Strengths: {r.top_strengths.slice(0, 3).join(", ")}
                            </span>
                          )}
                        </span>
                        <span className={`pill shrink-0 ${recommendationStyles[r.recommendation]}`}>
                          {r.recommendation}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      <MatchDetailDialog
        result={detail}
        job={job}
        open={Boolean(detail)}
        onOpenChange={(v) => !v && setDetail(null)}
      />
    </section>
  );
};

export default EmployerShortlist;
