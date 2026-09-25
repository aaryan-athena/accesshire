import { Button } from "@/components/ui/button";
import { useJobFeed } from "@/lib/jobs";
import { isRecommendable } from "@/lib/canonical";
import { AlertTriangle, CheckCircle2, Database, RefreshCw } from "lucide-react";

const nonEmpty = (v: unknown) => Boolean(v) && Object.keys(v as object).length > 0;

/** Live view of the employer intake data every candidate is matched against. */
const EmployerDataSync = () => {
  const { data, isFetching, error, refetch } = useJobFeed();
  const jobs = data?.jobs ?? [];

  const stats = [
    { label: "Roles listed", value: data ? jobs.length : "—" },
    { label: "Open now", value: data ? jobs.filter((j) => isRecommendable(j.availability_status)).length : "—" },
    { label: "Companies", value: data ? data.companies.length : "—" },
    {
      label: "With access information",
      value: data ? jobs.filter((j) => nonEmpty(j.physical_access) || nonEmpty(j.neuro_practices)).length : "—",
    },
  ];

  return (
    <section aria-labelledby="data-sync" className="py-16">
      <div className="container">
        <div className="surface-card p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="pill bg-primary/10 text-primary">
                <Database className="h-3.5 w-3.5" /> Live employer data
              </span>
              <h2 id="data-sync" className="mt-4 font-heading text-2xl font-bold tracking-tight">
                Employer intake, live
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Every company and role submitted through the AccessHire employer intake form appears
                here straight away — normalised, validated and matched against candidates in real
                time. Rows missing a job title are held back rather than guessed.
              </p>
            </div>
            <Button className="rounded-full shadow-glow" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {error && (
            <p className="mt-6 flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {error instanceof Error ? error.message : "Could not load employer data."}
            </p>
          )}

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-surface p-4">
                <dt className="text-xs font-medium text-muted-foreground">{s.label}</dt>
                <dd className="mt-1 font-heading text-2xl font-bold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>

          {data && (
            <div className="mt-6 space-y-2 rounded-2xl bg-surface p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                {jobs.length} of {jobs.length + data.rejected.length} submitted roles listed · updated{" "}
                {new Date(data.fetchedAt).toLocaleTimeString()}
              </p>
              {data.rejected.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {data.rejected.map((r) => (
                    <li key={r.source_record_id} className="flex items-start gap-2">
                      <AlertTriangle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning"
                        aria-hidden="true"
                      />
                      {r.company || "Unnamed company"}: {r.errors.join("; ")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default EmployerDataSync;
