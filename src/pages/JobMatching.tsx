import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MatchScoreRing from "@/components/MatchScoreRing";
import MatchDetailDialog from "@/components/MatchDetailDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  runMatchMatrix,
  pct,
  salaryFloor,
  type CandidateProfile,
  type JobListing,
  type MatchResult,
  type OpennessStatus,
} from "@/lib/matching";
import { useJobFeed } from "@/lib/jobs";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/userData";
import { toast } from "@/hooks/use-toast";
import {
  NEURO_FEATURES,
  PATHWAY_NEURO,
  PATHWAY_PHYSICAL,
  PHYSICAL_FEATURES,
  WORK_TYPES,
  type AccessStatus,
} from "@/lib/pathways";
import { SKILL_AXES } from "@/lib/taxonomy";
import {
  AVAILABILITY_STYLES,
  CONFIDENCE_STYLES,
  JOB_CATEGORY_SHORT,
  WORK_MODES,
  availabilityOf,
  deadlineLabel,
  isRecommendable,
} from "@/lib/canonical";
import { readLocalAccessNeeds } from "@/lib/accessNeeds";
import {
  Accessibility, AlertTriangle, Brain, Briefcase, Building2, CalendarClock, Check, GraduationCap,
  Hammer, Heart, HeartHandshake, Info, MapPin, RefreshCw, Search, ShieldCheck, Sparkles,
  TrendingUp, Users,
} from "lucide-react";

const OPENNESS_STYLES: Record<OpennessStatus, string> = {
  "Open to your category": "bg-success/10 text-success",
  "Possibly open": "bg-primary/10 text-primary",
  "Your category not listed": "bg-secondary text-muted-foreground",
  "Not currently open": "bg-warning/15 text-warning",
  "Not stated": "bg-muted text-muted-foreground",
};

const ACCESS_STATUS_STYLES: Record<AccessStatus, string> = {
  "Strong access match": "bg-success/10 text-success",
  "Partial access match — accommodation may be needed": "bg-warning/15 text-warning",
  "Access information unavailable": "bg-muted text-muted-foreground",
};

const accessStatusOf = (r: MatchResult): AccessStatus =>
  r.access_status ?? "Access information unavailable";

const sortOptions = [
  { key: "score", label: "Best overall match" },
  { key: "skills", label: "Skills & interests" },
  { key: "physical", label: "Physical & sensory access" },
  { key: "neuro", label: "Neurodivergent work-style" },
  { key: "salary", label: "Salary" },
] as const;

/** A support counts as available for filtering when it's offered at all. */
const offers = (map: Record<string, string> | null | undefined, key: string) => {
  const v = map?.[key];
  return v === "Yes" || v === "Partial";
};

const FilterGroup = ({
  title,
  icon: Icon,
  defaultOpen,
  count,
  children,
}: {
  title: string;
  icon: typeof Accessibility;
  defaultOpen?: boolean;
  count: number;
  children: React.ReactNode;
}) => (
  <details open={defaultOpen} className="surface-card overflow-hidden">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </span>
      {count > 0 && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
          {count}
        </span>
      )}
    </summary>
    <div className="border-t border-border/60 p-4 pt-3">{children}</div>
  </details>
);

const CheckPill = ({
  label,
  active,
  onClick,
}: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={active}
    onClick={onClick}
    className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
      active
        ? "bg-primary text-primary-foreground shadow-glow"
        : "bg-surface text-muted-foreground hover:text-foreground"
    }`}
  >
    {active && <Check className="h-3 w-3" aria-hidden="true" />}
    {label}
  </button>
);

const ScoreBar = ({
  label,
  value,
  tone = "primary",
}: { label: string; value: number | null | undefined; tone?: "primary" | "muted" }) => (
  <div className="flex items-center gap-3">
    <dt className="w-40 shrink-0 text-[11px] text-muted-foreground">{label}</dt>
    <dd className="flex flex-1 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            tone === "primary" ? "bg-primary" : "bg-muted-foreground/40"
          }`}
          style={{ width: `${Math.round((value ?? 0) * 100)}%` }}
        />
      </div>
      <span className="w-16 text-right text-[11px] font-semibold tabular-nums">
        {value == null ? "No data" : pct(value)}
      </span>
    </dd>
  </div>
);

