import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { COLLECTIONS, db } from "@/integrations/firebase/client";
import { NEURO_FEATURES, PHYSICAL_FEATURES, type AccessFeature } from "@/lib/pathways";
import { EMPLOYER_PWD_CATEGORIES, JOB_CATEGORIES, JOB_CATEGORY_NAMES, WORK_MODES } from "@/lib/canonical";
import { PORTAL_SOURCE_SYSTEM } from "@/lib/intakeAdapter";
import { JOB_FEED_KEY } from "@/lib/jobs";
import { Accessibility, Brain, HeartHandshake, Info, Loader2, Plus } from "lucide-react";

type Support = "Yes" | "Partial" | "No" | "Unstated";
const SUPPORTS: Support[] = ["Yes", "Partial", "No", "Unstated"];
const SUPPORT_COPY: Record<Support, string> = {
  Yes: "Offered",
  Partial: "Partly",
  No: "Not offered",
  Unstated: "Not stated",
};

/** Same vocabularies as the employer intake form (form/src/data/constants.js). */
const EXPERIENCE_LEVELS = ["Fresher", "Junior", "Mid-level", "Senior"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Contract"];

const blank = (features: AccessFeature[]) =>
  Object.fromEntries(features.map((f) => [f.key, "Unstated" as Support]));

const selectClass = "mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

const initialForm = {
  companyName: "",
  companyWebsite: "",
  contactEmail: "",
  industry: "",
  workModel: "On-site",
  hiringCities: "",
  jobTitle: "",
  jobCategory: JOB_CATEGORY_NAMES[0],
  department: "",
  experienceLevel: "Fresher",
  employmentType: "Full-time",
  education: "",
  vacancies: "1",
  applicationDeadline: "",
  salaryMin: "",
  salaryMax: "",
  workingHours: "",
  jobDescription: "",
};

const JobPostingForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [pwdCategories, setPwdCategories] = useState<string[]>([]);
  const [physical, setPhysical] = useState<Record<string, Support>>(blank(PHYSICAL_FEATURES));
  const [neuro, setNeuro] = useState<Record<string, Support>>(blank(NEURO_FEATURES));

  const set = (key: keyof typeof initialForm, value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: value,
      // Changing the category invalidates the department, as on the intake form.
      ...(key === "jobCategory" ? { department: "" } : {}),
    }));

  const stated = (values: Record<string, Support>) =>
    Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "Unstated"));

  const willing = (key: string, values: Record<string, Support>) =>
    values[key] === "Unstated" ? "" : values[key] === "No" ? "No" : "Yes";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({
        title: "Sign in to post a role",
        description: "Employer listings are tied to your AccessHire account.",
      });
      return;
    }
    setSaving(true);
    try {
      // Stored in the intake form's own shape so both sources share one pipeline.
      await addDoc(collection(db, COLLECTIONS.companies), {
        source: PORTAL_SOURCE_SYSTEM,
        employerId: user.id,
        companyName: form.companyName.trim(),
        companyWebsite: form.companyWebsite.trim(),
        contactEmail: form.contactEmail.trim() || user.email || "",
        industries: form.industry.trim() ? [form.industry.trim()] : [],
        workModel: form.workModel,
        hiringCities: form.hiringCities.split(",").map((c) => c.trim()).filter(Boolean),
        pwdCategories,
        hiresPWD: pwdCategories.length ? "Yes" : "",
        willingBlind: willing("screen_reader", physical),
        willingNeurodivergent: Object.values(stated(neuro)).some((v) => v !== "No")
          ? "Yes"
          : Object.keys(stated(neuro)).length
            ? "No"
            : "",
        jobs: [
          {
            jobTitle: form.jobTitle.trim(),
            jobCategory: form.jobCategory,
            department: form.department,
            experienceLevel: form.experienceLevel,
            employmentType: form.employmentType,
            education: form.education.trim(),
            vacancies: form.vacancies,
            applicationDeadline: form.applicationDeadline,
            salaryMin: form.salaryMin.trim(),
            salaryMax: form.salaryMax.trim(),
            workingHours: form.workingHours.trim(),
            jobDescription: form.jobDescription.trim(),
            applicationMethod: "AccessHire Platform",
            physicalAccess: stated(physical),
            neuroPractices: stated(neuro),
          },
        ],
        createdAt: serverTimestamp(),
      });
      await queryClient.invalidateQueries({ queryKey: JOB_FEED_KEY });
      toast({
        title: "Role posted",
        description: "It's live on the jobs page and candidates are being matched against it now.",
      });
      setForm((prev) => ({ ...initialForm, companyName: prev.companyName, companyWebsite: prev.companyWebsite, contactEmail: prev.contactEmail, industry: prev.industry, workModel: prev.workModel, hiringCities: prev.hiringCities }));
      setPhysical(blank(PHYSICAL_FEATURES));
      setNeuro(blank(NEURO_FEATURES));
    } catch (err) {
      toast({
        title: "Could not post the role",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const AccessSection = ({
    title,
    intro,
    icon: Icon,
    features,
    values,
    setValues,
  }: {
    title: string;
    intro: string;
    icon: typeof Accessibility;
    features: AccessFeature[];
    values: Record<string, Support>;
    setValues: (v: Record<string, Support>) => void;
  }) => (
    <fieldset className="mt-8 rounded-2xl border border-border bg-card p-5">
      <legend className="flex items-center gap-2 px-2 font-heading text-base font-bold">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </legend>
      <p className="text-sm text-muted-foreground">{intro}</p>
      <div className="mt-4 space-y-2">
        {features.map((f) => (
          <div
            key={f.key}
            className="flex flex-col gap-2 rounded-xl bg-surface px-3 py-2.5 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="text-sm font-medium">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.help}</p>
            </div>
            <div role="radiogroup" aria-label={`${title}: ${f.label}`} className="flex shrink-0 gap-1">
              {SUPPORTS.map((s) => {
                const active = values[f.key] === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setValues({ ...values, [f.key]: s })}
                    className={`min-h-9 rounded-full px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      active
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-card text-muted-foreground shadow-soft hover:text-foreground"
                    }`}
                  >
                    {SUPPORT_COPY[s]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );

  const field = (id: keyof typeof initialForm, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={form[id]} onChange={(e) => set(id, e.target.value)} className="mt-2" {...props} />
    </div>
  );

  const select = (id: keyof typeof initialForm, label: string, options: readonly string[]) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} className={selectClass} value={form[id]} onChange={(e) => set(id, e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );

  return (
    <section aria-labelledby="post-a-role" className="border-b border-border bg-surface">
      <div className="container py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Job posting
            </span>
            <h2 id="post-a-role" className="mt-3 font-heading text-3xl font-bold tracking-tight">
              Post a role with structured accessibility
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              List the accommodations and environment features you actually offer. Candidates match
              on those specifics — never on labels like "good for ADHD".
            </p>
          </div>
          <Button
            size="lg"
            className="rounded-full shadow-glow"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {open ? "Hide the posting form" : "Open the posting form"}
          </Button>
        </div>

        {open && (
          <form onSubmit={submit} className="surface-card mt-8 p-6 md:p-8">
            <p className="mb-6 flex items-start gap-2 rounded-2xl bg-primary/5 p-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Describe the workplace, not the person. "Not stated" is honest — candidates see it as
              "access information unavailable" rather than a refusal.
            </p>

            <h3 className="font-heading text-base font-bold">Company</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {field("companyName", "Company name", { required: true })}
              {field("companyWebsite", "Company website", { placeholder: "https://", type: "url" })}
              {field("contactEmail", "Hiring email", { type: "email", placeholder: user?.email ?? "hr@company.com" })}
              {field("industry", "Industry", { placeholder: "e.g. Manufacturing" })}
              {select("workModel", "Work model", WORK_MODES)}
              {field("hiringCities", "Hiring cities", { placeholder: "e.g. Delhi (NCR), Gurugram" })}
            </div>

            <h3 className="mt-8 font-heading text-base font-bold">Role</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {field("jobTitle", "Job title", { required: true })}
              <div className="grid grid-cols-2 gap-4">
                {select("jobCategory", "Job category", JOB_CATEGORY_NAMES)}
                <div>
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    className={selectClass}
                    value={form.department}
                    onChange={(e) => set("department", e.target.value)}
                  >
                    <option value="">Select department</option>
                    {[...(JOB_CATEGORIES[form.jobCategory] ?? []), "Other"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {select("experienceLevel", "Experience level", EXPERIENCE_LEVELS)}
                {select("employmentType", "Employment type", EMPLOYMENT_TYPES)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {field("vacancies", "Vacancies", { type: "number", min: 0 })}
                {field("applicationDeadline", "Application deadline", { type: "date" })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {field("salaryMin", "Salary (minimum)", { placeholder: "e.g. 3,00,000" })}
                {field("salaryMax", "Salary (maximum)", { placeholder: "e.g. 4,50,000" })}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {field("education", "Education", { placeholder: "e.g. 12th pass, B.Com" })}
                {field("workingHours", "Working hours", { placeholder: "e.g. 9 AM – 6 PM" })}
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="jobDescription">Role summary</Label>
              <Textarea
                id="jobDescription"
                rows={3}
                value={form.jobDescription}
                onChange={(e) => set("jobDescription", e.target.value)}
                className="mt-2"
              />
            </div>

            <fieldset className="mt-8 rounded-2xl border border-border bg-card p-5">
              <legend className="flex items-center gap-2 px-2 font-heading text-base font-bold">
                <HeartHandshake className="h-4 w-4 text-primary" aria-hidden="true" />
                Who you're open to hiring
              </legend>
              <p className="text-sm text-muted-foreground">
                Candidates who share a category can filter for employers open to them.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {EMPLOYER_PWD_CATEGORIES.map((c) => (
                  <label key={c} className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-primary"
                      checked={pwdCategories.includes(c)}
                      onChange={(e) =>
                        setPwdCategories((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>
            </fieldset>

            <AccessSection
              title="A. Physical & sensory accessibility offered"
              intro="Environment and equipment facts candidates can rely on."
              icon={Accessibility}
              features={PHYSICAL_FEATURES}
              values={physical}
              setValues={setPhysical}
            />

            <AccessSection
              title="B. Neurodivergent-friendly work practices offered"
              intro="How the team actually works day to day."
              icon={Brain}
              features={NEURO_FEATURES}
              values={neuro}
              setValues={setNeuro}
            />

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" className="rounded-full shadow-glow" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Publish role
              </Button>
              {!user && (
                <p className="text-sm text-muted-foreground">Sign in to publish this listing.</p>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default JobPostingForm;
