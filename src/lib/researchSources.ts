// Background research that informed the AccessHire assessment framework.
// These are NOT user-facing tests and are NOT administered or reproduced by
// AccessHire. Kept in code for methodology documentation only.

export interface ResearchSource {
  name: string;
  publisher: string;
  url: string;
  informed: string;
}

export const RESEARCH_SOURCES: ResearchSource[] = [
  {
    name: "Adult ADHD Self-Report Scale (ASRS v1.1)",
    publisher: "psychology-tools.com / WHO",
    url: "https://psychology-tools.com/test/adult-adhd-self-report-scale",
    informed: "Which attention, focus and task-switching domains are worth asking about at work.",
  },
  {
    name: "AQ-10 Autism Spectrum Quotient",
    publisher: "embrace-autism.com",
    url: "https://embrace-autism.com/aq-10/",
    informed: "Sensory environment, routine and communication-format domains.",
  },
  {
    name: "Made By Dyslexia — Dyslexic Thinking Test",
    publisher: "madebydyslexia.org",
    url: "https://www.madebydyslexia.org/quiz/",
    informed: "Strengths-first framing: pattern recognition, big-picture thinking, creativity.",
  },
  {
    name: "Exceptional Individuals neurodiversity quizzes (dyslexia, dyscalculia, autism, ADHD, dyspraxia)",
    publisher: "exceptionalindividuals.com",
    url: "https://exceptionalindividuals.com/candidates/neurodiversity-resources/neurodiversity-quizzes/dyslexia-quiz-test/",
    informed: "Workplace-relevant domains such as instruction format, sequencing and processing time.",
  },
  {
    name: "O*NET Interest Profiler",
    publisher: "onetinterestprofiler.org",
    url: "https://onetinterestprofiler.org/",
    informed: "Career-interest structure behind our best-fit job families.",
  },
  {
    name: "Washington Group Short Set on Functioning (WG-SS)",
    publisher: "washingtongroup-disability.com",
    url: "https://www.washingtongroup-disability.com/question-sets/wg-short-set-on-functioning-wg-ss/",
    informed:
      "Functional-access domains (seeing, hearing, mobility, communication) reframed as workplace environment and equipment needs.",
  },
];

export const METHODOLOGY_NOTE =
  "Our two assessments — one for neurodivergent people, one for people with physical and sensory disabilities — are first-party, skills-first career assessments. The domains they cover were informed by established neurodiversity, career-interest and functional-access research, but no questions are reproduced from those instruments and AccessHire does not screen for or diagnose any condition.";
