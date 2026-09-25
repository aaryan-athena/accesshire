// ─────────────────────────────────────────────────────────────────────────────
// AccessHire assessments — one per disability category.
//
//   1) neurodivergent    → AccessHire Neurodivergent Career Assessment
//   2) physical-sensory  → AccessHire Physical & Sensory Disability Career Assessment
//
// Both share the same SKILLS CORE (objective tasks, work situations, interests),
// so capability is measured identically for everyone and is the ONLY input to
// the capability score. Each then adds its own CATEGORY MODULE:
//
//   neurodivergent    → how you work best: instructions, environment, routine,
//                       focus, sensory load, processing time, interviews
//   physical-sensory  → functional access: mobility, vision, hearing,
//                       dexterity, equipment, commute, the kind of work that suits you
//
// Module answers describe the workplace a person needs. They are never scored,
// never diagnose, and never touch the capability score. They drive the access
// side of matching — employer environment, employer openness to the person's
// category, and work-type fit.
//
// Research instruments (ASRS, AQ-10, Washington Group, O*NET, Made By Dyslexia,
// Exceptional Individuals) informed the CONCEPTS only — no proprietary items are
// reproduced. See src/lib/researchSources.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { SKILL_AXES, type EduLevel, type ExpLevel, type SkillAxis } from "@/lib/taxonomy";
import { ACCESSIBILITY_AREAS } from "@/lib/taxonomy";
import { INTEREST_AREAS } from "@/lib/canonical";
import {
  NEURO_FEATURES,
  PATHWAY_NEURO,
  PATHWAY_PHYSICAL,
  PHYSICAL_FEATURES,
  WORK_TYPES,
  categoriesForPathway,
  type Pathway,
} from "@/lib/pathways";
import type { DerivedProfile } from "@/lib/assessmentProfile";

export const ASSESSMENT_VERSION = "2026.09";

export type TrackId = "neurodivergent" | "physical-sensory";

/** "full" = skills core + category module; "module" = the category module only. */
export type AssessmentPart = "full" | "module";

export type SectionKey =
  | "skills"
  | "situations"
  | "interests"
  | "about"
  | "workstyle"
  | "support"
  | "access"
  | "worksetting";

export const SECTION_LABELS: Record<SectionKey, string> = {
  skills: "Skills & strengths",
  situations: "Work situations",
  interests: "Interests & experience",
  about: "About you (optional)",
  workstyle: "How you work best",
  support: "Supports that help you",
  access: "Access & equipment",
  worksetting: "Work setting",
};

export const CORE_SECTIONS: SectionKey[] = ["skills", "situations", "interests"];

export type StrengthAxis =
  | "Problem Solving"
  | "Attention to Detail"
  | "Organisation"
  | "Communication"
  | "Digital Confidence"
  | "Pattern Recognition"
  | "Creativity";

export interface AssessmentOption {
  label: string;
  /** 0–1 credit — only ever set on skills-core questions. */
  credit?: number;
  /** Canonical work-style assignments (taxonomy STYLE_KEYS). */
  style?: Record<string, string>;
  /** Access feature keys from pathways.ts. */
  needs?: string[];
  /** Interest areas from canonical.ts. */
  interests?: string[];
  /** Assistive technology / accommodation preferences. */
  tech?: string[];
  /** Communication preferences (canonical.ts COMM_PREF_KEYS). */
  comm?: Record<string, string>;
  /** Self-described disability categories (pathways.ts DISABILITY_CATEGORIES). */
  categories?: string[];
  /** Kinds of work that suit the person physically (pathways.ts WORK_TYPES). */
  workTypes?: string[];
  /** Plain-language line shown back to the candidate. */
  insight?: string;
  /** Picking this option clears the others in a multi-select question. */
  exclusive?: boolean;
}

export interface AssessmentQuestion {
  id: string;
  section: SectionKey;
  kind: "objective" | "situational" | "interest" | "style" | "access" | "about";
  prompt: string;
  helper?: string;
  table?: { headers: string[]; rows: string[][] };
  multi?: boolean;
  axes?: StrengthAxis[];
  options: AssessmentOption[];
}

export interface AssessmentTrack {
  id: TrackId;
  pathway: Pathway;
  title: string;
  short: string;
  /** Who the assessment is for, in plain words. */
  audience: string;
  subtitle: string;
  /** What the category module covers. */
  moduleMeasures: string[];
  cta: string;
  moduleCta: string;
  /** Strength axes produced by the skills core. */
  axes: StrengthAxis[];
  /** Shared skills core — identical in both tracks. */
  coreQuestions: AssessmentQuestion[];
  /** Category-specific module. */
  moduleQuestions: AssessmentQuestion[];
}

// ═════════════════ Shared skills core (both categories) ═════════════════════
// Identical in both assessments so capability is measured the same way for
// everyone. Nothing here asks about disability.

