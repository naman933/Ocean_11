import type { MatchStatus } from "../lib/freight-data";

const COLOR: Record<MatchStatus, string> = {
  matched: "var(--green)",
  needs_review: "var(--gold)",
  mismatch: "var(--leak)",
};

export default function StatusDot({
  status,
  size = 8,
}: {
  status: MatchStatus;
  size?: number;
}) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: COLOR[status],
      }}
    />
  );
}
