import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MatchScoreRing from "@/components/MatchScoreRing";
import MatchDetailDialog from "@/components/MatchDetailDialog";
import { resolveCandidate } from "@/lib/candidateProfile";
import {
  addInterest,
  listFavorites,
  listInterests,
  removeFavorite as deleteFavorite,
  removeInterest,
  type Favorite,
  type Interest,
} from "@/lib/userData";
import {
  runCandidateMatch,
  recommendationStyles,
  pct,
  type JobListing,
  type MatchResult,
} from "@/lib/matching";
import { Heart, Star, Trash2, ArrowRight, User, Briefcase, Target, RefreshCw } from "lucide-react";

const interestOptions = {
  "Work Type": ["Remote", "Hybrid", "On-site"],
  "Industry": ["Technology", "Healthcare", "Education", "Finance", "Creative Arts", "Government"],
  "Role Type": ["Full-time", "Part-time", "Freelance", "Internship"],
  "Skill Focus": ["Technical", "Creative", "Analytical", "Communication", "Leadership"],
};

const DashboardPage = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "matches" | "favorites" | "interests">("overview");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchJobs, setMatchJobs] = useState<JobListing[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [detail, setDetail] = useState<MatchResult | null>(null);

  const loadMatches = async () => {
    setMatchLoading(true);
    try {
      const data = await runCandidateMatch({ userId: user?.id });
      // Expired roles and roles with no vacancies are never recommended.
      setMatches((data.results ?? []).filter((r) => r.is_recommendable !== false));
      setMatchJobs(data.jobs ?? []);
    } catch {
      setMatches([]);
    } finally {
      setMatchLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [favs, ints] = await Promise.all([
        listFavorites(user.id).catch(() => [] as Favorite[]),
        listInterests(user.id).catch(() => [] as Interest[]),
      ]);
      setFavorites(favs);
      setInterests(ints);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    resolveCandidate(user.id).then((row) => {
      if (!row) return;
      setCandidateId(row.id);
      loadMatches();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const removeFavorite = async (id: string) => {
    await deleteFavorite(user!.id, id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const toggleInterest = async (category: string, value: string) => {
    const existing = interests.find((i) => i.category === category && i.value === value);
    if (existing) {
      await removeInterest(user!.id, existing.id);
      setInterests((prev) => prev.filter((i) => i.id !== existing.id));
    } else {
      const added = await addInterest(user!.id, category, value);
      setInterests((prev) => [...prev, added]);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  if (!user) return null;

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: User },
    { key: "matches" as const, label: "My Matches", icon: Target },
    { key: "favorites" as const, label: "Saved Jobs", icon: Heart },
    { key: "interests" as const, label: "My Interests", icon: Star },
  ];

  const strong = matches.filter((m) => m.recommendation === "Strong Match").length;
  const jobById = Object.fromEntries(matchJobs.map((j) => [j.id, j]));

  return (
    <main className="min-h-screen bg-background">
      <div className="container py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full border-2 border-primary object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                {(profile?.full_name || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{profile?.full_name || "Welcome"}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>Sign Out</Button>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-1 rounded-xl bg-secondary p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {tab === "overview" && (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <Briefcase className="h-8 w-8 text-primary" />
                <h3 className="mt-3 text-lg font-bold">Assessment</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile?.assessment_completed_at ? "Completed ✓" : "Not yet taken"}
                </p>
                <Link to="/assessments">
                  <Button variant="outline" size="sm" className="mt-4">
                    {profile?.assessment_completed_at ? "Retake" : "Start"} Assessment <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <Heart className="h-8 w-8 text-primary" />
                <h3 className="mt-3 text-lg font-bold">Saved Jobs</h3>
                <p className="mt-1 text-sm text-muted-foreground">{favorites.length} job{favorites.length !== 1 ? "s" : ""} saved</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setTab("favorites")}>
                  View Saved <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <Star className="h-8 w-8 text-primary" />
                <h3 className="mt-3 text-lg font-bold">Interests</h3>
                <p className="mt-1 text-sm text-muted-foreground">{interests.length} preference{interests.length !== 1 ? "s" : ""} set</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setTab("interests")}>
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {tab === "matches" && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">My Matches</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Scored live against every role employers have listed, using your assessment profile.
                  </p>
                </div>
                {candidateId && (
                  <Button variant="outline" size="sm" onClick={() => loadMatches()} disabled={matchLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${matchLoading ? "animate-spin" : ""}`} /> Re-run engine
                  </Button>
                )}
              </div>

              {!candidateId ? (
                <div className="mt-8 rounded-2xl border-2 border-dashed border-border p-12 text-center">
                  <Target className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-muted-foreground">
                    Complete the skill assessment and save your profile to unlock live matches.
                  </p>
                  <Link to="/assessments"><Button variant="outline" className="mt-4">Start Assessment</Button></Link>
                </div>
              ) : matchLoading ? (
                <div className="mt-6 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
              ) : (
                <>
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    {[
                      { label: "Roles scored", value: matches.length },
                      { label: "Strong matches", value: strong },
                      {
                        label: "Average fit",
                        value: matches.length
                          ? pct(matches.reduce((a, b) => a + b.match_score, 0) / matches.length)
                          : "—",
                      },
                    ].map((s) => (
                      <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                        <div className="text-2xl font-bold">{s.value}</div>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    {matches.slice(0, 10).map((r) => (
                      <button
                        key={r.job_id}
                        onClick={() => setDetail(r)}
                        className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:border-primary/40"
                      >
                        <MatchScoreRing value={r.match_score} size={48} />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold">{r.job_title}</h3>
                          <p className="truncate text-xs text-muted-foreground">
                            {r.company} · {jobById[r.job_id]?.location}
                          </p>
                        </div>
                        <span className={`pill shrink-0 ${recommendationStyles[r.recommendation]}`}>
                          {r.recommendation}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "favorites" && (
            <div>
              <h2 className="text-xl font-bold">Saved Jobs</h2>
              <p className="mt-1 text-sm text-muted-foreground">Jobs you've bookmarked for later</p>
              {favorites.length === 0 ? (
                <div className="mt-8 rounded-2xl border-2 border-dashed border-border p-12 text-center">
                  <Heart className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-muted-foreground">No saved jobs yet</p>
                  <Link to="/jobs"><Button variant="outline" className="mt-4">Browse Jobs</Button></Link>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {favorites.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card">
                      <div>
                        <h3 className="font-semibold">{f.job_title}</h3>
                        {f.company_name && <p className="text-xs text-muted-foreground">{f.company_name}</p>}
                        <p className="text-xs text-muted-foreground">Saved {new Date(f.created_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => removeFavorite(f.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" aria-label="Remove from favorites">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "interests" && (
            <div>
              <h2 className="text-xl font-bold">My Interests</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select preferences to improve job recommendations</p>
              <div className="mt-6 space-y-8">
                {Object.entries(interestOptions).map(([category, options]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{category}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {options.map((opt) => {
                        const isSelected = interests.some((i) => i.category === category && i.value === opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleInterest(category, opt)}
                            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${isSelected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-foreground"}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

export default DashboardPage;