const careerQuestions: AssessmentQuestion[] = [
  {
    id: "cs1",
    section: "skills",
    kind: "objective",
    axes: ["Attention to Detail"],
    prompt: "One row in this order table contains an error. Which row is it?",
    helper: "Line total should equal Units × Unit price.",
    table: {
      headers: ["Row", "Units", "Unit price", "Line total"],
      rows: [
        ["A", "12", "₹400", "₹4,800"],
        ["B", "7", "₹900", "₹6,300"],
        ["C", "15", "₹300", "₹5,400"],
        ["D", "6", "₹1,100", "₹6,600"],
      ],
    },
    options: [
      { label: "Row A", credit: 0 },
      { label: "Row B", credit: 0 },
      { label: "Row C", credit: 1 },
      { label: "Row D", credit: 0 },
    ],
  },
  {
    id: "cs2",
    section: "skills",
    kind: "objective",
    axes: ["Problem Solving"],
    prompt:
      "A support process runs: 1) Log the request, 2) Reproduce the issue, 3) ?, 4) Confirm the fix with the customer. What belongs in step 3?",
    options: [
      { label: "Close the request", credit: 0 },
      { label: "Apply and test a fix", credit: 1 },
      { label: "Ask the customer to log it again", credit: 0 },
      { label: "Write the monthly report", credit: 0 },
    ],
  },
  {
    id: "cs3",
    section: "skills",
    kind: "objective",
    axes: ["Organisation"],
    prompt:
      "It is Monday 9am. Which task should you do first? A) Report due Friday (4 hours). B) Client reply due today 11am (15 minutes). C) Team survey due next month (5 minutes). D) Filing with no deadline (1 hour).",
    options: [
      { label: "A — start the big report while you are fresh", credit: 0.3 },
      { label: "B — the reply due in two hours", credit: 1 },
      { label: "C — clear the quick survey first", credit: 0.3 },
      { label: "D — filing, to clear your desk", credit: 0 },
    ],
  },
  {
    id: "cs4",
    section: "skills",
    kind: "objective",
    axes: ["Communication"],
    prompt: "Which instruction is clearest for a colleague who will act on it without you?",
    options: [
      { label: "\"Please sort the invoices out soon, it's getting urgent.\"", credit: 0 },
      {
        label:
          "\"Upload the March invoices to the Finance folder by 4pm today, then reply here to confirm.\"",
        credit: 1,
      },
      { label: "\"Can you handle the invoice thing we discussed?\"", credit: 0 },
      { label: "\"Invoices — ASAP please, you know the process.\"", credit: 0.2 },
    ],
  },
  {
    id: "cs5",
    section: "skills",
    kind: "objective",
    axes: ["Digital Confidence"],
    prompt: "You need the total of column C for rows 2 to 40 in a spreadsheet. Which is correct?",
    options: [
      { label: "=SUM(C2:C40)", credit: 1 },
      { label: "=TOTAL(C2-C40)", credit: 0 },
      { label: "=COUNT(C2:C40)", credit: 0.2 },
      { label: "=AVERAGE(C2:C40)", credit: 0.2 },
    ],
  },
  {
    id: "cs6",
    section: "skills",
    kind: "objective",
    axes: ["Pattern Recognition"],
    prompt: "Which value continues the sequence: 3, 6, 12, 24, ?",
    options: [
      { label: "30", credit: 0 },
      { label: "36", credit: 0.2 },
      { label: "48", credit: 1 },
      { label: "60", credit: 0 },
    ],
  },
  {
    id: "cs7",
    section: "skills",
    kind: "objective",
    axes: ["Pattern Recognition", "Attention to Detail"],
    prompt: "Which month had the largest increase over the month before it?",
    table: {
      headers: ["Month", "Orders"],
      rows: [
        ["January", "120"],
        ["February", "150"],
        ["March", "155"],
        ["April", "210"],
      ],
    },
    options: [
      { label: "January", credit: 0 },
      { label: "February", credit: 0.3 },
      { label: "March", credit: 0 },
      { label: "April", credit: 1 },
    ],
  },
  {
    id: "cs8",
    section: "skills",
    kind: "objective",
    axes: ["Problem Solving", "Digital Confidence"],
    prompt:
      "A team of 4 packs 60 boxes in an hour at a steady rate. Two people are absent. How many boxes should the remaining team pack in an hour?",
    options: [
      { label: "15", credit: 0 },
      { label: "30", credit: 1 },
      { label: "40", credit: 0 },
      { label: "60", credit: 0 },
    ],
  },
  {
    id: "cs9",
    section: "situations",
    kind: "situational",
    axes: ["Communication", "Problem Solving"],
    prompt:
      "You are given a task with a key detail missing, and the person who assigned it is in meetings all day. What is the best first move?",
    options: [
      {
        label: "Send one specific written question, and start the parts you can do meanwhile",
        credit: 1,
      },
      { label: "Wait until they are free before starting anything", credit: 0.2 },
      { label: "Guess the missing detail and finish the whole task", credit: 0.1 },
      { label: "Ask a teammate to guess it with you", credit: 0.4 },
    ],
  },
  {
    id: "cs10",
    section: "situations",
    kind: "situational",
    axes: ["Organisation"],
    prompt: "Two deliverables land on the same afternoon and you cannot finish both well. What do you do?",
    options: [
      { label: "Flag it early, propose which one slips and by how long", credit: 1 },
      { label: "Rush both and hand in whatever is done", credit: 0.2 },
      { label: "Finish one and say nothing about the other", credit: 0 },
      { label: "Work late and hope it is enough", credit: 0.4 },
    ],
  },
  {
    id: "cs11",
    section: "situations",
    kind: "situational",
    axes: ["Digital Confidence", "Problem Solving"],
    prompt:
      "A software update changes a tool you use daily and part of your workflow stops working. What do you do first?",
    options: [
      { label: "Check settings and shortcuts to find an equivalent route", credit: 1 },
      { label: "Log it with IT describing exactly what changed and what you need", credit: 0.9 },
      { label: "Go back to doing that step by hand indefinitely", credit: 0.3 },
      { label: "Wait for someone else to report it", credit: 0 },
    ],
  },
  {
    id: "cs12",
    section: "situations",
    kind: "situational",
    axes: ["Attention to Detail", "Communication"],
    prompt:
      "You spot a mistake in a report that has already been sent to a client. What is the best action?",
    options: [
      { label: "Tell your manager immediately with the correction ready to send", credit: 1 },
      { label: "Fix the internal copy and say nothing", credit: 0 },
      { label: "Wait to see whether the client notices", credit: 0 },
      { label: "Mention it at the next weekly meeting", credit: 0.3 },
    ],
  },
  {
    id: "cs13",
    section: "situations",
    kind: "situational",
    axes: ["Creativity", "Problem Solving"],
    prompt:
      "A weekly manual task takes you three hours and is full of copy-paste steps. What is the strongest response?",
    options: [
      { label: "Document the steps, then propose a template or automation with the time saved", credit: 1 },
      { label: "Keep doing it — it works", credit: 0.2 },
      { label: "Do it faster and skip the checks", credit: 0 },
      { label: "Ask to hand it to someone else", credit: 0.3 },
    ],
  },
  {
    id: "cs14",
    section: "interests",
    kind: "interest",
    multi: true,
    prompt: "Which areas of work genuinely interest you? Select all that appeal.",
    helper: "This drives which real roles you are matched to — pick as many as fit.",
    options: INTEREST_AREAS.map((area) => ({ label: area, interests: [area] })),
  },
  {
    id: "cs15",
    section: "interests",
    kind: "interest",
    prompt: "Which kind of work activity do you enjoy most?",
    options: [
      {
        label: "Working with data, numbers and systems",
        interests: ["Data & Analytics", "Finance & Accounting", "Quality Assurance"],
        insight: "Enjoys structured, data-driven work",
      },
      {
        label: "Working with people — helping, advising, selling",
        interests: ["Customer Support", "Sales & Business Development", "Human Resources"],
        insight: "Motivated by people-facing work",
      },
      {
        label: "Working with tools, machines or physical processes",
        interests: ["Manufacturing & Production", "Logistics & Warehouse", "Skilled Trades"],
        insight: "Prefers hands-on, practical work",
      },
      {
        label: "Working with ideas — designing, writing, building",
        interests: ["Design", "Marketing", "Engineering / Software"],
        insight: "Drawn to creative and building work",
      },
    ],
  },
  {
    id: "cs16",
    section: "interests",
    kind: "interest",
    prompt: "Which describes the work you would choose day to day?",
    options: [
      {
        label: "Clear, repeatable tasks I can get consistently right",
        style: { task_style: "Structured" },
        insight: "Does best with clearly defined tasks",
      },
      {
        label: "A mix of routine work and new problems",
        style: { task_style: "Creative" },
        insight: "Comfortable mixing routine and new problems",
      },
      {
        label: "Open problems where I decide the approach",
        style: { task_style: "Open-ended" },
        insight: "Thrives on open-ended problem solving",
      },
    ],
  },
  {
    id: "cs17",
    section: "interests",
    kind: "interest",
    prompt: "How much work experience do you have in the areas you chose?",
    helper: "You can correct this later on your profile — it never hides roles from you.",
    options: [
      { label: "None yet, or study/volunteering only", insight: "Early-career — open to entry roles" },
      { label: "Up to about 2 years", insight: "Some hands-on experience" },
      { label: "About 3 to 7 years", insight: "Solid mid-level experience" },
      { label: "More than 7 years", insight: "Experienced, ready for senior scope" },
    ],
  },
  {
    id: "cs18",
    section: "interests",
    kind: "interest",
    prompt: "What is the highest qualification you have completed?",
    options: [
      { label: "School or certificate" },
      { label: "Diploma or vocational training" },
      { label: "Bachelor's degree" },
      { label: "Master's degree or higher" },
    ],
  },
];

