import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  NEURO_FEATURES,
  PATHWAY_NEURO,
  PATHWAY_PHYSICAL,
  PHYSICAL_FEATURES,
  WORK_TYPES,
  categoriesForPathway,
  type AccessFeature,
  type Pathway,
} from "@/lib/pathways";
import {
  emptyAccessNeeds,
  loadAccessNeeds,
  readLocalAccessNeeds,
  saveAccessNeeds,
  writeLocalAccessNeeds,
  type AccessNeeds,
} from "@/lib/accessNeeds";
import {
  Accessibility,
  ArrowRight,
  Brain,
  Check,
  Info,
  Layers,
  Loader2,
  MinusCircle,
} from "lucide-react";

type Choice = "physical" | "neuro" | "both" | "skip";

const choices: { key: Choice; title: string; body: string; icon: typeof Accessibility }[] = [
  {
    key: "physical",
    title: "Physical & sensory access needs",
    body: "Things like step-free access, seated work, screen readers, captions or accessible transport.",
    icon: Accessibility,
  },
  {
    key: "neuro",
    title: "Neurodivergent work-style needs",
    body: "Things like written instructions, quiet space, predictable routine or flexible breaks.",
    icon: Brain,
  },
  {
    key: "both",
    title: "Both",
    body: "Many people need both. We'll combine the two sets without repeating questions.",
    icon: Layers,
  },
  {
    key: "skip",
    title: "Prefer not to say / skip",
    body: "You'll still get full skills-based matching. You can add access needs any time.",
    icon: MinusCircle,
  },
];

const choiceFromPathways = (pathways: Pathway[], skipped: boolean): Choice | null => {
  if (skipped) return "skip";
  const p = pathways.includes(PATHWAY_PHYSICAL);
  const n = pathways.includes(PATHWAY_NEURO);
  if (p && n) return "both";
  if (p) return "physical";
  if (n) return "neuro";
  return null;
};

const pathwaysFromChoice = (choice: Choice): Pathway[] =>
  choice === "both"
    ? [PATHWAY_PHYSICAL, PATHWAY_NEURO]
    : choice === "physical"
      ? [PATHWAY_PHYSICAL]
      : choice === "neuro"
        ? [PATHWAY_NEURO]
        : [];

const OnboardingPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [needs, setNeeds] = useState<AccessNeeds>(emptyAccessNeeds);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const local = readLocalAccessNeeds();
    setNeeds(local);
    setChoice(local.completed ? choiceFromPathways(local.pathways, local.skipped) : null);
    if (!user?.id) return;
    loadAccessNeeds(user.id).then((remote) => {
      if (!remote) return;
      setNeeds(remote);
      setChoice(choiceFromPathways(remote.pathways, remote.skipped));
    });
  }, [user?.id]);

  const showPhysical = choice === "physical" || choice === "both";
  const showNeuro = choice === "neuro" || choice === "both";

  // "Both" must not duplicate the two shared features.
  const neuroFeatures = useMemo(
    () =>
      showPhysical
        ? NEURO_FEATURES.filter((f) => !PHYSICAL_FEATURES.some((p) => p.key === f.key))
        : NEURO_FEATURES,
    [showPhysical],
  );

  const toggle = (domain: "physical" | "neuro", key: string) =>
    setNeeds((prev) => {
      const list = prev[domain];
      return {
        ...prev,
        [domain]: list.includes(key) ? list.filter((k) => k !== key) : [...list, key],
      };
    });

  const pickChoice = (next: Choice) => {
    setChoice(next);
    setNeeds((prev) => ({
      ...prev,
      pathways: pathwaysFromChoice(next),
      physical: next === "physical" || next === "both" ? prev.physical : [],
      neuro: next === "neuro" || next === "both" ? prev.neuro : [],
      categories: prev.categories.filter((k) =>
        pathwaysFromChoice(next).some((p) => categoriesForPathway(p).some((c) => c.key === k)),
      ),
      workTypes: next === "physical" || next === "both" ? prev.workTypes : [],
      skipped: next === "skip",
    }));
  };

  const save = async () => {
    if (!choice) return;
    const payload: AccessNeeds = {
      ...needs,
      pathways: pathwaysFromChoice(choice),
      skipped: choice === "skip",
      completed: true,
    };
    setSaving(true);
    writeLocalAccessNeeds(payload);
    try {
      await saveAccessNeeds(user?.id ?? null, profile?.full_name ?? user?.email ?? "You", payload);
      setNeeds(payload);
      toast({
        title: "Preferences saved",
        description: "Your matches now account for the needs you selected.",
      });
      navigate("/jobs");
    } catch (e) {
      toast({
        title: "Could not save to your account",
        description: e instanceof Error ? e.message : "Your choices are kept on this device.",
        variant: "destructive",
      });
      navigate("/jobs");
    } finally {
      setSaving(false);
    }
  };

  const toggleList = (field: "categories" | "workTypes", key: string) =>
    setNeeds((prev) => {
      const list = prev[field];
      return { ...prev, [field]: list.includes(key) ? list.filter((k) => k !== key) : [...list, key] };
    });

  const Chips = ({
    label,
    hint,
    options,
    field,
  }: {
    label: string;
    hint: string;
    options: { key: string; label: string }[];
    field: "categories" | "workTypes";
  }) => (
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold">{label}</legend>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => {
          const active = needs[field].includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggleList(field, o.key)}
              className={`flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                active ? "bg-primary text-primary-foreground shadow-glow" : "bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  const FeatureGroup = ({
    id,
    title,
    intro,
    features,
    domain,
    children,
  }: {
    id: string;
    title: string;
    intro: string;
    features: AccessFeature[];
    domain: "physical" | "neuro";
    children?: React.ReactNode;
  }) => (
    <section aria-labelledby={id} className="surface-card mt-6 p-6 md:p-8">
      <h2 id={id} className="font-heading text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
      {children}
      <p className="mt-6 text-sm font-semibold">Workplace needs</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {features.map((f) => {
          const selected = needs[domain].includes(f.key);
          return (
            <button
              key={f.key}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => toggle(domain, f.key)}
              className={`flex min-h-16 items-start gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                selected
                  ? "border-primary bg-primary/5 shadow-soft"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
              </span>
              <span>
                <span className="block text-sm font-semibold">{f.label}</span>
                <span className="block text-xs text-muted-foreground">{f.help}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-surface pb-24">
      <div className="container max-w-4xl py-10">
        <div className="tint-panel p-6 md:p-10">
          <span className="pill bg-primary/10 text-primary">
            <Accessibility className="h-3.5 w-3.5" /> Step 2 of 3 · Access preferences
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight md:text-4xl">
            What should AccessHire account for when matching your work environment?
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Pick whatever fits. These pathways overlap — you can belong to both. We ask about
            workplace needs, never about diagnoses, and you never have to prove a disability.
          </p>
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Nothing you select here lowers your employability score or removes jobs from your
            results. It only changes how we describe how well an employer's environment fits you.
          </p>
        </div>

        <fieldset className="mt-6">
          <legend className="sr-only">Choose the pathways that apply to you</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {choices.map((c) => {
              const selected = choice === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => pickChoice(c.key)}
                  className={`surface-card flex min-h-32 flex-col items-start gap-3 p-6 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    selected ? "ring-2 ring-primary" : "hover:shadow-glow"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <c.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-heading text-lg font-bold">{c.title}</span>
                  <span className="text-sm text-muted-foreground">{c.body}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {showPhysical && (
          <FeatureGroup
            id="physical-module"
            domain="physical"
            title="Physical & sensory access needs"
            intro="Select what you want an employer's workplace to support. This is about the environment, not about you."
            features={PHYSICAL_FEATURES}
          >
            <Chips
              field="categories"
              label="Which of these describe you? (optional)"
              hint="Only used to show employers who say they are open to hiring people like you."
              options={categoriesForPathway(PATHWAY_PHYSICAL)}
            />
            <Chips
              field="workTypes"
              label="Which kinds of work are physically comfortable for you?"
              hint="We flag roles where you may want to ask about the physical demands. Nothing is hidden."
              options={WORK_TYPES.map((w) => ({ key: w.key, label: w.label }))}
            />
          </FeatureGroup>
        )}

        {showNeuro && (
          <FeatureGroup
            id="neuro-module"
            domain="neuro"
            title="Neurodivergent work-style needs"
            intro="Select the working practices that help you do your best work."
            features={neuroFeatures}
          >
            <Chips
              field="categories"
              label="Which of these describe you? (optional)"
              hint="Only used to show employers who say they are open to hiring people like you."
              options={categoriesForPathway(PATHWAY_NEURO)}
            />
          </FeatureGroup>
        )}

        {choice === "skip" && (
          <div className="surface-card mt-6 p-6 text-sm text-muted-foreground">
            No problem. You'll get skills-and-interests matching, and every job still shows its
            published accessibility information so you can judge for yourself.
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            className="rounded-full shadow-glow"
            disabled={!choice || saving}
            onClick={save}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Save and see my matches
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full"
            onClick={() => navigate("/assessments")}
          >
            Browse assessments first
          </Button>
        </div>
      </div>
    </main>
  );
};

export default OnboardingPage;
