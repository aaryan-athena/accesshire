// Real-employer edge cases, taken from actual intake-form records.
import { describe, expect, it } from "vitest";
import {
  cleanJobTitle,
  computeAvailability,
  computeConfidence,
  deadlineLabel,
  isRecommendable,
  parseDeadline,
  parseVacancies,
  toInterestArea,
} from "@/lib/canonical";
import { mapCompanies, mapIntakeJob, resolveCompanyName } from "@/lib/intakeAdapter";
import { employerOpenness, scorePair, workTypeFit, type CandidateProfile, type JobListing } from "@/lib/matcher";
import { salaryFloor } from "@/lib/matching";

const TODAY = "2026-08-25";

describe("field normalization", () => {
  it("punctuation-only titles are rejected, not cleaned into nonsense", () => {
    expect(cleanJobTitle("· /")).toEqual({ title: null, additional: [] });
    expect(cleanJobTitle("   ")).toEqual({ title: null, additional: [] });
    expect(cleanJobTitle(" Marketing Manager ")).toEqual({ title: "Marketing Manager", additional: [] });
  });

  it("several roles typed into one title field are split, none invented", () => {
    const out = cleanJobTitle("Computer Operator, Sewing Machine Operator / Packer");
    expect(out.title).toBe("Computer Operator");
    expect(out.additional).toEqual(["Sewing Machine Operator", "Packer"]);
  });

  it("all-caps titles are tidied, mixed case is left alone", () => {
    expect(cleanJobTitle("MARKETIGN MANAGER").title).toBe("Marketign Manager");
    expect(cleanJobTitle("QA Lead").title).toBe("QA Lead");
  });

  it("vacancies parse exactly: 0 stays 0, blank stays unknown", () => {
    expect(parseVacancies("2")).toBe(2);
    expect(parseVacancies("0")).toBe(0);
    expect(parseVacancies("")).toBeNull();
    expect(parseVacancies(undefined)).toBeNull();
    expect(parseVacancies("1,0")).toBe(10);
  });

  it("deadlines: blank stays 'Not provided', never invented", () => {
    expect(parseDeadline("")).toBeNull();
    expect(deadlineLabel(null, TODAY)).toBe("Not provided");
    expect(parseDeadline("2026-09-30")).toBe("2026-09-30");
    expect(parseDeadline("30/09/2026")).toBe("2026-09-30");
  });

  it("availability follows the employer's own numbers", () => {
    expect(computeAvailability("2026-08-24", 3, TODAY)).toBe("Expired");
    expect(computeAvailability("2026-08-25", 3, TODAY)).toBe("Closes today");
    expect(computeAvailability("2026-09-30", 3, TODAY)).toBe("Open");
    expect(computeAvailability(null, null, TODAY)).toBe("Open");
    expect(computeAvailability("2026-09-30", 0, TODAY)).toBe("No vacancies");
    expect(isRecommendable("Closes today")).toBe(true);
    expect(isRecommendable("Expired")).toBe(false);
    expect(isRecommendable("No vacancies")).toBe(false);
  });

  it("short aliases only match whole words", () => {
    // "it" must not match inside "Quality" / "Retails"
    expect(toInterestArea("Quality")).toBe("Quality Assurance");
    expect(toInterestArea("Retails leasing and Mall operations")).toBe("Operations");
    expect(toInterestArea("IT support")).toBe("Engineering / Software");
  });

  it("salary floors sort Indian-format figures", () => {
    expect(salaryFloor("4,00,000 – 6,00,000")).toBe(400000);
    expect(salaryFloor("5 LPA")).toBe(500000);
    expect(salaryFloor("$48k – $60k")).toBe(48000);
    expect(salaryFloor(null)).toBe(0);
  });

  it("confidence reflects what the employer actually provided", () => {
    const sparse = computeConfidence({
      job_title: "Packer",
      location: "Delhi (NCR)",
      physical_access: {},
      neuro_practices: {},
      vacancies: null,
    });
    expect(sparse.level).toBe("Low");
    expect(sparse.missing).toContain("Salary");

    const rich = computeConfidence({
      job_title: "Marketing Manager",
      location: "Delhi (NCR)",
      description: "Find new garment manufacturers.",
      salary_range: "5,00,000 – 10,00,000",
      employment_type: "Full-time",
      working_hours: "10-6",
      vacancies: 2,
      application_deadline: "2026-09-30",
      apply_contact: "hr@example.com",
      edu_level_stated: true,
      physical_access: { step_free: "Partial" },
      neuro_practices: { written_instructions: "Partial" },
    });
    expect(rich.level).toBe("High");
    expect(rich.score).toBeGreaterThan(sparse.score);
  });
});