const NONE = (label = "None of these"): AssessmentOption => ({ label, exclusive: true });

const categoryQuestion = (id: string, pathway: Pathway, prompt: string): AssessmentQuestion => ({
  id,
  section: "about",
  kind: "about",
  multi: true,
  prompt,
  helper:
    "Optional — skip it if you like. It is used for one thing only: showing you which employers have said they are open to hiring people like you. It is never a diagnosis and never changes your scores.",
  options: [
    ...categoriesForPathway(pathway).map((c) => ({ label: c.label, categories: [c.key] })),
    NONE("Prefer not to say"),
  ],
});

// ═══════════════ Module A — Neurodivergent (how you work best) ═══════════════

const neuroQuestions: AssessmentQuestion[] = [
  categoryQuestion("nd1", PATHWAY_NEURO, "Which of these describe you?"),
  {
    id: "nd2",
    section: "workstyle",
    kind: "style",
    prompt: "How do you prefer to receive instructions for a new task?",
    options: [
      {
        label: "Written — a document or message I can re-read",
        style: { comm_style: "Written" },
        needs: ["written_instructions", "text_first"],
        comm: { instructions: "Written" },
        insight: "Works best from written instructions",
      },
      {
        label: "Spoken first, then written notes",
        style: { comm_style: "Mixed" },
        needs: ["written_instructions"],
        comm: { instructions: "Spoken then written" },
        insight: "Prefers a briefing followed by written notes",
      },
      {
        label: "Spoken — a quick conversation works best",
        style: { comm_style: "Verbal" },
        comm: { instructions: "Spoken" },
        insight: "Prefers verbal briefings",
      },
    ],
  },
  {
    id: "nd3",
    section: "workstyle",
    kind: "style",
    prompt: "Which working environment lets you do your best work?",
    options: [
      {
        label: "Quiet and low-distraction",
        style: { work_environment: "Quiet" },
        needs: ["low_distraction", "sensory_friendly"],
        insight: "Needs a quiet, low-distraction space",
      },
      {
        label: "Moderate — some background activity is fine",
        style: { work_environment: "Moderate" },
        insight: "Comfortable in a moderately busy space",
      },
      {
        label: "Active and fast-moving",
        style: { work_environment: "Fast-paced" },
        insight: "Energised by an active environment",
      },
    ],
  },
  {
    id: "nd4",
    section: "workstyle",
    kind: "style",
    prompt: "Do you prefer predictable tasks or changing ones?",
    options: [
      {
        label: "Predictable — a stable routine I can rely on",
        style: { schedule_type: "Fixed" },
        needs: ["predictable_schedule", "clear_expectations"],
        insight: "Prefers predictable routines and clear expectations",
      },
      {
        label: "Mostly predictable with some variety",
        style: { schedule_type: "Flexible" },
        needs: ["clear_expectations"],
        insight: "Likes a stable base with some variety",
      },
      {
        label: "Changing — new things keep me engaged",
        style: { schedule_type: "Asynchronous" },
        insight: "Comfortable with frequently changing work",
      },
    ],
  },
  {
    id: "nd5",
    section: "workstyle",
    kind: "style",
    prompt: "How much advance notice do you want for meetings and changes?",
    options: [
      {
        label: "As much as possible — agendas ahead of time",
        needs: ["predictable_schedule", "clear_expectations"],
        insight: "Wants agendas and changes shared in advance",
      },
      { label: "A day or so is enough", insight: "Comfortable with short notice" },
      { label: "I am fine with last-minute changes", insight: "Handles last-minute changes easily" },
    ],
  },
  {
    id: "nd6",
    section: "workstyle",
    kind: "style",
    prompt: "How does switching between different tasks affect you?",
    options: [
      {
        label: "It costs me a lot — I do better on one thing at a time",
        needs: ["low_task_switching"],
        insight: "Works best with fewer task switches",
      },
      { label: "Some switching is fine", insight: "Handles a moderate amount of switching" },
      { label: "I switch easily between tasks", insight: "Switches between tasks comfortably" },
    ],
  },
  {
    id: "nd7",
    section: "workstyle",
    kind: "style",
    prompt: "Which work rhythm suits you best?",
    options: [
      {
        label: "Long blocks of deep focus",
        needs: ["low_distraction", "low_task_switching"],
        insight: "Strong deep-focus preference",
      },
      {
        label: "Shorter task cycles with breaks",
        needs: ["flexible_breaks"],
        insight: "Works best in short cycles with breaks",
      },
      { label: "A mix depending on the day", insight: "Flexible about work rhythm" },
    ],
  },
  {
    id: "nd8",
    section: "workstyle",
    kind: "style",
    prompt: "How do you prefer to work with others?",
    options: [
      { label: "Mostly independently, with check-ins", style: { team_style: "Independent" }, insight: "Most productive working independently" },
      { label: "In a small, steady team", style: { team_style: "Small team" }, insight: "Works well in a small stable team" },
      { label: "In a large, collaborative team", style: { team_style: "Large team" }, insight: "Enjoys large collaborative teams" },
    ],
  },
  {
    id: "nd9",
    section: "workstyle",
    kind: "style",
    prompt: "How comfortable are you with customer-facing or public-facing work?",
    options: [
      { label: "Very comfortable — I enjoy it", insight: "Comfortable in customer-facing roles" },
      { label: "Comfortable in planned, structured contact", insight: "Prefers structured customer contact" },
      { label: "I would rather work behind the scenes", needs: ["text_first"], insight: "Prefers behind-the-scenes work" },
    ],
  },
  {
    id: "nd10",
    section: "workstyle",
    kind: "style",
    multi: true,
    prompt: "Which of these feel like real strengths for you at work?",
    helper: "Pick any that fit. These are shown to you as strengths — they are not scored.",
    options: [
      { label: "Noticing details and errors other people miss", insight: "Strength: a sharp eye for detail" },
      { label: "Spotting patterns and how systems fit together", insight: "Strength: pattern and systems thinking" },
      { label: "Deep focus on topics that interest me", insight: "Strength: sustained deep focus" },
      { label: "Coming up with original ideas and big-picture thinking", insight: "Strength: creative, big-picture thinking" },
      { label: "Following a clear process accurately every time", insight: "Strength: consistent, accurate process work" },
      { label: "Remembering facts, figures and procedures", insight: "Strength: strong memory for facts and procedures" },
      { label: "Being honest, direct and reliable", insight: "Strength: honest, direct and dependable" },
      NONE("Not sure yet"),
    ],
  },
  {
    id: "nd11",
    section: "support",
    kind: "access",
    multi: true,
    prompt: "Which sensory or environment supports help you work well?",
    helper: "Select all that apply, or none.",
    options: [
      { label: "Control over noise levels", needs: ["low_distraction"] },
      { label: "Control over lighting and glare", needs: ["sensory_friendly"] },
      { label: "A quiet room I can move to", needs: ["low_distraction", "sensory_friendly"] },
      { label: "Breaks whenever I need them", needs: ["flexible_breaks"] },
      { label: "Noise-cancelling headphones allowed", needs: ["low_distraction"], tech: ["Noise-cancelling headphones"] },
      NONE(),
    ],
  },
  {
    id: "nd12",
    section: "support",
    kind: "access",
    multi: true,
    prompt: "Which communication supports would help you at work?",
    options: [
      { label: "Written updates instead of calls where possible", needs: ["text_first"], comm: { meetings: "Written-first" } },
      { label: "Written follow-up after verbal instructions", needs: ["written_instructions"], comm: { feedback: "Written follow-up" } },
      { label: "A clear definition of \"done\" for each task", needs: ["clear_expectations"] },
      { label: "Meeting agendas shared beforehand", needs: ["predictable_schedule"], comm: { meetings: "Agenda in advance" } },
      { label: "Reading & writing support tools", needs: ["processing_time"], tech: ["Reading & writing support tools"] },
      NONE(),
    ],
  },
  {
    id: "nd13",
    section: "support",
    kind: "access",
    prompt: "Would extra processing or task time help you do your best work?",
    options: [
      { label: "Yes, regularly", needs: ["processing_time"], insight: "Extra processing time helps" },
      { label: "Sometimes, for complex tasks", needs: ["processing_time"], insight: "Extra time helps on complex work" },
      { label: "No, standard timings are fine" },
    ],
  },
  {
    id: "nd14",
    section: "support",
    kind: "access",
    multi: true,
    prompt: "What would make an interview work best for you?",
    options: [
      { label: "Questions shared in advance", needs: ["interview_accommodations"], comm: { interview: "Questions in advance" } },
      { label: "Extra time in the interview", needs: ["interview_accommodations", "processing_time"], comm: { interview: "Extra time" } },
      { label: "A practical task instead of a live interview", needs: ["interview_accommodations"], comm: { interview: "Task-based" } },
      { label: "A quiet, low-stimulation interview room", needs: ["interview_accommodations", "sensory_friendly"], comm: { interview: "Quiet room" } },
      { label: "A remote interview rather than travel", needs: ["remote_hybrid"], comm: { interview: "Remote" } },
      NONE("A standard interview is fine"),
    ],
  },
  {
    id: "nd15",
    section: "worksetting",
    kind: "access",
    prompt: "How much flexibility do you need in your working hours?",
    options: [
      { label: "Fixed hours suit me", style: { schedule_type: "Fixed" }, insight: "Fixed hours work well" },
      {
        label: "Some flexibility around start and finish times",
        style: { schedule_type: "Flexible" },
        needs: ["flexible_breaks"],
        insight: "Needs some flexibility in hours",
      },
      {
        label: "Significant flexibility — I work best on my own schedule",
        style: { schedule_type: "Asynchronous" },
        needs: ["flexible_breaks"],
        insight: "Needs significant schedule flexibility",
      },
    ],
  },
  {
    id: "nd16",
    section: "worksetting",
    kind: "access",
    prompt: "Where would you prefer to work?",
    options: [
      { label: "Fully remote", style: { work_mode: "Remote" }, needs: ["remote_hybrid"], insight: "Prefers fully remote work" },
      { label: "Hybrid — some days on-site", style: { work_mode: "Hybrid" }, needs: ["remote_hybrid"], insight: "Prefers a hybrid pattern" },
      { label: "On-site", style: { work_mode: "On-site" }, insight: "Happy to work on-site" },
    ],
  },
];

