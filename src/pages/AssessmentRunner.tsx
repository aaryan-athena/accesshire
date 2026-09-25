import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MatchScoreRing from "@/components/MatchScoreRing";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  emptyCandidate,
  readLocalCandidate,
  saveAccessProfile,
  saveCandidateProfile,
} from "@/lib/candidateProfile";
import { runCandidateMatch, type CandidateProfile, type MatchResult } from "@/lib/matching";
import { useJobFeed } from "@/lib/jobs";
import { readLocalAccessNeeds, writeLocalAccessNeeds } from "@/lib/accessNeeds";
import {
  DISABILITY_CATEGORY_LABELS,
  FEATURE_LABELS,
  PATHWAY_NEURO,
  PATHWAY_PHYSICAL,
  WORK_TYPE_LABELS,
} from "@/lib/pathways";
import { COMM_PREF_LABELS } from "@/lib/canonical";
import { STYLE_LABELS } from "@/lib/taxonomy";
import {
  ASSESSMENT_VERSION,
  LEGACY_TRACK_IDS,
  SECTION_LABELS,
  TRACKS,
  isTrackId,
  questionsFor,
  scoreAssessment,
  type AssessmentAnswers,
  type AssessmentOutcome,
  type AssessmentPart,
  type AssessmentQuestion,
  type TrackId,
} from "@/lib/assessments";
import { METHODOLOGY_NOTE } from "@/lib/researchSources";
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  Brain,
  Briefcase,
  Check,
  ClipboardCheck,
  Clock,
  Heart,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const QuestionCard = ({
  question,
  index,
  total,
  answer,
  onAnswer,
}: {
  question: AssessmentQuestion;
  index: number;
  total: number;
  answer: number | number[] | undefined;
  onAnswer: (value: number | number[]) => void;
}) => {
  const selected = Array.isArray(answer) ? answer : answer === undefined ? [] : [answer];

  const toggle = (i: number) => {
    if (!question.multi) {
      onAnswer(i);
      return;
    }
    if (selected.includes(i)) {
      onAnswer(selected.filter((x) => x !== i));
      return;
    }
    // "None of these" / "Prefer not to say" clears the other choices, and vice versa.
    const exclusive = question.options[i].exclusive;
    onAnswer(exclusive ? [i] : [...selected.filter((x) => !question.options[x].exclusive), i]);
  };

  return (
    <div className="surface-card p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill bg-primary/10 text-primary">{SECTION_LABELS[question.section]}</span>
        <span className="text-xs font-medium text-muted-foreground">
          {question.multi ? "Select all that apply" : "Select one"}
        </span>
      </div>
      <h2 className="mt-4 font-heading text-xl font-bold leading-snug md:text-2xl">
        {question.prompt}
      </h2>
      {question.helper && <p className="mt-2 text-sm text-muted-foreground">{question.helper}</p>}

      {question.table && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Data for question {index + 1} of {total}</caption>
            <thead>
              <tr>
                {question.table.headers.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="border-b border-border px-3 py-2 text-left font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.table.rows.map((row) => (
                <tr key={row.join("-")}>
                  {row.map((cell, i) => (
                    <td key={i} className="border-b border-border/60 px-3 py-2 tabular-nums">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div
        className="mt-6 space-y-3"
        role={question.multi ? "group" : "radiogroup"}
        aria-label={question.prompt}
      >
        {question.options.map((opt, i) => {
          const active = selected.includes(i);
          return (
            <button
              key={opt.label}
              type="button"
              role={question.multi ? "checkbox" : "radio"}
              aria-checked={active}
              onClick={() => toggle(i)}
              className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                active
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
                aria-hidden="true"
              >
                {active ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + i)}
              </span>
              <span className="pt-0.5">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** The profile this outcome produces, merged onto whatever the device already holds. */
function candidateFromOutcome(outcome: AssessmentOutcome, name: string): CandidateProfile {
  const base = readLocalCandidate() ?? emptyCandidate("preview", name);
  const access = outcome.accessProfile;
  const pathways = [...new Set([...(base.pathways ?? []), ...outcome.pathways])];
  return {
    ...base,
    id: "preview",
    name,
    ...(outcome.derived
      ? {
          skills_assessed: true,
          exp_level: outcome.derived.exp_level,
          edu_needed: outcome.derived.edu_needed,
          skills_profile: outcome.derived.skills_profile,
          interests: outcome.interests,
        }
      : {}),
    work_style_pref: { ...base.work_style_pref, ...outcome.workStyle },
    pathways,
    access_profile: {
      physical: outcome.track.pathway === PATHWAY_PHYSICAL ? access.physical : base.access_profile?.physical ?? [],
      neuro: outcome.track.pathway === PATHWAY_NEURO ? access.neuro : base.access_profile?.neuro ?? [],
      categories: [...new Set([...(base.access_profile?.categories ?? []), ...access.categories])],
      work_types: access.workTypes.length ? access.workTypes : base.access_profile?.work_types ?? [],
    },
  };
}

const TopMatches = ({ outcome, name }: { outcome: AssessmentOutcome; name: string }) => {
  const feed = useJobFeed();
  const [results, setResults] = useState<MatchResult[] | null>(null);

  useEffect(() => {
    if (!feed.data) return;
    const candidate = candidateFromOutcome(outcome, name);
    runCandidateMatch({ candidate, jobs: feed.data.jobs })
      .then((r) => setResults(r.results.filter((m) => m.is_recommendable).slice(0, 3)))
      .catch(() => setResults([]));
  }, [feed.data, outcome, name]);

  const skillsKnown = Boolean(outcome.derived) || Boolean(readLocalCandidate()?.skills_assessed);

  return (
    <section aria-labelledby="top-matches" className="surface-card p-6 md:p-8">
      <h2 id="top-matches" className="font-heading text-xl font-bold">
        Your top open roles right now
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Scored live against every role employers have listed on AccessHire.
      </p>
      {!results ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : results.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No open roles are listed right now. New employer submissions appear here automatically.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {results.map((r) => (
            <li key={r.job_id} className="flex items-center gap-4 rounded-2xl bg-surface p-4">
              {skillsKnown ? (
                <MatchScoreRing value={r.skills_score} size={48} />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.job_title}</p>
                <p className="truncate text-xs text-muted-foreground">{r.company}</p>
              </div>
              <div className="hidden flex-col items-end gap-1 text-right text-[11px] sm:flex">
                {r.employer_openness && (
                  <span className="text-muted-foreground">{r.employer_openness.status}</span>
                )}
                {r.access_status && r.access_status !== "Access information unavailable" && (
                  <span className="text-muted-foreground">{r.access_status}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const Results = ({
  outcome,
  onRetake,
  onSave,
  saving,
  saved,
  signedIn,
  name,
}: {
  outcome: AssessmentOutcome;
  onRetake: () => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  signedIn: boolean;
  name: string;
}) => {
  const strengths = Object.entries(outcome.strengths).sort((a, b) => b[1] - a[1]);
  const needLabels = outcome.needs.map((k) => FEATURE_LABELS[k] ?? k);
  const hasSkills = Boolean(outcome.derived);
  const isNeuro = outcome.track.pathway === PATHWAY_NEURO;
  const other = isNeuro ? TRACKS["physical-sensory"] : TRACKS.neurodivergent;
  const TrackIcon = isNeuro ? Brain : Accessibility;

  return (
    <div className="space-y-6">
      <div className="tint-panel p-6 md:p-8">
        <span className="pill bg-primary/10 text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Results
        </span>
        <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight">
          {hasSkills ? "Your career profile" : `Your ${outcome.track.short.toLowerCase()} work profile`}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {outcome.track.title}
          {hasSkills && <> · overall strength score {outcome.overall}/100</>}. Your access answers are
          matched separately against what employers publish, and never reduce your strength scores.
        </p>
        {outcome.categories.length > 0 && (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <TrackIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">You shared:</span>
            {outcome.categories.map((c) => (
              <span key={c} className="pill bg-card">{DISABILITY_CATEGORY_LABELS[c] ?? c}</span>
            ))}
            <span className="text-xs text-muted-foreground">
              — used only to show employers who say they're open to hiring you.
            </span>
          </p>
        )}
      </div>

      {hasSkills && (
        <section aria-labelledby="strengths" className="surface-card p-6 md:p-8">
          <h2 id="strengths" className="font-heading text-xl font-bold">
            Your career strength profile
          </h2>
          <dl className="mt-5 space-y-4">
            {strengths.map(([axis, score]) => (
              <div key={axis}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <dt className="font-semibold">{axis}</dt>
                  <dd className="tabular-nums font-bold text-muted-foreground">{score}</dd>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </section>
      )}

      {hasSkills && outcome.interests.length > 0 && (
        <section aria-labelledby="interests" className="surface-card p-6 md:p-8">
          <h2 id="interests" className="font-heading text-xl font-bold">
            Your interest areas
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Roles in these areas are boosted in your matches.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {outcome.interests.map((area) => (
              <li key={area} className="pill bg-primary/10 text-primary">
                {area}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="how-you-work" className="surface-card p-6 md:p-8">
          <h2 id="how-you-work" className="font-heading text-xl font-bold">
            {isNeuro ? "How you work best" : "What suits you"}
          </h2>
          {outcome.insights.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {outcome.insights.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No specific preferences selected.</p>
          )}
          {outcome.workTypes.length > 0 && (
            <p className="mt-4 text-sm">
              <span className="font-medium">Kinds of work that suit you:</span>{" "}
              <span className="text-muted-foreground">
                {outcome.workTypes.map((w) => WORK_TYPE_LABELS[w] ?? w).join(", ")}
              </span>
            </p>
          )}
          <ul className="mt-5 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            {Object.entries(outcome.workStyle).map(([key, value]) => (
              <li key={key}>
                <span className="font-medium text-foreground">{STYLE_LABELS[key] ?? key}:</span>{" "}
                {value}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="access-profile" className="surface-card p-6 md:p-8">
          <h2 id="access-profile" className="font-heading text-xl font-bold">
            {isNeuro ? "Workplace practices you need" : "Workplace access you need"}
          </h2>
          {needLabels.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {needLabels.map((label) => (
                <li key={label} className="flex items-start gap-2">
                  <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              You didn't select any specific needs. You can add them any time in{" "}
              <Link to="/onboarding" className="font-medium text-primary underline">
                access preferences
              </Link>
              .
            </p>
          )}
          {(outcome.assistiveTech.length > 0 || Object.keys(outcome.commPrefs).length > 0) && (
            <ul className="mt-4 space-y-1.5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              {outcome.assistiveTech.map((t) => (
                <li key={t}>{t}</li>
              ))}
              {Object.entries(outcome.commPrefs).map(([key, value]) => (
                <li key={key}>
                  <span className="font-medium text-foreground">{COMM_PREF_LABELS[key] ?? key}:</span> {value}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 flex items-start gap-2 rounded-2xl bg-primary/5 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            These are matched against what each employer publishes about their workplace — never
            against you.
          </p>
        </section>
      </div>

      {hasSkills && outcome.jobFamilies.length > 0 && (
        <section aria-labelledby="job-families" className="surface-card p-6 md:p-8">
          <h2 id="job-families" className="font-heading text-xl font-bold">
            Best-fit job families
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {outcome.jobFamilies.map((f) => (
              <div key={f.name} className="rounded-2xl bg-card p-4 shadow-soft">
                <p className="flex items-center gap-2 font-semibold">
                  <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
                  {f.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{f.why}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <TopMatches outcome={outcome} name={name} />

      <section className="surface-card p-6 md:p-8">
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full shadow-glow">
            <Link to="/jobs">
              See all my job matches
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-full" onClick={onSave} disabled={saving || saved}>
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            {saving ? "Saving…" : saved ? "Saved" : signedIn ? "Save to my profile" : "Sign in to save to an account"}
          </Button>
          <Button size="lg" variant="ghost" className="rounded-full" onClick={onRetake}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Retake
          </Button>
        </div>
        {!signedIn && (
          <p className="mt-3 text-xs text-muted-foreground">
            Your results are kept on this device, so your job matches work without an account.
          </p>
        )}
        <p className="mt-5 flex items-start gap-2 border-t border-border/60 pt-5 text-sm text-muted-foreground">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Does the other category apply to you too?{" "}
            <Link to={`/assessments/${other.id}?part=module`} className="font-medium text-primary underline">
              Add the {other.short.toLowerCase()} module
            </Link>{" "}
            — it skips the skills questions you've already answered.
          </span>
        </p>
      </section>

      <details className="rounded-2xl bg-card p-5 text-sm shadow-soft">
        <summary className="cursor-pointer font-semibold">How this assessment was informed</summary>
        <p className="mt-3 text-muted-foreground">{METHODOLOGY_NOTE}</p>
      </details>
    </div>
  );
};

const AssessmentRunner = () => {
  const { trackId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile: userProfile } = useAuth();
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const part: AssessmentPart = searchParams.get("part") === "module" ? "module" : "full";
  const safeTrackId: TrackId = isTrackId(trackId) ? trackId : "neurodivergent";
  const track = TRACKS[safeTrackId];
  const questions = useMemo(() => questionsFor(safeTrackId, part), [safeTrackId, part]);
  const total = questions.length;
  const question = questions[Math.min(index, total - 1)];
  const outcome = useMemo(
    () => (done ? scoreAssessment(safeTrackId, answers, part) : null),
    [done, safeTrackId, answers, part],
  );
  const candidateName = userProfile?.full_name || user?.email?.split("@")[0] || "You";

  // Persist to the device as soon as results exist, so matching works signed out.
  useEffect(() => {
    if (!outcome) return;
    persist(outcome, null).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome]);

  if (trackId && LEGACY_TRACK_IDS.includes(trackId)) return <Navigate to="/assessments" replace />;

  if (!isTrackId(trackId)) {
    return (
      <main className="container py-20">
        <h1 className="font-heading text-2xl font-bold">Assessment not found</h1>
        <Button asChild className="mt-4 rounded-full">
          <Link to="/assessments">Back to assessments</Link>
        </Button>
      </main>
    );
  }

  /** Capability and access are saved by separate calls — access never touches skills. */
  async function persist(result: AssessmentOutcome, userId: string | null) {
    if (result.derived) {
      await saveCandidateProfile({
        userId,
        name: candidateName,
        derived: result.derived,
        interests: result.interests,
        track: result.track.id,
        version: ASSESSMENT_VERSION,
      });
    }
    const existing = readLocalAccessNeeds();
    const isPhysical = result.track.pathway === PATHWAY_PHYSICAL;
    const merged = {
      ...existing,
      pathways: [...new Set([...existing.pathways, ...result.pathways])],
      physical: isPhysical ? result.accessProfile.physical : existing.physical,
      neuro: isPhysical ? existing.neuro : result.accessProfile.neuro,
      categories: [...new Set([...existing.categories, ...result.accessProfile.categories])],
      workTypes: isPhysical ? result.accessProfile.workTypes : existing.workTypes,
      skipped: false,
      completed: true,
    };
    writeLocalAccessNeeds(merged);
    await saveAccessProfile({
      userId,
      name: candidateName,
      pathways: merged.pathways,
      physical: merged.physical,
      neuro: merged.neuro,
      categories: merged.categories,
      workTypes: merged.workTypes,
      workStyle: result.accessProfile.workStyle,
      assistiveTech: result.accessProfile.assistiveTech,
      commPrefs: result.accessProfile.commPrefs,
      track: result.track.id,
      version: ASSESSMENT_VERSION,
    });
  }

  const handleSave = async () => {
    if (!outcome) return;
    if (!user) {
      navigate("/login");
      return;
    }
    setSaving(true);
    try {
      await persist(outcome, user.id);
      setSaved(true);
      toast({
        title: "Saved to your profile",
        description: "Your matches are now live on the jobs page.",
      });
    } catch (e) {
      toast({
        title: "Could not save to your account",
        description:
          (e instanceof Error ? e.message : "Please try again.") +
          " Your results are still kept on this device.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (done && outcome) {
    return (
      <main className="min-h-screen bg-surface pb-24">
        <div className="container py-10">
          <Results
            outcome={outcome}
            saving={saving}
            saved={saved}
            signedIn={Boolean(user)}
            onSave={handleSave}
            name={candidateName}
            onRetake={() => {
              setAnswers({});
              setIndex(0);
              setDone(false);
              setSaved(false);
            }}
          />
        </div>
      </main>
    );
  }

  const current = answers[question.id];
  const answered = current !== undefined && (!Array.isArray(current) || current.length > 0);
  const canAdvance = question.multi || answered;
  const progress = ((index + (answered ? 1 : 0)) / total) * 100;
  const inModule = !track.coreQuestions.includes(question);

  const next = () => {
    if (index < total - 1) setIndex(index + 1);
    else setDone(true);
  };

  return (
    <main className="min-h-screen bg-surface pb-24">
      <div className="container py-10">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="pill bg-primary/10 text-primary">
              <ClipboardCheck className="h-3.5 w-3.5" /> {track.title}
              {part === "module" && " · module only"}
            </span>
            <Link to="/assessments" className="text-sm font-medium text-primary underline">
              Change assessment
            </Link>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            No time limits. {part === "full" && (inModule
              ? `Part 2 of 2 — ${track.short.toLowerCase()} module.`
              : "Part 1 of 2 — skills core, the same for everyone.")}
          </p>

          <div className="mt-4" aria-live="polite">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-muted-foreground">
                Question {index + 1} of {total}
              </span>
              <span className="font-semibold text-primary">{Math.round(progress)}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={index + 1}
              aria-valuemin={1}
              aria-valuemax={total}
              aria-label={`Question ${index + 1} of ${total}`}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-6">
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              total={total}
              answer={current}
              onAnswer={(value) => {
                setAnswers((prev) => ({ ...prev, [question.id]: value }));
                if (!question.multi) {
                  window.setTimeout(() => {
                    setIndex((i) => {
                      if (i < total - 1) return i + 1;
                      setDone(true);
                      return i;
                    });
                  }, 160);
                }
              }}
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Back
            </Button>
            <Button className="rounded-full" onClick={next} disabled={!canAdvance}>
              {index === total - 1 ? "See my results" : question.multi && !answered ? "Skip" : "Next"}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AssessmentRunner;