const JobMatching = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const feed = useJobFeed();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [activeCandidate, setActiveCandidate] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["key"]>("score");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("company") ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MatchResult | null>(null);
  // Expired roles and roles with zero vacancies are never recommended; they are
  // only visible if the visitor deliberately asks to see them.
  const [showClosed, setShowClosed] = useState(false);

  // "Match for me" filters
  const [physFilters, setPhysFilters] = useState<string[]>([]);
  const [neuroFilters, setNeuroFilters] = useState<string[]>([]);
  const [arrangements, setArrangements] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [openToMe, setOpenToMe] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setSaved(new Set());
      return;
    }
    listFavorites(user.id)
      .then((f) => setSaved(new Set(f.map((x) => x.job_id))))
      .catch(() => null);
  }, [user]);

  const toggleSaved = async (job: JobListing) => {
    if (!user) {
      navigate("/login");
      return;
    }
    const wasSaved = saved.has(job.id);
    const flip = (on: boolean) =>
      setSaved((prev) => {
        const next = new Set(prev);
        if (on) next.add(job.id);
        else next.delete(job.id);
        return next;
      });
    flip(!wasSaved);
    try {
      if (wasSaved) await removeFavorite(user.id, job.id);
      else await addFavorite(user.id, job);
    } catch (e) {
      flip(wasSaved);
      toast({
        title: "Could not update saved jobs",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const localNeeds = useMemo(() => readLocalAccessNeeds(), []);

  const load = async () => {
    if (!feed.data) return;
    setLoading(true);
    setError(null);
    try {
      const data = await runMatchMatrix({ userId: user?.id, jobs: feed.data.jobs });
      setJobs(data.jobs ?? []);
      setCandidates(data.candidates ?? []);
      setResults(data.results ?? []);
      setActiveCandidate(data.candidates?.[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run the matching engine.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, feed.data]);

  useEffect(() => {
    if (feed.error) {
      setError(feed.error instanceof Error ? feed.error.message : "Could not load jobs.");
      setLoading(false);
    }
  }, [feed.error]);

  const refresh = async () => {
    setError(null);
    await feed.refetch();
  };

  const jobById = useMemo(() => Object.fromEntries(jobs.map((j) => [j.id, j])), [jobs]);
  const current = candidates.find((c) => c.id === activeCandidate);

  // Which pathways drive this view: the viewed candidate's, falling back to
  // whatever the visitor chose during onboarding on this device.
  const pathways = current?.pathways?.length ? current.pathways : localNeeds.pathways;
  const usesPhysical = pathways.includes(PATHWAY_PHYSICAL);
  const usesNeuro = pathways.includes(PATHWAY_NEURO);
  const skillsKnown = Boolean(current?.skills_assessed);
  const hasCategories = (current?.access_profile?.categories?.length ?? 0) > 0;

  const allSectors = useMemo(
    () => [...new Set(jobs.map((j) => j.sector || "General"))].sort(),
    [jobs],
  );
  const allCities = useMemo(
    () => [...new Set(jobs.flatMap((j) => j.cities ?? []))].sort(),
    [jobs],
  );

  const scoredResults = useMemo(
    () =>
      results
        .filter((r) => r.candidate_id === activeCandidate)
        .sort((a, b) => b.match_score - a.match_score),
    [results, activeCandidate],
  );

  // Nobody signed in (or no profile yet): every role is still browsable, just
  // without personal scores. Jobs are never hidden.
  const unscored = !activeCandidate || scoredResults.length === 0;

  const browseResults = useMemo<MatchResult[]>(
    () =>
      jobs.map((j) => ({
        job_id: j.id,
        candidate_id: "",
        company: j.company_name,
        job_title: j.job_title,
        candidate: "",
        match_score: 0,
        skills_score: 0,
        work_pref_score: 0,
        accessibility_score: 0,
        exp_edu_score: 0,
        top_strengths: [],
        possible_gaps: [],
        accessibility_fit: "Moderate",
        recommendation: "Partial Match",
        availability_status: availabilityOf(j),
        deadline_label: deadlineLabel(j.application_deadline ?? null),
        vacancies: j.vacancies ?? null,
        is_recommendable: isRecommendable(availabilityOf(j)),
        confidence_level: j.data_confidence?.level ?? "Low",
      })),
    [jobs],
  );

  const candidateResults = unscored ? browseResults : scoredResults;

  const filtered = candidateResults
    .filter((r) => {
      const job = jobById[r.job_id];
      if (!job) return false;
      if (!showClosed && !isRecommendable(availabilityOf(job))) return false;
      if (arrangements.length && !arrangements.includes(job.work_mode ?? "On-site")) return false;
      if (cities.length && !cities.some((c) => job.cities?.includes(c))) return false;
      if (jobTypes.length && !jobTypes.includes(job.job_category ?? "")) return false;
      if (
        openToMe &&
        !unscored &&
        !["Open to your category", "Possibly open"].includes(r.employer_openness?.status ?? "")
      )
        return false;
      if (sectors.length && !sectors.includes(job.sector || "General")) return false;
      if (skills.length && !skills.every((s) => s in (job.skill_requirements ?? {}))) return false;
      if (physFilters.length && !physFilters.every((k) => offers(job.physical_access, k))) return false;
      if (neuroFilters.length && !neuroFilters.every((k) => offers(job.neuro_practices, k))) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!`${job.job_title} ${job.company_name} ${job.sector ?? ""} ${job.location} ${job.department ?? ""}`.toLowerCase().includes(q))
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "skills") return b.skills_score - a.skills_score;
      if (sortBy === "physical")
        return (b.physical_access_score ?? -1) - (a.physical_access_score ?? -1);
      if (sortBy === "neuro") return (b.neuro_access_score ?? -1) - (a.neuro_access_score ?? -1);
      if (sortBy === "salary")
        return salaryFloor(jobById[b.job_id]?.salary_range) - salaryFloor(jobById[a.job_id]?.salary_range);
      return b.match_score - a.match_score;
    });

  const toggle = (list: string[], set: (v: string[]) => void, key: string) =>
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  const activeFilterCount =
    physFilters.length + neuroFilters.length + arrangements.length + sectors.length + skills.length +
    cities.length + jobTypes.length + (openToMe ? 1 : 0);

  const strongAccess = unscored
    ? 0
    : candidateResults.filter((r) => accessStatusOf(r) === "Strong access match").length;
  const avgSkills =
    !unscored && candidateResults.length
      ? candidateResults.reduce((a, b) => a + b.skills_score, 0) / candidateResults.length
      : 0;

  return (
    <main className="min-h-screen bg-surface pb-20">
      <div className="container py-10">
        {/* Header */}
        <div className="tint-panel p-6 md:p-10">
          <span className="pill bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Live matching engine
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight md:text-4xl">
            Recommended for You
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Skills &amp; interests are the primary basis for every recommendation. Accessibility
            scores describe how well an <strong>employer's environment</strong> supports the needs
            you selected — never a judgement about you.
          </p>
          <p className="mt-4 flex max-w-2xl items-start gap-2 rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Jobs are never hidden because a support is missing. You'll see whether access is strong,
            partial, or simply unpublished, and you decide whether to apply.
          </p>

          {!pathways.length && (
            <p className="mt-4 text-sm">
              <Link to="/onboarding" className="font-semibold text-primary underline">
                Set your access preferences
              </Link>{" "}
              to see accessibility and work-style fit alongside your skills match.
            </p>
          )}

          {candidates.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Viewing matches as
              </p>
              <div className="flex flex-wrap gap-2">
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCandidate(c.id)}
                    aria-pressed={activeCandidate === c.id}
                    className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium shadow-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      activeCandidate === c.id
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.user_id && c.user_id === user?.id ? `${c.name} (you)` : c.name}
                    {(c.pathways?.length ?? 0) > 1 && (
                      <span className="ml-1.5 text-[10px] uppercase opacity-80">both</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: unscored ? "Roles listed" : "Roles scored",
              value: candidateResults.length,
              icon: Briefcase,
            },
            { label: "Average skills fit", value: pct(avgSkills), icon: TrendingUp },
            { label: "Strong access matches", value: strongAccess, icon: Accessibility },
            {
              label: "Needs you selected",
              value:
                (current?.access_profile?.physical?.length ?? localNeeds.physical.length) +
                (current?.access_profile?.neuro?.length ?? localNeeds.neuro.length),
              icon: Brain,
            },
          ].map((s) => (
            <div key={s.label} className="surface-card p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Match for me filters */}
          <aside aria-labelledby="match-for-me" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="match-for-me" className="font-heading text-lg font-bold">Match for me</h2>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  onClick={() => {
                    setPhysFilters([]); setNeuroFilters([]);
                    setArrangements([]); setSectors([]); setSkills([]);
                    setCities([]); setJobTypes([]); setOpenToMe(false);
                  }}
                >
                  Clear ({activeFilterCount})
                </Button>
              )}
            </div>

            <FilterGroup
              title="Physical & sensory accessibility"
              icon={Accessibility}
              defaultOpen={usesPhysical}
              count={physFilters.length}
            >
              <div className="flex flex-wrap gap-2">
                {PHYSICAL_FEATURES.map((f) => (
                  <CheckPill
                    key={f.key}
                    label={f.label}
                    active={physFilters.includes(f.key)}
                    onClick={() => toggle(physFilters, setPhysFilters, f.key)}
                  />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup
              title="Neurodivergent work environment"
              icon={Brain}
              defaultOpen={usesNeuro}
              count={neuroFilters.length}
            >
              <div className="flex flex-wrap gap-2">
                {NEURO_FEATURES.map((f) => (
                  <CheckPill
                    key={f.key}
                    label={f.label}
                    active={neuroFilters.includes(f.key)}
                    onClick={() => toggle(neuroFilters, setNeuroFilters, f.key)}
                  />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup
              title="Work arrangement"
              icon={MapPin}
              defaultOpen
              count={arrangements.length}
            >
              <div className="flex flex-wrap gap-2">
                {WORK_MODES.map((l) => (
                  <CheckPill
                    key={l}
                    label={l}
                    active={arrangements.includes(l)}
                    onClick={() => toggle(arrangements, setArrangements, l)}
                  />
                ))}
              </div>
            </FilterGroup>

            {hasCategories && (
              <label className="surface-card flex cursor-pointer items-start gap-3 p-4 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={openToMe}
                  onChange={(e) => setOpenToMe(e.target.checked)}
                />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <HeartHandshake className="h-4 w-4 text-primary" aria-hidden="true" />
                    Employers open to my category
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Only roles whose employer said they hire people in the category you shared.
                  </span>
                </span>
              </label>
            )}

            <FilterGroup title="Type of work" icon={Hammer} defaultOpen={usesPhysical} count={jobTypes.length}>
              <div className="flex flex-wrap gap-2">
                {WORK_TYPES.map((w) => (
                  <CheckPill
                    key={w.key}
                    label={w.label}
                    active={jobTypes.includes(w.key)}
                    onClick={() => toggle(jobTypes, setJobTypes, w.key)}
                  />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup title="City" icon={Building2} count={cities.length}>
              <div className="flex flex-wrap gap-2">
                {allCities.map((c) => (
                  <CheckPill
                    key={c}
                    label={c}
                    active={cities.includes(c)}
                    onClick={() => toggle(cities, setCities, c)}
                  />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup title="Industry" icon={Briefcase} count={sectors.length}>
              <div className="flex flex-wrap gap-2">
                {allSectors.map((s) => (
                  <CheckPill
                    key={s}
                    label={s}
                    active={sectors.includes(s)}
                    onClick={() => toggle(sectors, setSectors, s)}
                  />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup title="Skills" icon={GraduationCap} count={skills.length}>
              <div className="flex flex-wrap gap-2">
                {SKILL_AXES.map((s) => (
                  <CheckPill
                    key={s}
                    label={s}
                    active={skills.includes(s)}
                    onClick={() => toggle(skills, setSkills, s)}
                  />
                ))}
              </div>
            </FilterGroup>

            <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Filters are yours to choose. By default nothing is filtered out.
            </p>
          </aside>

          {/* Results */}
          <div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-soft">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search roles, companies or industries..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search jobs"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-card px-4 text-xs font-medium shadow-soft">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={showClosed}
                    onChange={(e) => setShowClosed(e.target.checked)}
                  />
                  Show closed &amp; filled roles
                </label>
                <label htmlFor="sort-by" className="text-xs text-muted-foreground">Sort by</label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="min-h-11 rounded-full bg-card px-4 text-xs font-medium shadow-soft outline-none"
                >
                  {sortOptions.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="surface-card mt-6 flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3 text-sm">
                  <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
                  <span>{error}</span>
                </div>
                <Button variant="outline" size="sm" onClick={refresh}>
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Retry
                </Button>
              </div>
            )}

            {loading || feed.isLoading ? (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-2xl" />
                ))}
              </div>
            ) : (
              <>
                <p className="mt-6 text-xs text-muted-foreground" role="status">
                  {filtered.length} role{filtered.length !== 1 ? "s" : ""} shown
                </p>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  {filtered.map((r) => {
                    const job = jobById[r.job_id];
                    const status = accessStatusOf(r);
                    const availability = availabilityOf(job);
                    const deadline = deadlineLabel(job.application_deadline ?? null);
                    const confidence = job.data_confidence?.level ?? "Low";
                    const missing = job.data_confidence?.missing ?? [];
                    return (
                      <article key={r.job_id} className="surface-card surface-card-hover animate-scale-in p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                              <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
                            </div>
                            <div>
                              <h3 className="font-bold leading-tight">{job.job_title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {job.company_name || "Employer name not provided"}
                              </p>
                            </div>
                          </div>
                          {!unscored && skillsKnown && <MatchScoreRing value={r.skills_score} />}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="pill bg-secondary">
                            <MapPin className="h-3 w-3" aria-hidden="true" /> {job.work_mode ?? "On-site"}
                            {job.location ? ` · ${job.location}` : ""}
                          </span>
                          {job.job_category && (
                            <span className="pill bg-secondary">
                              {JOB_CATEGORY_SHORT[job.job_category] ?? job.job_category}
                            </span>
                          )}
                          <span className="pill bg-secondary">
                            <GraduationCap className="h-3 w-3" aria-hidden="true" /> {job.exp_level}
                          </span>
                          {job.sector && <span className="pill bg-secondary">{job.sector}</span>}
                          <span className={`pill ${AVAILABILITY_STYLES[availability]}`}>
                            <CalendarClock className="h-3 w-3" aria-hidden="true" /> {availability}
                          </span>
                          {job.vacancies != null && (
                            <span className="pill bg-secondary">
                              <Users className="h-3 w-3" aria-hidden="true" />{" "}
                              {job.vacancies} vacanc{job.vacancies === 1 ? "y" : "ies"}
                            </span>
                          )}
                          <span className={`pill ${CONFIDENCE_STYLES[confidence]}`}>
                            {confidence} detail confidence
                          </span>
                          {!unscored && (
                            <span className={`pill ${ACCESS_STATUS_STYLES[status]}`}>{status}</span>
                          )}
                          {!unscored && r.employer_openness && (
                            <span className={`pill ${OPENNESS_STYLES[r.employer_openness.status]}`}>
                              <HeartHandshake className="h-3 w-3" aria-hidden="true" /> {r.employer_openness.status}
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-xs text-muted-foreground">
                          Application deadline:{" "}
                          <span className="font-medium text-foreground">{deadline}</span>
                          {job.working_hours ? ` · Hours ${job.working_hours}` : ""}
                          {job.employment_type ? ` · ${job.employment_type}` : ""}
                        </p>

                        {job.description && (
                          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
                        )}

                        {!unscored && r.employer_openness && r.employer_openness.status !== "Not stated" && (
                          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                            <HeartHandshake className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                            {r.employer_openness.detail}
                          </p>
                        )}
                        {!unscored && r.work_type_fit && (
                          <p
                            className={`mt-2 flex items-start gap-1.5 text-xs ${
                              r.work_type_fit.status === "Suits you" ? "text-muted-foreground" : "text-warning"
                            }`}
                          >
                            <Hammer className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {r.work_type_fit.detail}
                          </p>
                        )}

                        {(unscored || !skillsKnown) && (
                          <p className="mt-4 flex items-start gap-1.5 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>
                              <Link to="/assessments" className="font-semibold text-primary underline">
                                {unscored ? "Take an assessment" : "Finish the skills core"}
                              </Link>{" "}
                              to see your personal skills fit for this role.
                            </span>
                          </p>
                        )}

                        {/* Split match dimensions */}
                        <dl className={`mt-5 space-y-2 ${unscored ? "hidden" : ""}`}>
                          {skillsKnown && <ScoreBar label="Skills & interests match" value={r.skills_score} />}
                          {usesPhysical && (
                            <ScoreBar
                              label="Physical & sensory access"
                              value={r.physical_access_score}
                              tone={r.physical_access_score == null ? "muted" : "primary"}
                            />
                          )}
                          {usesNeuro && (
                            <ScoreBar
                              label="Neurodivergent work-style"
                              value={r.neuro_access_score}
                              tone={r.neuro_access_score == null ? "muted" : "primary"}
                            />
                          )}
                          {!usesPhysical && !usesNeuro && (
                            <ScoreBar label="Published accessibility" value={r.accessibility_score} />
                          )}
                          <ScoreBar label="Work-style preferences" value={r.work_pref_score} />
                        </dl>

                        {r.evidence?.interests?.[0] && (
                          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                            {r.evidence.interests[0]}
                          </p>
                        )}


                        {!unscored && status === "Access information unavailable" && (
                          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            This employer hasn't published details for the needs you selected. You can
                            still apply and ask.
                          </p>
                        )}
                        {!unscored && status.startsWith("Partial") && !!r.pathway_breakdown && (
                          <p className="mt-3 flex items-start gap-1.5 text-xs text-warning">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            Accommodation may be needed — see the breakdown before deciding.
                          </p>
                        )}

                        {!unscored && (r.access_conflicts?.length ?? 0) > 0 && (
                          <p className="mt-3 flex items-start gap-1.5 text-xs text-warning">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{r.access_conflicts!.slice(0, 2).join("; ")}</span>
                          </p>
                        )}

                        {missing.length > 0 && (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Employer hasn't provided: {missing.slice(0, 4).join(", ")}
                            {missing.length > 4 ? ` +${missing.length - 4} more` : ""}
                          </p>
                        )}

                        {r.top_strengths.length > 0 && (
                          <p className="mt-4 text-xs">
                            <span className="font-semibold text-success">Strengths: </span>
                            <span className="text-muted-foreground">{r.top_strengths.join(", ")}</span>
                          </p>
                        )}
                        {r.possible_gaps.length > 0 && (
                          <p className="mt-1 text-xs">
                            <span className="font-semibold text-warning">Skills to grow: </span>
                            <span className="text-muted-foreground">{r.possible_gaps.join(", ")}</span>
                          </p>
                        )}

                        <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
                          <span className="text-sm font-bold text-primary">
                            {job.salary_range ?? "Salary on request"}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleSaved(job)}
                              aria-pressed={saved.has(job.id)}
                              className="min-h-11 min-w-11 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                              aria-label={`${saved.has(job.id) ? "Remove" : "Save"} ${job.job_title} at ${job.company_name || "this employer"}`}
                            >
                              <Heart
                                className={`h-4 w-4 ${saved.has(job.id) ? "fill-primary text-primary" : ""}`}
                                aria-hidden="true"
                              />
                            </button>
                            {!unscored && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full px-4 text-xs"
                                onClick={() => setDetail(r)}
                              >
                                Why this match
                              </Button>
                            )}
                            {isRecommendable(availability) && job.apply_contact ? (
                              <Button asChild size="sm" className="rounded-full px-4 text-xs">
                                <a
                                  href={`mailto:${job.apply_contact}?subject=${encodeURIComponent(
                                    `Application: ${job.job_title} (via AccessHire)`,
                                  )}`}
                                >
                                  Apply
                                </a>
                              </Button>
                            ) : (
                              <Button size="sm" className="rounded-full px-4 text-xs" disabled>
                                {isRecommendable(availability) ? "Contact not provided" : availability}
                              </Button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {!error && filtered.length === 0 && (
                  <p className="mt-12 text-center text-muted-foreground">
                    No roles match your current filters. Try clearing a filter group — nothing is
                    hidden by default.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <MatchDetailDialog
        result={detail}
        job={detail ? jobById[detail.job_id] : undefined}
        open={Boolean(detail)}
        onOpenChange={(v) => !v && setDetail(null)}
      />
    </main>
  );
};

export default JobMatching;
