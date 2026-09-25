import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MatchScoreRing from "@/components/MatchScoreRing";
import { pct, recommendationStyles, type JobListing, type MatchResult } from "@/lib/matching";
import { WEIGHTS } from "@/lib/matcher";
import { FEATURE_LABELS } from "@/lib/pathways";
import { AlertTriangle, Check, Hammer, HeartHandshake, Info, MapPin, Wallet, X } from "lucide-react";

interface Props {
  result: MatchResult | null;
  job?: JobListing;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const Bar = ({ value }: { value: number }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(value * 100)}%` }} />
  </div>
);

const MatchDetailDialog = ({ result, job, open, onOpenChange }: Props) => {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-xl leading-tight">
            {result.job_title}
            <span className="block text-sm font-normal text-muted-foreground">{result.company || "Employer name not provided"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-2xl bg-surface p-4">
          <MatchScoreRing value={result.match_score} size={64} />
          <div>
            <span className={`pill ${recommendationStyles[result.recommendation]}`}>
              {result.recommendation}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              Overall fit for {result.candidate}
            </p>
          </div>
          <div className="ml-auto space-y-1 text-right text-xs text-muted-foreground">
            {job && (
              <>
                <p className="flex items-center justify-end gap-1">
                  <MapPin className="h-3 w-3" /> {job.location}
                </p>
                <p className="flex items-center justify-end gap-1">
                  <Wallet className="h-3 w-3" /> {job.salary_range ?? "On request"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Capability score (dimension A) — the only thing that sets the match score */}
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: `Skills (${Math.round(WEIGHTS.skills * 100)}%)`, v: result.skills_score },
            { label: `Interests (${Math.round(WEIGHTS.interests * 100)}%)`, v: result.interests_score ?? 0 },
            { label: `Experience & education (${Math.round(WEIGHTS.expEdu * 100)}%)`, v: result.exp_edu_score },
            { label: "Work-style fit (not in score)", v: result.work_pref_score },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-semibold tabular-nums">{pct(s.v)}</span>
              </div>
              <Bar value={s.v} />
            </div>
          ))}
        </div>

        {(result.employer_openness || result.work_type_fit) && (
          <section className="grid gap-3 sm:grid-cols-2">
            {result.employer_openness && (
              <div className="rounded-2xl bg-card p-4 text-xs shadow-soft">
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                  <HeartHandshake className="h-4 w-4 text-primary" aria-hidden="true" />
                  {result.employer_openness.status}
                </p>
                <p className="text-muted-foreground">{result.employer_openness.detail}</p>
              </div>
            )}
            {result.work_type_fit && (
              <div className="rounded-2xl bg-card p-4 text-xs shadow-soft">
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                  <Hammer className="h-4 w-4 text-primary" aria-hidden="true" />
                  {result.work_type_fit.status}
                </p>
                <p className="text-muted-foreground">{result.work_type_fit.detail}</p>
              </div>
            )}
          </section>
        )}

        {job?.description && (
          <section>
            <h3 className="mb-1 text-sm font-bold">About the role</h3>
            <p className="text-sm text-muted-foreground">{job.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {[job.employment_type, job.working_hours && `Hours ${job.working_hours}`, job.vacancies != null && `${job.vacancies} vacancies`, job.apply_method && `Apply via ${job.apply_method}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </section>
        )}

        {/* Pathway-specific access detail */}
        {(result.pathway_breakdown?.physical || result.pathway_breakdown?.neuro) && (
          <section>
            <h3 className="mb-2 text-sm font-bold">
              Access match — {result.access_status ?? "not published"}
            </h3>
            <p className="mb-3 text-xs text-muted-foreground">
              This describes how well the employer's environment supports the needs you selected. It
              never affects your skills score.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["Physical & sensory access", result.pathway_breakdown?.physical],
                ["Neurodivergent work-style", result.pathway_breakdown?.neuro],
              ] as const).map(([label, domain]) =>
                domain ? (
                  <div key={label} className="rounded-2xl bg-card p-4 shadow-soft">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold">{label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {domain.score == null ? "No data" : pct(domain.score)}
                      </span>
                    </div>
                    {domain.score != null && <Bar value={domain.score} />}
                    <ul className="mt-2 space-y-1 text-xs">
                      {domain.supported.map((k) => (
                        <li key={k} className="flex items-center gap-1.5 text-success">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> {FEATURE_LABELS[k] ?? k}
                        </li>
                      ))}
                      {domain.partial.map((k) => (
                        <li key={k} className="flex items-center gap-1.5 text-warning">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                          {FEATURE_LABELS[k] ?? k} — partly offered
                        </li>
                      ))}
                      {domain.missing.map((k) => (
                        <li key={k} className="flex items-center gap-1.5 text-muted-foreground">
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          {FEATURE_LABELS[k] ?? k} — accommodation may be needed
                        </li>
                      ))}
                      {domain.unstated.map((k) => (
                        <li key={k} className="flex items-center gap-1.5 text-muted-foreground">
                          <Info className="h-3.5 w-3.5" aria-hidden="true" />
                          {FEATURE_LABELS[k] ?? k} — not published
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          </section>
        )}

        {!!result.blockers?.length && (
          <div className="rounded-2xl bg-warning/10 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-warning">
              <AlertTriangle className="h-4 w-4" /> Supports to ask about
            </p>
            <ul className="ml-6 list-disc space-y-0.5 text-xs text-muted-foreground">
              {result.blockers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
        )}


        {/* Skill by skill */}
        {!!result.skill_breakdown?.length && (
          <section>
            <h3 className="mb-2 text-sm font-bold">Skill requirements</h3>
            <div className="overflow-hidden rounded-2xl shadow-soft">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Skill</th>
                    <th className="px-3 py-2 font-medium">Required</th>
                    <th className="px-3 py-2 font-medium">You</th>
                    <th className="px-3 py-2 font-medium">Weight</th>
                    <th className="px-3 py-2 font-medium text-right">Met</th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {result.skill_breakdown.map((s) => (
                    <tr key={s.skill} className="border-t border-border/60">
                      <td className="px-3 py-2 font-medium">{s.skill}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.required}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.candidate}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.importance}</td>
                      <td className="px-3 py-2 text-right">
                        {s.met ? (
                          <Check className="ml-auto h-4 w-4 text-success" />
                        ) : (
                          <span className="font-semibold text-warning">{pct(s.score)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Work style */}
        {!!result.style_breakdown?.length && (
          <section>
            <h3 className="mb-2 text-sm font-bold">Working style alignment</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {result.style_breakdown.map((s) => (
                <div key={s.key} className="rounded-xl bg-card px-3 py-2 text-xs shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.label}</span>
                    <span
                      className={
                        s.score === 1
                          ? "text-success"
                          : s.score > 0
                            ? "text-warning"
                            : "text-muted-foreground"
                      }
                    >
                      {s.score === 1 ? "Aligned" : s.score > 0 ? "Close" : "Differs"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    Role: {s.job} · You: {s.candidate}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Accessibility */}
        {!!result.accessibility_breakdown?.length && (
          <section>
            <h3 className="mb-2 text-sm font-bold">Accessibility support</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {result.accessibility_breakdown.map((a) => (
                <li
                  key={a.area}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs shadow-soft ${
                    a.needed ? "bg-primary/5" : "bg-card"
                  }`}
                >
                  <span className={a.needed ? "font-semibold" : "text-muted-foreground"}>
                    {a.area}
                    {a.needed && <span className="ml-1 text-[10px] text-primary">needed</span>}
                  </span>
                  {a.score === 1 ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : a.score > 0 ? (
                    <span className="text-warning">Partial</span>
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!result.notes?.length && (
          <div className="rounded-2xl bg-surface p-4">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold">
              <Info className="h-4 w-4 text-primary" /> Engine notes
            </p>
            <ul className="ml-6 list-disc space-y-0.5 text-xs text-muted-foreground">
              {result.notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MatchDetailDialog;
