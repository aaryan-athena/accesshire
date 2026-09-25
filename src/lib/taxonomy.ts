// Single source of truth for every controlled vocabulary the matching engine uses.

export const SKILL_AXES = [
  "Communication",
  "Problem Solving",
  "Technical Skills",
  "Teamwork",
  "Adaptability",
  "Creativity",
  "Organization",
] as const;

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const IMPORTANCES = ["Low", "Medium", "High"] as const;
export const SUPPORTS = ["Yes", "Partial", "No"] as const;
export const EXP_LEVELS = ["Junior", "Intermediate", "Senior"] as const;
export const EDU_LEVELS = ["Diploma", "Bachelor", "Master"] as const;

export const ACCESSIBILITY_AREAS = [
  "Screen-reader compatibility",
  "Captioned meetings",
  "Sign language support",
  "Flexible hours",
  "Low-stimulation environment",
  "Extra time for tasks",
  "Written instructions",
  "Remote option",
] as const;

export const STYLE_KEYS = [
  "work_mode",
  "schedule_type",
  "work_environment",
  "team_style",
  "comm_style",
  "task_style",
] as const;

export const STYLE_LABELS: Record<string, string> = {
  work_mode: "Work mode",
  schedule_type: "Schedule",
  work_environment: "Environment",
  team_style: "Team style",
  comm_style: "Communication",
  task_style: "Task style",
};

export const STYLE_SCALES: Record<string, string[]> = {
  work_mode: ["Remote", "Hybrid", "On-site"],
  schedule_type: ["Asynchronous", "Flexible", "Fixed"],
  work_environment: ["Quiet", "Moderate", "Fast-paced"],
  team_style: ["Independent", "Small team", "Large team"],
  comm_style: ["Written", "Mixed", "Verbal"],
  task_style: ["Structured", "Creative", "Open-ended"],
};

export type SkillAxis = (typeof SKILL_AXES)[number];
export type Level = (typeof LEVELS)[number];
export type ExpLevel = (typeof EXP_LEVELS)[number];
export type EduLevel = (typeof EDU_LEVELS)[number];
export type AccessibilityArea = (typeof ACCESSIBILITY_AREAS)[number];