// ═══════ Module B — Physical & sensory disability (functional access) ═══════

const physicalQuestions: AssessmentQuestion[] = [
  categoryQuestion("ps1", PATHWAY_PHYSICAL, "Which of these describe you?"),
  {
    id: "ps2",
    section: "access",
    kind: "access",
    multi: true,
    prompt: "Getting around a workplace: which of these do you need?",
    helper: "Only relevant if you work on-site at least some of the time.",
    options: [
      { label: "Step-free access — ramps or lifts, no stairs", needs: ["step_free"] },
      { label: "Accessible restroom and workstation space", needs: ["accessible_facilities"] },
      { label: "Accessible transport routes or parking near the workplace", needs: ["accessible_commute"] },
      NONE("None of these"),
    ],
  },
  {
    id: "ps3",
    section: "access",
    kind: "access",
    multi: true,
    prompt: "Seeing: which of these help you work?",
    options: [
      {
        label: "A screen reader (JAWS, NVDA, VoiceOver)",
        needs: ["screen_reader", "assistive_tech"],
        tech: ["Screen reader (JAWS, NVDA, VoiceOver)"],
      },
      {
        label: "Screen magnification, large text or high contrast",
        needs: ["magnification"],
        tech: ["Screen magnification / high contrast"],
      },
      { label: "Documents shared in accessible digital formats", needs: ["screen_reader"] },
      NONE("None of these"),
    ],
  },
  {
    id: "ps4",
    section: "access",
    kind: "access",
    multi: true,
    prompt: "Hearing and communication: which of these help you work?",
    options: [
      {
        label: "Captions or live transcription on calls",
        needs: ["captions"],
        tech: ["Captions / live transcription"],
        comm: { meetings: "Captions" },
      },
      {
        label: "A sign language interpreter",
        needs: ["sign_language"],
        tech: ["Sign language interpretation"],
        comm: { meetings: "Sign language" },
      },
      { label: "Written updates or chat instead of phone calls", needs: ["text_first"], comm: { instructions: "Written" } },
      NONE("None of these"),
    ],
  },
  {
    id: "ps5",
    section: "access",
    kind: "access",
    multi: true,
    prompt: "Hands and upper body: which of these apply?",
    options: [
      {
        label: "I use an alternative keyboard, mouse or pointing device",
        needs: ["dexterity_support", "assistive_tech"],
        tech: ["Alternative keyboard or pointing device"],
      },
      { label: "I use speech-to-text or voice control", needs: ["assistive_tech"], tech: ["Speech-to-text or dictation"] },
      { label: "I need to avoid heavy lifting or fine hand work", needs: ["dexterity_support"] },
      NONE("None of these"),
    ],
  },
  {
    id: "ps6",
    section: "access",
    kind: "access",
    prompt: "During a working day, do you need to sit, change position or rest?",
    options: [
      {
        label: "Yes — I need seated work or the freedom to sit and stand",
        needs: ["seated_adjustable", "ergonomic_equipment"],
        tech: ["Adjustable desk or ergonomic seating"],
        insight: "Needs seated or sit-stand work",
      },
      {
        label: "Sometimes — an adjustable chair or desk helps",
        needs: ["ergonomic_equipment"],
        tech: ["Adjustable desk or ergonomic seating"],
        insight: "An adjustable workstation helps",
      },
      { label: "No specific needs", insight: "No specific posture needs" },
    ],
  },
  {
    id: "ps7",
    section: "access",
    kind: "access",
    prompt: "Do you have assistive equipment you'd want your employer to support?",
    helper: "For example, specialist software, a braille display or an adapted workstation.",
    options: [
      { label: "Yes — I'd need budget or IT support for it", needs: ["assistive_tech"], insight: "Needs assistive-technology support" },
      { label: "I bring my own and just need it to be allowed", insight: "Uses own assistive equipment" },
      { label: "No" },
    ],
  },
  {
    id: "ps8",
    section: "worksetting",
    kind: "access",
    multi: true,
    prompt: "Which kinds of work are physically comfortable for you?",
    helper:
      "Pick all that could work. We use this to point out roles where you may want to ask about the physical demands — no role is ever hidden.",
    options: WORK_TYPES.map((w) => ({
      label: `${w.label} — ${w.help}`,
      workTypes: [w.key],
      insight: `Open to ${w.label.toLowerCase()}`,
    })),
  },
  {
    id: "ps9",
    section: "worksetting",
    kind: "access",
    prompt: "Where would you prefer to work?",
    options: [
      { label: "Fully remote", style: { work_mode: "Remote" }, needs: ["remote_hybrid"], insight: "Prefers fully remote work" },
      { label: "Hybrid — some days on-site", style: { work_mode: "Hybrid" }, needs: ["remote_hybrid"], insight: "Prefers a hybrid pattern" },
      { label: "On-site", style: { work_mode: "On-site" }, insight: "Happy to work on-site" },
    ],
  },
  {
    id: "ps10",
    section: "worksetting",
    kind: "access",
    prompt: "How do you usually travel to work?",
    options: [
      {
        label: "I need accessible transport or parking information",
        needs: ["accessible_commute"],
        insight: "Needs accessible commute information",
      },
      { label: "I travel independently without specific needs", insight: "Travels independently" },
      {
        label: "I'd prefer to avoid commuting and work remotely",
        needs: ["remote_hybrid"],
        insight: "Prefers to avoid commuting",
      },
    ],
  },
  {
    id: "ps11",
    section: "worksetting",
    kind: "access",
    multi: true,
    prompt: "What would make an interview work best for you?",
    options: [
      { label: "A step-free, accessible interview venue", needs: ["step_free"], comm: { interview: "Accessible venue" } },
      { label: "A remote interview rather than travel", needs: ["remote_hybrid"], comm: { interview: "Remote" } },
      { label: "A sign language interpreter", needs: ["sign_language"], comm: { interview: "Sign language" } },
      { label: "Captions or written questions", needs: ["captions", "text_first"], comm: { interview: "Captions / written" } },
      { label: "Tests and forms that work with my screen reader", needs: ["screen_reader"], comm: { interview: "Screen-reader accessible" } },
      NONE("A standard interview is fine"),
    ],
  },
];

