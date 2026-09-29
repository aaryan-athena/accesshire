import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-illustration.png";
import CompanySlider from "@/components/CompanySlider";
import { useJobFeed } from "@/lib/jobs";
import { isRecommendable } from "@/lib/canonical";
import {
  UserPlus, ClipboardCheck, Briefcase, TrendingUp,
  Eye, Keyboard, SunMoon, Captions, MessageSquareText, LayoutList,
  ChevronDown, Star, Building2, Brain, Accessibility, Users, HeartHandshake, ShieldCheck, MapPin
} from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Create Profile", desc: "Sign up and tell us about your strengths, preferences, and goals." },
  { icon: ClipboardCheck, title: "Skill Assessment", desc: "Complete bite-sized assessments designed around your abilities." },
  { icon: Briefcase, title: "Get Matched", desc: "Our engine recommends careers that fit your unique skill profile." },
  { icon: TrendingUp, title: "Grow & Learn", desc: "Access training recommendations to level up your career path." },
];

const accessFeatures = [
  { icon: Eye, title: "Screen Reader Friendly", desc: "Full ARIA labels and semantic HTML throughout." },
  { icon: Keyboard, title: "Keyboard Navigation", desc: "Every feature accessible via keyboard alone." },
  { icon: SunMoon, title: "High Contrast Mode", desc: "Enhanced visibility for low-vision users." },
  { icon: Captions, title: "Captions & Transcripts", desc: "All video and audio content is captioned." },
  { icon: MessageSquareText, title: "Text-First Communication", desc: "No audio-only or visual-only gating." },
  { icon: LayoutList, title: "Clean Readable Layout", desc: "Simple, uncluttered design with generous spacing." },
];

const assessmentMethods = [
  {
    category: "Neurodivergent",
    to: "/assessments/neurodivergent",
    icon: Brain,
    methods: [
      "For autistic people, ADHD, dyslexia, dyscalculia, dyspraxia and intellectual disability",
      "Shared skills core: practical tasks, work situations and interests",
      "How you work best: instructions, environment, routine and focus",
      "Sensory, communication and processing-time supports",
      "Matched to employers open to neurodivergent hires",
    ],
  },
  {
    category: "Physical & Sensory Disability",
    to: "/assessments/physical-sensory",
    icon: Accessibility,
    methods: [
      "For physical and mobility disability, blind / low vision, deaf / hard of hearing",
      "Shared skills core: practical tasks, work situations and interests",
      "Access needs: step-free, screen reader, captions, sign language, dexterity",
      "The kinds of work that suit you physically",
      "Matched to employers open to your disability category",
    ],
  },
];

const faqs = [
  { q: "Is AccessHire free to use?", a: "Yes, our core platform is completely free for job seekers. Employers pay for premium posting features." },
  { q: "What types of disabilities do you support?", a: "AccessHire has two assessments: one for neurodivergent people (autism, ADHD, dyslexia and related conditions, and intellectual disability) and one for people with physical and sensory disabilities (mobility, vision and hearing). Many people take both." },
  { q: "How does skill matching work?", a: "Our assessments evaluate real-world skills like logic, communication, creativity, and technical ability — then match them to job requirements." },
  { q: "Is my data safe?", a: "Absolutely. We use industry-standard encryption and never share your personal data with employers without consent." },
];

