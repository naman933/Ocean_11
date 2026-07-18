// ─────────────────────────────────────────────────────────────
// KOSMIC — Route / stepper config
// ─────────────────────────────────────────────────────────────

export interface Step {
  n: number;
  path: string;
  label: string;
  altitude: string;
}

export const STEPS: Step[] = [
  { n: 1, path: "/", label: "Portfolio Overview", altitude: "Macro" },
  { n: 2, path: "/documents", label: "Source Documents", altitude: "How it works" },
  { n: 3, path: "/reasoning", label: "AI Reasoning", altitude: "How it works" },
  { n: 4, path: "/detail", label: "Leak Detail", altitude: "Micro" },
  { n: 5, path: "/recovery", label: "Recovery & Action", altitude: "Action" },
];

export function stepByPath(path: string): Step | undefined {
  return STEPS.find((s) => s.path === path);
}