const CORE_AXES: StrengthAxis[] = [
  "Problem Solving",
  "Attention to Detail",
  "Organisation",
  "Communication",
  "Digital Confidence",
  "Pattern Recognition",
  "Creativity",
];

export const TRACKS: Record<TrackId, AssessmentTrack> = {
  neurodivergent: {
    id: "neurodivergent",
    pathway: PATHWAY_NEURO,
    title: "AccessHire Neurodivergent Career Assessment",
    short: "Neurodivergent",
    audience: "For autistic people, people with ADHD, dyslexia, dyscalculia, dyspraxia, or an intellectual or learning disability — or anyone whose brain works a little differently.",
    subtitle:
      "Show what you can do, then tell us how you work best — instructions, environment, routine, focus and sensory needs. No time limits, one question at a time.",
    moduleMeasures: [
      "Written vs spoken instructions",
      "Quiet vs active environment",
      "Routine, notice & task switching",
      "Deep focus vs short cycles",
      "Your strengths at work",
      "Sensory & communication supports",
      "Processing time",
      "Interview preferences",
      "Hours & remote / hybrid / on-site",
    ],
    cta: "Start the neurodivergent assessment",
    moduleCta: "Take only the neurodivergent module",
    axes: CORE_AXES,
    coreQuestions: careerQuestions,
    moduleQuestions: neuroQuestions,
  },
  "physical-sensory": {
    id: "physical-sensory",
    pathway: PATHWAY_PHYSICAL,
    title: "AccessHire Physical & Sensory Disability Career Assessment",
    short: "Physical & sensory",
    audience: "For people with a physical or mobility disability, people who are blind or have low vision, and people who are deaf or hard of hearing.",
    subtitle:
      "Show what you can do, then tell us what a workplace needs to offer — access, equipment, communication and the kind of work that suits you physically.",
    moduleMeasures: [
      "Step-free access & facilities",
      "Screen reader & magnification",
      "Captions, sign language & text-first",
      "Dexterity & alternative input",
      "Seated / sit-stand work",
      "Assistive equipment",
      "Kinds of work that suit you",
      "Commute & remote / hybrid / on-site",
      "Interview access",
    ],
    cta: "Start the physical & sensory assessment",
    moduleCta: "Take only the physical & sensory module",
    axes: CORE_AXES,
    coreQuestions: careerQuestions,
    moduleQuestions: physicalQuestions,
  },
};