const LandingPage = () => {
  const { data, isLoading: feedLoading } = useJobFeed();
  const openRoles = data?.jobs.filter((j) => isRecommendable(j.availability_status)).length;
  // These two are both counted over the same "employers listed" universe (named
  // companies only), so the numbers never contradict each other on the page.
  const pledgedEmployers = data?.companies.filter((c) => c.pledgeAccepted).length;
  const withAccessInfo = data?.jobs.filter(
    (j) => Object.keys(j.physical_access ?? {}).length > 0 || Object.keys(j.neuro_practices ?? {}).length > 0,
  ).length;
  const cityCount = data ? new Set(data.jobs.flatMap((j) => j.cities ?? [])).size : undefined;

  const platformStats = [
    { icon: Briefcase, value: openRoles, label: "open roles right now" },
    { icon: Building2, value: data?.companies.length, label: "employers listed" },
    { icon: HeartHandshake, value: pledgedEmployers, label: "pledged to hire PWD candidates" },
    { icon: ShieldCheck, value: withAccessInfo, label: "roles with published access info" },
    { icon: MapPin, value: cityCount, label: "cities with open roles" },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface">
        <div className="pointer-events-none absolute -left-40 top-[-10rem] h-96 w-96 rounded-full bg-surface-tint-strong/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-32 top-40 h-80 w-80 rounded-full bg-surface-tint/80 blur-3xl" aria-hidden="true" />
        <div className="container relative flex flex-col items-center gap-12 py-20 md:flex-row md:py-28">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="inline-block rounded-full bg-card px-4 py-1.5 text-xs font-semibold text-primary shadow-soft">
              Ability First · Inclusive Hiring
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Find careers based on your{" "}
              <span className="text-primary">skills</span>, not your limitations.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              AccessHire evaluates your strengths and matches you with real career opportunities. Fair, accessible, skill-based job matching for everyone.
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <Link to="/assessments"><Button variant="hero" size="xl" className="rounded-full shadow-glow">Take the Skills Assessment</Button></Link>
              <Link to="/jobs"><Button variant="hero-outline" size="xl" className="rounded-full bg-card shadow-soft">Browse Careers</Button></Link>
            </div>
            <div className="flex items-center justify-center gap-6 pt-2 text-sm text-muted-foreground md:justify-start">
              {data ? (
                <>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" aria-hidden="true" /> {openRoles} open role{openRoles === 1 ? "" : "s"}
                  </span>
                  <span>{data.companies.length} inclusive employer{data.companies.length === 1 ? "" : "s"}</span>
                </>
              ) : (
                <span>Live jobs from inclusive employers</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="mx-auto max-w-md rounded-4xl bg-card p-6 shadow-card animate-fade-in-up">
              <img src={heroImage} alt="Diverse team collaborating in an inclusive workplace" className="w-full animate-float" />
            </div>
          </div>
        </div>
      </section>

      {/* Companies hiring — live from employer intake */}
      <CompanySlider />

      {/* How It Works */}
      <section id="how-it-works" className="bg-surface-tint py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">How It Works</h2>
            <p className="mt-3 text-muted-foreground">Four simple steps to your next career opportunity.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div key={i} className="surface-card surface-card-hover group p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">Step {i + 1}</div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assessment Methods */}
      <section className="bg-surface py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Evidence-Based Assessments</h2>
            <p className="mt-3 text-muted-foreground">Two assessments — one for each group we serve — so your matches account for the right things.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {assessmentMethods.map((cat, i) => (
              <div key={i} className="surface-card surface-card-hover min-w-0 p-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                    <cat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">{cat.category}</h3>
                </div>
                <ul className="space-y-2">
                  {cat.methods.map((m, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {m}
                    </li>
                  ))}
                </ul>
                <Link to={cat.to} className="mt-5 inline-block">
                  <Button className="h-auto min-h-10 whitespace-normal rounded-full py-2 text-left">Start the {cat.category.toLowerCase()} assessment</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accessibility */}
      <section className="bg-surface-tint py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Accessibility at the Core</h2>
            <p className="mt-3 text-muted-foreground">Not an afterthought — accessibility is built into every pixel.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {accessFeatures.map((f, i) => (
              <div key={i} className="surface-card surface-card-hover flex gap-4 p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Employers CTA */}
      <section className="bg-surface py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-4xl bg-foreground p-10 text-center text-background shadow-card md:p-14">
            <Building2 className="mx-auto mb-4 h-10 w-10 opacity-80" />
            <h2 className="text-3xl font-bold">Hire Smarter, Hire Inclusively</h2>
            <p className="mx-auto mt-3 max-w-lg text-background/70">
              Access a pre-vetted talent pool matched by skills, not assumptions. Reduce bias and discover top performers you'd otherwise miss.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/employers"><Button variant="secondary" size="lg" className="rounded-full">For Employers</Button></Link>
              <Link to="/employers"><Button variant="ghost" size="lg" className="rounded-full text-background hover:bg-background/10 hover:text-background">Partner With Us</Button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Platform at a glance — live numbers, not testimonials, since AccessHire has no
          reviews to publish yet. Updates automatically as employers and roles are added. */}
      <section aria-labelledby="platform-glance" className="bg-surface-tint py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <span className="pill mx-auto bg-primary/10 text-primary">
              <Users className="h-3.5 w-3.5" /> Live platform data
            </span>
            <h2 id="platform-glance" className="mt-4 text-3xl font-bold md:text-4xl">AccessHire, right now</h2>
            <p className="mt-3 text-muted-foreground">
              We're a new platform, so instead of quotes we can't yet back up, here's what's
              actually listed today.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {platformStats.map((s, i) => (
              <div key={i} className="surface-card surface-card-hover flex flex-col items-center p-6 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="text-2xl font-bold tabular-nums">{feedLoading ? "–" : s.value ?? 0}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* FAQ */}
      <section className="bg-surface py-20">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Frequently Asked Questions</h2>
          <div className="mt-10 space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group surface-card p-5">
                <summary className="flex cursor-pointer items-center justify-between font-semibold">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;
