import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmployerShortlist from "@/components/EmployerShortlist";
import EmployerDataSync from "@/components/EmployerDataSync";
import JobPostingForm from "@/components/JobPostingForm";
import { Lightbulb, TrendingUp, Users } from "lucide-react";

const stats = [
  { label: "Retention rate", value: "89%", change: "+31%", sub: "Average 24-month retention across inclusive hires on AccessHire." },
  { label: "Time to shortlist", value: "3 days", change: "−72%", sub: "From role posted to a ranked, accessibility-verified shortlist." },
  { label: "Talent ROI", value: "1.9x", change: "+90%", sub: "Productivity gain reported by teams hiring on skills-first data." },
];

const benefits = [
  { icon: Lightbulb, title: "Broader perspectives", desc: "Teams that hire across different ways of working solve problems from angles your competitors never see." },
  { icon: TrendingUp, title: "Better innovation", desc: "Skills-first scoring surfaces capable candidates who traditional keyword screening filters out on day one." },
  { icon: Users, title: "Higher engagement", desc: "When accommodations are matched up front, new hires ramp faster and stay significantly longer." },
];

const EmployerPage = () => (
  <main className="min-h-screen bg-background">
    {/* Hero */}
    <section className="border-b border-border">
      <div className="container py-16 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              The Future of Talent Acquisition
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">
              Hire for <span className="text-primary">Potential</span>,<br />Not Just Pedigree
            </h1>
            <p className="mt-5 max-w-md text-muted-foreground leading-relaxed">
              Unlock a diverse talent pool by shifting to skill-based hiring. Build more inclusive, high-performing teams with AccessHire's data-driven matching engine.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup"><Button variant="hero" size="lg">Post Inclusive Jobs</Button></Link>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const subject = encodeURIComponent("Partnership Inquiry – AccessHire");
                  const body = encodeURIComponent("Hi AccessHire,\n\nI'm interested in partnering with your platform for inclusive hiring.\n\nCompany: \nHow we'd like to collaborate: \n\nThank you.");
                  window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=jaidevgulati15@gmail.com&su=${subject}&body=${body}`, "_blank");
                }}
              >
                Partner With Us
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop"
                alt="Diverse team collaborating"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 left-6 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-card">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <span className="text-xl font-bold">+42%</span>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Diversity increase</p>
              </div>
            </div>
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
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold">{s.value}</span>
                <span className="text-xs font-semibold text-primary">{s.change}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Structured accessibility job posting */}
    <JobPostingForm />

    {/* Live matching pipeline */}
    <EmployerDataSync />

    <EmployerShortlist />

    {/* Strategic Advantage */}
    <section className="py-20">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-2 items-start">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Strategic Advantage</span>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">
              The Real Impact of<br />Inclusive Hiring
            </h2>
          </div>
          <p className="text-muted-foreground leading-relaxed md:pt-8">
            Inclusive hiring isn't just the right thing to do; it's a strategic business advantage that directly impacts your bottom line.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {benefits.map((b, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-6 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-12">
      <div className="container">
        <div className="rounded-3xl bg-foreground px-8 py-16 text-center md:px-16">
          <h2 className="text-3xl font-bold text-background md:text-4xl">Ready to transform your workforce?</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-background/70">
            Post a role, define the accommodations you genuinely support, and get a ranked shortlist scored on real capability within days.
          </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup"><Button variant="hero" size="lg">Start Posting Now</Button></Link>
              <Button
                variant="outline"
                size="lg"
                className="border-background/20 text-background hover:bg-background/10"
                onClick={() => {
                  const subject = encodeURIComponent("Employer Inquiry – AccessHire");
                  const body = encodeURIComponent("Hi AccessHire,\n\nI'd like to learn more about posting inclusive jobs on your platform.\n\nCompany: \nRole(s) I'm hiring for: \nAdditional details: \n\nThank you.");
                  window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=jaidevgulati15@gmail.com&su=${subject}&body=${body}`, "_blank");
                }}
              >
                Schedule a Demo
              </Button>
            </div>
        </div>
      </div>
    </section>
  </main>
);

export default EmployerPage;
