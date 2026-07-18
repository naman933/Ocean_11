import type { MatchStatus } from "../lib/freight-data";
import StatusDot from "./StatusDot";

const LABEL: Record<MatchStatus, string> = {
  matched: "Matched",
  needs_review: "Needs review",
  mismatch: "Mismatch",
};

const STYLE: Record<MatchStatus, { bg: string; fg: string }> = {
  matched: { bg: "var(--green-soft)", fg: "var(--green)" },
  needs_review: { bg: "var(--gold-soft)", fg: "var(--gold)" },
  mismatch: { bg: "var(--leak-soft)", fg: "var(--leak)" },
};

export default function StatusPill({
  status,
  label,
}: {
  status: MatchStatus;
  label?: string;
}) {
  const style = STYLE[status];
  return (
    <span
      className="mono inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10px]"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      <StatusDot status={status} size={6} />
      {label ?? LABEL[status]}
    </span>
  );
}