const STL = {
  companyName: "STL Global Ltd.",
  workModel: "On-site",
  hiringCities: ["Delhi (NCR)"],
  industries: ["Manufacturing"],
  pwdCategories: ["Physical Disability (locomotor)"],
  willingBlind: "No",
  willingNeurodivergent: "No",
  pwdQuota: "No",
  contactEmail: "hr@example.com",
};

describe("intake adapter", () => {
  it("maps a real record end-to-end", () => {
    const job = mapIntakeJob(
      "abc",
      STL,
      {
        jobTitle: "Marketing Manager",
        department: "Marketing",
        experienceLevel: "Mid-level",
        employmentType: "Full-time",
        salaryMin: "5,00,000",
        salaryMax: "10,00,000",
        vacancies: "2",
        applicationDeadline: "",
        workingHours: "10-6",
        jobCategory: "White Collar (Desk Jobs)",
        jobDescription: "Find new garment manufacturers.",
      },
      0,
      TODAY,
    );

    expect(job.id).toBe("abc#0");
    expect(job.job_title).toBe("Marketing Manager");
    expect(job.vacancies).toBe(2);
    expect(job.application_deadline).toBeNull();
    expect(job.availability_status).toBe("Open");
    expect(job.working_hours).toBe("10-6");
    expect(job.job_category).toBe("White Collar (Desk Jobs)");
    expect(job.cities).toEqual(["Delhi (NCR)"]);
    expect(job.interest_areas).toContain("Marketing");
    // Employer-confirmed "No" is recorded with its provenance, never softened.
    expect(job.physical_access.screen_reader).toBe("No");
    expect(job.access_provenance.screen_reader.basis).toBe("employer_confirmed");
    expect(job.access_provenance.remote_hybrid.basis).toBe("derived");
    expect(job.inclusion.pwd_categories).toEqual(["Physical Disability (locomotor)"]);
    expect(job.validation_status).toBe("warning");
  });

  it("a record with no usable title is rejected, not guessed", () => {
    const { jobs, rejected } = mapCompanies(
      [{ id: "junk", data: { companyName: "MKM Ventures", jobs: [{ jobTitle: "· /" }] } }],
      TODAY,
    );
    expect(jobs).toHaveLength(0);
    expect(rejected[0].errors.some((e) => e.includes("job_title"))).toBe(true);
  });

  it("a blank company name falls back to the employer's own domain, never a guess", () => {
    expect(resolveCompanyName({ companyName: "  Acme  Ltd " })).toEqual({ name: "Acme Ltd", source: "stated" });
    expect(
      resolveCompanyName({ companyName: "", companyWebsite: "https://www.example.co.in/?utm_term=x" }),
    ).toEqual({ name: "example.co.in", source: "derived" });
    expect(resolveCompanyName({ companyName: "", contactEmail: "hr@platinumtower.in" })).toEqual({
      name: "platinumtower.in",
      source: "derived",
    });
    expect(resolveCompanyName({ companyName: "", contactEmail: "someone@gmail.com" })).toEqual({
      name: "",
      source: "derived",
    });

    // Still listed, with a warning — the role itself is real.
    const { jobs } = mapCompanies(
      [{ id: "x", data: { companyName: "", jobs: [{ jobTitle: "Electrical Engineer", department: "Engineering" }] } }],
      TODAY,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].validation_errors).toContain("employer did not state a company name");
  });

  it("older records without a job category get one from the department, labelled derived", () => {
    const job = mapIntakeJob("m", { companyName: "MIRA" }, { jobTitle: "Production manager", department: "Operations" }, 0, TODAY);
    expect(job.job_category).toBe("White Collar (Desk Jobs)");
    expect(job.job_category_source).toBe("derived");

    const unknown = mapIntakeJob("m", { companyName: "MKM" }, { jobTitle: "Restaurant Manager", department: "Other" }, 0, TODAY);
    expect(unknown.job_category).toBeNull();
  });

  it("roles posted on the portal keep their explicit access answers", () => {
    const job = mapIntakeJob(
      "p",
      { source: "accesshire_portal", companyName: "Portal Co", workModel: "Remote", willingBlind: "No" },
      { jobTitle: "Analyst", physicalAccess: { screen_reader: "Yes", bogus: "Yes" }, neuroPractices: { low_distraction: "Partial" } },
      0,
      TODAY,
    );
    expect(job.source_system).toBe("accesshire_portal");
    expect(job.physical_access.screen_reader).toBe("Yes");
    expect(job.physical_access).not.toHaveProperty("bogus");
    expect(job.neuro_practices.low_distraction).toBe("Partial");
    expect(job.access_provenance.screen_reader.source_fields).toEqual(["physicalAccess"]);
  });
});

