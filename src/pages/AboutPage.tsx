import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Users } from "lucide-react";

const stats = [
  { icon: Brain, label: "[Cognitive Matching] placeholder", sub: "[description] placeholder" },
  { value: "[value] placeholder", label: "[Professionals Placed] placeholder" },
  { value: "[value] placeholder", label: "[Enterprise Partners] placeholder" },
];

const AboutPage = () => (
  <main className="min-h-screen bg-background">
    {/* Hero */}
    <section className="border-b border-border">
      <div className="container py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              🌐 Our Purpose
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
              Bridging the Gap<br />Between <span className="text-primary">Talent</span>
              <br />and <span className="text-primary">Opportunity</span>
            </h1>
            <p className="mt-5 max-w-md text-muted-foreground leading-relaxed">
              We believe everyone has a unique superpower. Our platform is designed to decode real-world strengths and map them to career paths where they can truly flourish. We're not just a job board; we're a bridge to your future.
            </p>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop"
              alt="Team collaboration in modern office"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>

    {/* Stats */}
    <section className="border-b border-border bg-secondary/30">
      <div className="container py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-6 shadow-card">
              {s.icon ? (
                <>
                  <s.icon className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-bold">{s.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold">{s.value}</span>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Story */}
    <section className="py-20">
      <div className="container max-w-3xl">
        <h2 className="text-center text-3xl font-bold">The AccessHire Story</h2>
        <p className="mt-6 text-muted-foreground leading-relaxed">
          AccessHire was founded on a simple realization: the traditional hiring process is broken. It prioritizes pedigree over potential, and checkboxes over character. We saw brilliant minds trapped in roles that didn't challenge them, while companies struggled to find the right talent for critical positions.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="aspect-[3/2] overflow-hidden rounded-xl">
            <img
              src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&auto=format&fit=crop"
              alt="Team meeting"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="aspect-[3/2] overflow-hidden rounded-xl">
            <img
              src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&auto=format&fit=crop"
              alt="Professional at work"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <p className="mt-8 text-muted-foreground leading-relaxed">
          In 2021, we set out to build a platform that speaks the language of ability. We combined behavioral science with advanced machine learning to create an assessment tool that doesn't just look at where you've been, but where you're capable of going.
        </p>
        <blockquote className="mt-8 border-l-4 border-primary pl-6 italic text-lg text-foreground/80">
          "Our mission is to ensure that no talent goes unnoticed and no opportunity goes unfulfilled."
        </blockquote>
      </div>
    </section>

    {/* Global Community */}
    <section className="border-t border-border bg-secondary/30 py-16">
      <div className="container text-center">
        <h2 className="text-3xl font-bold">A Global Community</h2>
        <p className="mt-2 text-muted-foreground">[Global Community description] placeholder</p>
        <div className="mt-8 overflow-hidden rounded-2xl">
          <img
            src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&auto=format&fit=crop"
            alt="World map representing global community"
            className="h-64 w-full object-cover md:h-80"
          />
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-card">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <div className="text-left">
            <p className="text-sm font-bold">San Francisco, CA</p>
            <p className="text-[10px] text-muted-foreground">Headquarters. Where the future of work is being engineered daily.</p>
          </div>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-12">
      <div className="container">
        <div className="rounded-3xl bg-foreground px-8 py-16 text-center md:px-16">
          <h2 className="text-3xl font-bold text-background md:text-4xl">Ready to bridge the gap?</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-background/70">
            Whether you're looking for your next career move or searching for your next star player, AccessHire is here to guide you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="outline" size="lg" className="border-background/20 text-background hover:bg-background/10">Hire Talent</Button>
            <Link to="/assessments"><Button variant="hero" size="lg">Find a Role</Button></Link>
          </div>
        </div>
      </div>
    </section>
  </main>
);

export default AboutPage;