export const TRACK_LIST = [TRACKS.neurodivergent, TRACKS["physical-sensory"]];

export const isTrackId = (v: string | undefined): v is TrackId =>
  v === "neurodivergent" || v === "physical-sensory";

/** Old track ids from before the split, so saved links still land somewhere sensible. */
export const LEGACY_TRACK_IDS = ["career-skills", "access-workstyle"];

export const questionsFor = (trackId: TrackId, part: AssessmentPart = "full") => {
  const track = TRACKS[trackId];
  return part === "module" ? track.moduleQuestions : [...track.coreQuestions, ...track.moduleQuestions];
};

export const questionCount = (trackId: TrackId, part: AssessmentPart = "full") =>
  questionsFor(trackId, part).length;

/** Rough minutes: objective tasks take longer than preference questions. */
export const estimatedMinutes = (trackId: TrackId, part: AssessmentPart = "full") =>
  Math.max(
    3,
    Math.round(
      questionsFor(trackId, part).reduce(
        (sum, q) => sum + (q.kind === "objective" || q.kind === "situational" ? 0.75 : 0.35),
        0,
      ),
    ),
  );

// ═══════════════════════════════ Scoring ═══════════════════════════════════

export type AssessmentAnswers = Record<string, number | number[]>;

export interface JobFamily {
  name: string;
  why: string;
}

