import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobFeed, type CompanySummary } from "@/lib/jobs";
import { Building2, Pause, Play } from "lucide-react";

const initials = (name: string) =>
  name
    .replace(/\b(pvt|private|ltd|limited|llp|inc|co)\b\.?/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "·";

const CompanyChip = ({ company, hidden }: { company: CompanySummary; hidden?: boolean }) => (
  <li aria-hidden={hidden || undefined} className={hidden ? "shrink-0 motion-reduce:hidden" : "shrink-0"}>
    <Link
      to={`/jobs?company=${encodeURIComponent(company.name)}`}
      tabIndex={hidden ? -1 : undefined}
      className="group flex min-h-16 items-center gap-3 rounded-2xl border border-border/70 bg-card px-5 py-3 shadow-soft transition-all hover:border-primary/40 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading text-sm font-bold text-primary"
        aria-hidden="true"
      >
        {initials(company.name)}
      </span>
      <span className="text-left">
        <span className="block whitespace-nowrap font-heading font-semibold text-foreground group-hover:text-primary">
          {company.name}
        </span>
        <span className="block whitespace-nowrap text-xs text-muted-foreground">
          {company.sector}
          {" · "}
          {company.openRoles > 0
            ? `${company.openRoles} open role${company.openRoles === 1 ? "" : "s"}`
            : `${company.roles} role${company.roles === 1 ? "" : "s"} listed`}
        </span>
      </span>
    </Link>
  </li>
);

/** Every company whose jobs are listed on AccessHire, straight from the intake data. */
const CompanySlider = () => {
  const { data, isLoading, error } = useJobFeed();
  const [paused, setPaused] = useState(false);
  const companies = useMemo(() => data?.companies ?? [], [data]);

  // Repeat short lists so one track is always wider than the viewport, then
  // render the track twice so the -50% translate loops seamlessly.
  const track = useMemo(() => {
    if (!companies.length) return [];
    const repeat = Math.max(1, Math.ceil(12 / companies.length));
    return Array.from({ length: repeat }, () => companies).flat();
  }, [companies]);

  if (error) return null;

  const duration = `${Math.max(30, track.length * 4)}s`;

  return (
    <section aria-labelledby="hiring-companies" className="border-y border-border/60 bg-card py-16">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="hiring-companies" className="text-3xl font-bold md:text-4xl">
              Companies hiring on AccessHire
            </h2>
            <p className="mt-2 text-muted-foreground">
              {data
                ? `${companies.length} employer${companies.length === 1 ? "" : "s"} committed to inclusive hiring, listing ${data.jobs.length} role${data.jobs.length === 1 ? "" : "s"}. Select a company to see its jobs.`
                : "Employers committed to inclusive hiring."}
            </p>
          </div>
          {companies.length > 0 && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-card px-4 text-sm font-medium text-muted-foreground shadow-soft transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:hidden"
            >
              {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              {paused ? "Play" : "Pause"} scrolling
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="container mt-8 flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-60 shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="container mt-8">
          <p className="flex items-center gap-2 rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-soft">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Employers are joining now — their companies will appear here as soon as they list a role.
          </p>
        </div>
      ) : (
        <div
          className="group/slider relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:[mask-image:none]"
          data-paused={paused || undefined}
        >
          <ul
            aria-label="Hiring companies"
            className="flex w-max gap-4 py-2 animate-marquee group-hover/slider:[animation-play-state:paused] group-focus-within/slider:[animation-play-state:paused] group-data-[paused]/slider:[animation-play-state:paused] motion-reduce:container motion-reduce:w-auto motion-reduce:animate-none motion-reduce:flex-wrap"
            style={{ animationDuration: duration }}
          >
            {track.map((c, i) => (
              // Only the first copy of each company is exposed to assistive tech.
              <CompanyChip key={`a-${c.id}-${i}`} company={c} hidden={i >= companies.length} />
            ))}
            {track.map((c, i) => (
              <CompanyChip key={`b-${c.id}-${i}`} company={c} hidden />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default CompanySlider;
