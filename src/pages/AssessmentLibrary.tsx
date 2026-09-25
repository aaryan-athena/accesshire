import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accessibility,
  ArrowRight,
  Brain,
  Check,
  ClipboardCheck,
  Info,
  Layers,
  ShieldCheck,
} from "lucide-react";
import {
  TRACK_LIST,
  estimatedMinutes,
  questionCount,
  type AssessmentTrack,
} from "@/lib/assessments";
import { METHODOLOGY_NOTE, RESEARCH_SOURCES } from "@/lib/researchSources";

const TRACK_ICONS = {
  neurodivergent: Brain,
  "physical-sensory": Accessibility,
} as const;

const TrackCard = ({ track }: { track: AssessmentTrack }) => {
  const Icon = TRACK_ICONS[track.id];
  return (
    <article className="surface-card surface-card-hover flex min-w-0 flex-col p-7 md:p-9" aria-labelledby={`${track.id}-title`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 id={`${track.id}-title`} className="mt-5 font-heading text-2xl font-bold tracking-tight">
        {track.short} assessment
      </h2>
      <p className="mt-2 text-sm font-medium">{track.audience}</p>
      <p className="mt-2 text-sm text-muted-foreground">{track.subtitle}</p>

      <div className="mt-6 grid gap-4 rounded-2xl bg-surface p-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Part 1 · Skills core
          </p>
          <p className="mt-1 text-muted-foreground">
            Practical tasks, work situations and your interests — the same for everyone, and the
            only thing that decides your capability match.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Part 2 · {track.short} module
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {track.moduleMeasures.map((m) => (
              <li key={m} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {questionCount(track.id)} questions · about {estimatedMinutes(track.id)} minutes · no time
        limits
      </p>
      <Button asChild size="lg" className="mt-4 h-auto min-h-11 w-full whitespace-normal rounded-full py-3 shadow-glow">
        <Link to={`/assessments/${track.id}`}>
          {track.cta}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="mt-2 h-auto min-h-9 w-full whitespace-normal rounded-full py-2">
        <Link to={`/assessments/${track.id}?part=module`}>
          {track.moduleCta} ({questionCount(track.id, "module")} questions)
        </Link>
      </Button>
    </article>
  );
};

const AssessmentLibrary = () => (
  <main className="min-h-screen bg-surface pb-24">
    <div className="container py-10">
      <div className="tint-panel p-6 md:p-10">
        <span className="pill bg-primary/10 text-primary">
          <ClipboardCheck className="h-3.5 w-3.5" /> AccessHire assessments
        </span>
        <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight md:text-4xl">
          Choose the assessment that fits you
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          There are two assessments, one for each group we serve. Both start with the same
          skills core, so everyone's capability is measured the same way. Each then asks about the
          workplace <em>you</em> need — so your job matches account for the right things.
        </p>
        <p className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/30 bg-card p-4 text-sm shadow-soft">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            These are career assessments, not medical screening. You never have to name or prove a
            disability, and nothing you tell us about access can lower your strength scores or hide
            a job from you.
          </span>
        </p>
      </div>

      <section aria-label="Available assessments" className="mt-8 grid gap-6 lg:grid-cols-2">
        {TRACK_LIST.map((track) => (
          <TrackCard key={track.id} track={track} />
        ))}
      </section>

      <div className="surface-card mt-8 flex items-start gap-4 p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Layers className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="text-sm">
          <h2 className="font-heading text-lg font-bold">Both apply to you?</h2>
          <p className="mt-1 text-muted-foreground">
            Many people are both. Take either full assessment, then add the other one's module on its
            own — you won't repeat the skills questions, and your matches will combine both sets of
            needs.
          </p>
        </div>
      </div>

      <p className="mt-8 flex items-start gap-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Short on time? You can also{" "}
          <Link to="/onboarding" className="font-medium text-primary underline">
            pick your access needs from a list
          </Link>{" "}
          without taking an assessment.
        </span>
      </p>

      <details className="mt-10 rounded-2xl bg-card p-5 text-sm shadow-soft">
        <summary className="cursor-pointer font-semibold">
          How these assessments were informed
        </summary>
        <p className="mt-3 text-muted-foreground">{METHODOLOGY_NOTE}</p>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {RESEARCH_SOURCES.map((s) => (
            <li key={s.url}>
              <span className="font-medium text-foreground">{s.name}</span> ({s.publisher}) —{" "}
              {s.informed}
            </li>
          ))}
        </ul>
      </details>
    </div>
  </main>
);

export default AssessmentLibrary;