export interface AssessmentOutcome {
  track: AssessmentTrack;
  part: AssessmentPart;
  version: string;
  /** 0–100 per strength axis. Only populated when the skills core was taken. */
  strengths: Record<string, number>;
  overall: number | null;
  insights: string[];
  interests: string[];
  workStyle: Record<string, string>;
  /** Pathway feature keys from the category module. */
  needs: string[];
  assistiveTech: string[];
  commPrefs: Record<string, string>;
  /** Self-described categories (optional). */
  categories: string[];
  /** Kinds of work that suit the person physically. */
  workTypes: string[];
  pathways: Pathway[];
  jobFamilies: JobFamily[];
  /** Canonical capability profile. Null when only the module was taken. */
  derived: DerivedProfile | null;
  /** Canonical work-style/access profile from the category module. */
  accessProfile: {
    workStyle: Record<string, string>;
    physical: string[];
    neuro: string[];
    categories: string[];
    workTypes: string[];
    assistiveTech: string[];
    commPrefs: Record<string, string>;
  };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
/** Encouraging but honest band: full credit = 100, half = ~72, zero = 45. */
const toScore = (avg: number) => clamp(45 + 55 * avg);

const CANONICAL: Record<StrengthAxis, SkillAxis[]> = {
  "Problem Solving": ["Problem Solving"],
  "Pattern Recognition": ["Problem Solving"],
  "Attention to Detail": ["Organization"],
  Organisation: ["Organization"],
  Communication: ["Communication"],
  "Digital Confidence": ["Technical Skills"],
  Creativity: ["Creativity"],
};

const NEED_TO_AREA: Record<string, string> = {
  screen_reader: ACCESSIBILITY_AREAS[0],
  magnification: ACCESSIBILITY_AREAS[0],
  captions: ACCESSIBILITY_AREAS[1],
  sign_language: ACCESSIBILITY_AREAS[2],
  flexible_breaks: ACCESSIBILITY_AREAS[3],
  predictable_schedule: ACCESSIBILITY_AREAS[3],
  low_distraction: ACCESSIBILITY_AREAS[4],
  sensory_friendly: ACCESSIBILITY_AREAS[4],
  processing_time: ACCESSIBILITY_AREAS[5],
  written_instructions: ACCESSIBILITY_AREAS[6],
  text_first: ACCESSIBILITY_AREAS[6],
  remote_hybrid: ACCESSIBILITY_AREAS[7],
};

const KEYS_BY_PATHWAY: Record<Pathway, Set<string>> = {
  [PATHWAY_PHYSICAL]: new Set(PHYSICAL_FEATURES.map((f) => f.key)),
  [PATHWAY_NEURO]: new Set(NEURO_FEATURES.map((f) => f.key)),
};

const JOB_FAMILY_RULES: { name: string; axes: StrengthAxis[]; why: string }[] = [
  { name: "Quality assurance & testing", axes: ["Attention to Detail", "Pattern Recognition"], why: "Spotting inconsistencies others miss." },
  { name: "Data & analytics support", axes: ["Pattern Recognition", "Digital Confidence"], why: "Reading data carefully and drawing the right conclusion." },
  { name: "Operations & coordination", axes: ["Organisation", "Problem Solving"], why: "Prioritising well when everything lands at once." },
  { name: "Customer support & success", axes: ["Communication", "Problem Solving"], why: "Clear communication under real constraints." },
  { name: "Administration & office support", axes: ["Organisation", "Attention to Detail"], why: "Accurate, dependable process work." },
  { name: "Design & content", axes: ["Creativity", "Communication"], why: "Turning ideas into something usable." },
  { name: "Technical support & IT", axes: ["Digital Confidence", "Problem Solving"], why: "Working problems through tools methodically." },
];

const asList = (v: number | number[] | undefined): number[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

export function scoreAssessment(
  trackId: TrackId,
  answers: AssessmentAnswers,
  part: AssessmentPart = "full",
): AssessmentOutcome {
  const track = TRACKS[trackId];
  const axisTotals: Record<string, { sum: number; count: number }> = {};
  const insights: string[] = [];
  const workStyle: Record<string, string> = {};
  const needs = new Set<string>();
  const interests = new Set<string>();
  const tech = new Set<string>();
  const categories = new Set<string>();
  const workTypes = new Set<string>();
  const commPrefs: Record<string, string> = {};

  for (const q of questionsFor(trackId, part)) {
    const picked = asList(answers[q.id]).map((i) => q.options[i]).filter(Boolean);
    for (const opt of picked) {
      if (opt.style) Object.assign(workStyle, opt.style);
      opt.needs?.forEach((n) => needs.add(n));
      opt.interests?.forEach((n) => interests.add(n));
      opt.tech?.forEach((n) => tech.add(n));
      opt.categories?.forEach((n) => categories.add(n));
      opt.workTypes?.forEach((n) => workTypes.add(n));
      if (opt.comm) Object.assign(commPrefs, opt.comm);
      if (opt.insight) insights.push(opt.insight);
      if (typeof opt.credit === "number" && q.axes) {
        for (const axis of q.axes) {
          axisTotals[axis] ??= { sum: 0, count: 0 };
          axisTotals[axis].sum += opt.credit;
          axisTotals[axis].count += 1;
        }
      }
    }
  }

  // ── Category module → access profile (never scored, never a diagnosis) ────
  // Only the features that belong to this track's pathway are kept.
  const own = KEYS_BY_PATHWAY[track.pathway];
  const moduleNeeds = [...needs].filter((k) => own.has(k));
  const accessProfile = {
    workStyle,
    physical: track.pathway === PATHWAY_PHYSICAL ? moduleNeeds : [],
    neuro: track.pathway === PATHWAY_NEURO ? moduleNeeds : [],
    categories: [...categories],
    workTypes: [...workTypes],
    assistiveTech: [...tech],
    commPrefs,
  };

  const shared = {
    track,
    part,
    version: ASSESSMENT_VERSION,
    insights: [...new Set(insights)],
    workStyle,
    needs: moduleNeeds,
    assistiveTech: [...tech],
    commPrefs,
    categories: [...categories],
    workTypes: [...workTypes],
    pathways: [track.pathway],
    accessProfile,
  };

  if (part === "module") {
    return { ...shared, strengths: {}, overall: null, interests: [], jobFamilies: [], derived: null };
  }

  // ── Skills core → capability profile ──────────────────────────────────────
  const strengths: Record<string, number> = {};
  for (const axis of track.axes) {
    const t = axisTotals[axis];
    strengths[axis] = t && t.count ? toScore(t.sum / t.count) : 60;
  }
  const values = Object.values(strengths);
  const overall = clamp(values.reduce((a, b) => a + b, 0) / (values.length || 1));

  const canonicalScores: Record<string, number[]> = {};
  for (const axis of track.axes) {
    for (const canonical of CANONICAL[axis]) {
      (canonicalScores[canonical] ??= []).push(strengths[axis]);
    }
  }
  const level = (score: number) =>
    score >= 82 ? "Advanced" : score >= 62 ? "Intermediate" : "Beginner";

  const skills_profile: Record<string, string> = {};
  const skill_confidence: Record<string, number> = {};
  for (const canonical of SKILL_AXES) {
    const list = canonicalScores[canonical];
    const score = list?.length ? list.reduce((a, b) => a + b, 0) / list.length : overall;
    skills_profile[canonical] = level(score);
    skill_confidence[canonical] = clamp(score);
  }
  skills_profile.Teamwork = level(overall);
  skills_profile.Adaptability = level(overall);

  // Experience / education come from the candidate's own stated answers.
  const expAnswer = asList(answers.cs17)[0];
  const eduAnswer = asList(answers.cs18)[0];
  const exp_level: ExpLevel =
    expAnswer === undefined
      ? "Junior"
      : expAnswer >= 3
        ? "Senior"
        : expAnswer >= 2
          ? "Intermediate"
          : "Junior";
  const edu_needed: EduLevel =
    eduAnswer === undefined ? "Diploma" : eduAnswer >= 3 ? "Master" : eduAnswer >= 2 ? "Bachelor" : "Diploma";

  const jobFamilies = JOB_FAMILY_RULES.map((rule) => {
    const relevant = rule.axes.filter((a) => strengths[a] !== undefined);
    if (!relevant.length) return null;
    const score = relevant.reduce((sum, a) => sum + strengths[a], 0) / relevant.length;
    return { name: rule.name, why: rule.why, score };
  })
    .filter((x): x is { name: string; why: string; score: number } => Boolean(x))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ name, why }) => ({ name, why }));

  const accessibility_needs = [
    ...new Set(moduleNeeds.map((n) => NEED_TO_AREA[n]).filter(Boolean)),
  ];

  return {
    ...shared,
    strengths,
    overall,
    interests: [...interests],
    jobFamilies,
    derived: {
      skills_profile,
      // Work style from the whole run: the skills core's task-style answer plus the module.
      work_style_pref: workStyle,
      accessibility_needs,
      exp_level,
      edu_needed,
      skill_confidence,
    },
  };
}