const candidate = (overrides: Partial<CandidateProfile> = {}): CandidateProfile => ({
  id: "c1",
  name: "Test",
  skills_assessed: true,
  exp_level: "Junior",
  edu_needed: "Diploma",
  skills_profile: { Organization: "Advanced" },
  work_style_pref: {},
  accessibility_needs: [],
  interests: ["Administration & Office Support"],
  pathways: ["physical_sensory"],
  access_profile: { physical: ["screen_reader"] },
  ...overrides,
});

const baseJob: JobListing = {
  id: "j1",
  company_name: "MIRA EXIM",
  job_title: "Data Entry Operator",
  location: "Delhi (NCR)",
  salary_range: null,
  exp_level: "Junior",
  edu_level: "Diploma",
  skill_requirements: {},
  required_skills: { Organization: { level: "Beginner", importance: "High" } },
  interest_areas: ["Administration & Office Support"],
  work_style: {},
  accessibility_params: {},
  physical_access: { screen_reader: "No" },
  access_provenance: {
    screen_reader: { value: "No", basis: "employer_confirmed", source_fields: ["willingBlind"] },
  },
  data_confidence: { level: "Medium", score: 0.6, provided: [], missing: ["Salary"] },
};

describe("matching engine", () => {
  it("expired and zero-vacancy roles are not recommendable, capability untouched", () => {
    const cand = candidate();
    const open = scorePair({ ...baseJob, availability_status: "Open" }, cand);
    const expired = scorePair(
      { ...baseJob, availability_status: "Expired", application_deadline: "2026-08-01" },
      cand,
    );
    const noVac = scorePair({ ...baseJob, availability_status: "No vacancies", vacancies: 0 }, cand);

    expect(open.is_recommendable).toBe(true);
    expect(expired.is_recommendable).toBe(false);
    expect(noVac.is_recommendable).toBe(false);
    expect(expired.skills_interest_score).toEqual(open.skills_interest_score);
    expect(open.confidence_level).toBe("Medium");
    expect(open.access_conflicts?.[0]).toContain("stated this is not available");
    expect(open.evidence?.physical.some((e) => e.includes("employer-confirmed"))).toBe(true);
  });

  it("employer openness follows the employer's own answers", () => {
    const inclusion = {
      pwd_categories: ["Hearing Impairment (deaf / hard of hearing)"],
      hires_pwd: "Yes",
      willing_blind: "No",
      willing_neurodivergent: "Maybe",
      pwd_quota: null,
      pwd_csr: null,
      pledge_accepted: true,
    };
    expect(employerOpenness(inclusion, ["hearing"])?.status).toBe("Open to your category");
    expect(employerOpenness(inclusion, ["visual"])?.status).toBe("Not currently open");
    expect(employerOpenness(inclusion, ["adhd"])?.status).toBe("Possibly open");
    expect(employerOpenness(inclusion, ["locomotor"])?.status).toBe("Your category not listed");
    expect(employerOpenness(null, ["locomotor"])?.status).toBe("Not stated");
    expect(employerOpenness(inclusion, [])).toBeNull();
  });

  it("openness and work-type fit never change the capability score", () => {
    const plain = scorePair(baseJob, candidate());
    const withSignals = scorePair(
      {
        ...baseJob,
        job_category: "Blue Collar (Skilled & Manual Labor)",
        inclusion: {
          pwd_categories: [], hires_pwd: "No", willing_blind: "No", willing_neurodivergent: "No",
          pwd_quota: null, pwd_csr: null, pledge_accepted: false,
        },
      },
      candidate({ access_profile: { physical: ["screen_reader"], categories: ["visual"], work_types: ["White Collar (Desk Jobs)"] } }),
    );
    expect(withSignals.match_score).toEqual(plain.match_score);
    expect(withSignals.employer_openness?.status).toBe("Not currently open");
    expect(withSignals.work_type_fit?.status).toBe("Check the physical demands");
  });

  it("work-type fit only speaks when both sides are known", () => {
    expect(workTypeFit("White Collar (Desk Jobs)", ["White Collar (Desk Jobs)"])?.status).toBe("Suits you");
    expect(workTypeFit(null, ["White Collar (Desk Jobs)"])).toBeNull();
    expect(workTypeFit("White Collar (Desk Jobs)", [])).toBeNull();
  });
});
