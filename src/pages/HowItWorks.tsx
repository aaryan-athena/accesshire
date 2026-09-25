import { UserPlus, ClipboardCheck, Briefcase, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: UserPlus,
    title: "Create Your Profile",
    desc: "Sign up in minutes. Tell us about your strengths, preferences, work style, and accessibility needs. No assumptions — just you.",
  },
  {
    icon: ClipboardCheck,
    title: "Complete Skill Assessments",
    desc: "Take short, accessible assessments covering logical thinking, communication, creativity, technology skills, and more.",
  },
  {
    icon: Briefcase,
    title: "Get Matched to Jobs",
    desc: "Our matching engine analyzes your skill profile and recommends careers where you'll thrive — not where bias says you should be.",
  },
  {
    icon: TrendingUp,
    title: "Improve & Grow",
    desc: "Receive personalized training suggestions and resources to strengthen your profile and unlock even more opportunities.",
  },
];

const HowItWorks = () => (
  <main className="py-20">
    <div className="container">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold md:text-5xl">How AccessHire Works</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A simple, accessible process designed to highlight what you can do — and connect you with employers who value it.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-3xl space-y-8">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-6 rounded-xl border border-border bg-background p-6 shadow-card">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <step.icon className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">Step {i + 1}</div>
              <h2 className="mt-1 text-xl font-bold">{step.title}</h2>
              <p className="mt-2 text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 text-center">
        <Link to="/signup">
          <Button variant="hero" size="xl">
            Get Started <ArrowRight className="ml-1 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  </main>
);

export default HowItWorks;
