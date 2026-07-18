import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Calculator,
  FileText,
  Gavel,
  Link2,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { ScreenFrame, StepFooter } from "../components/AppShell";
import Panel from "../components/Panel";
import StatusDot from "../components/StatusDot";
import { STEPS } from "../lib/nav";
import {
  fmtMoney,
  fmtUsd,
  getInvoices,
  lanePair,
  type InvoiceLine,
  type MatchStatus,
} from "../lib/freight-data";

const DEFAULT_INVOICE_ID = "INV-OML-88213";

const STATUS_COLOR: Record<MatchStatus, string> = {
  matched: "var(--green)",
  mismatch: "var(--leak)",
  needs_review: "var(--gold)",
};

// ── Pipeline strip ───────────────────────────────────────────

const PIPELINE_STEPS: { label: string; icon: LucideIcon }[] = [
  { label: "Read docs", icon: FileText },
  { label: "Normalize", icon: SlidersHorizontal },
  { label: "Match lines", icon: Link2 },
  { label: "Judge fault", icon: Gavel },
  { label: "Quantify leak", icon: Calculator },
];

const ACTIVE_PIPELINE_INDEX = 2;

function PipelineStrip() {
  return (
    <div className="flex items-stretch">
      {PIPELINE_STEPS.map((step, i) => {
        const Icon = step.icon;
        const active = i === ACTIVE_PIPELINE_INDEX;
        return (
          <div key={step.label} className="flex flex-1 items-center">
            <div
              className="flex flex-1 items-center justify-center gap-2 px-4 py-3"
              style={{
                backgroundColor: active ? "var(--ink)" : "var(--mist)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <Icon size={14} color={active ? "#ffffff" : "var(--steel)"} />
              <span
                className={`mono text-[10px] ${
                  active ? "text-white" : "text-steel"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <ArrowRight
                size={14}
                className="mx-2 shrink-0"
                color="var(--steel-soft)"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Matcher connectors ───────────────────────────────────────

interface Connector {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  line: InvoiceLine;
}

function tooltipText(line: InvoiceLine): string {
  const delta = line.billed_amount - line.contract_amount;
  const sign = delta > 0 ? "+" : "";
  return `${line.charge_code}: ${fmtMoney(
    line.contract_amount,
    line.contract_currency
  )} contracted → ${fmtMoney(
    line.billed_amount,
    line.billed_currency
  )} billed · Δ ${sign}${fmtMoney(delta, line.billed_currency)}`;
}

// ── Screen ───────────────────────────────────────────────────

const DESKTOP_QUERY = "(min-width: 1280px)";

export default function AIReasoning() {
  const [searchParams, setSearchParams] = useSearchParams();
  const invoices = useMemo(() => getInvoices(), []);
  const selectedId = searchParams.get("inv") || DEFAULT_INVOICE_ID;
  const invoice =
    invoices.find((i) => i.invoice_id === selectedId) ?? invoices[0];

  // Make the invoice explicit in the URL so it carries forward through the
  // rest of the journey instead of relying on a hidden fallback.
  useEffect(() => {
    if (!searchParams.get("inv")) {
      const next = new URLSearchParams(searchParams);
      next.set("inv", DEFAULT_INVOICE_ID);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rightRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );

  useLayoutEffect(() => {
    function recompute() {
      const el = containerRef.current;
      if (!el) return;
      setIsDesktop(window.matchMedia(DESKTOP_QUERY).matches);
      const containerRect = el.getBoundingClientRect();
      const next: Connector[] = [];
      invoice.lines.forEach((line, i) => {
        const l = leftRefs.current[i];
        const r = rightRefs.current[i];
        if (!l || !r) return;
        const lRect = l.getBoundingClientRect();
        const rRect = r.getBoundingClientRect();
        next.push({
          x1: lRect.right - containerRect.left,
          y1: lRect.top + lRect.height / 2 - containerRect.top,
          x2: rRect.left - containerRect.left,
          y2: rRect.top + rRect.height / 2 - containerRect.top,
          line,
        });
      });
      setConnectors(next);
      setSize({ width: containerRect.width, height: containerRect.height });
    }

    recompute();
    window.addEventListener("resize", recompute);
    document.fonts?.ready.then(recompute).catch(() => {});
    return () => window.removeEventListener("resize", recompute);
  }, [invoice]);

  const hovered =
    isDesktop && hoverIdx !== null ? connectors[hoverIdx] : undefined;
  const matchedCount = invoice.lines.filter(
    (l) => l.match_status === "matched"
  ).length;

  return (
    <>
      <ScreenFrame
        step={STEPS[2]}
        title="The agent connects every line to a clause — and colors each connection green, amber, or red."
        description="Follow the pipeline from raw extraction to fault judgment and quantified leak."
      >
        <div className="space-y-6">
          <PipelineStrip />

          <div
            ref={containerRef}
            className="relative grid grid-cols-1 gap-6 xl:grid-cols-[30%_40%_30%] xl:gap-0"
          >
            {/* LEFT — Contract Side */}
            <div>
              <Panel
                kicker={invoice.contract_id}
                title="Contract Side"
                bodyClassName="p-0"
              >
                <div className="border-b border-line px-4 py-3">
                  <div className="mono text-[9px] text-steel-soft">LANE</div>
                  <div className="mt-1 text-[12.5px] text-ink">
                    {lanePair(invoice.lane_origin, invoice.lane_destination)}
                    <span className="text-steel"> &middot; {invoice.container_type}</span>
                  </div>
                </div>
                <div>
                  {invoice.lines.map((line, i) => (
                    <div
                      key={`${line.charge_code}-${i}`}
                      ref={(el) => {
                        leftRefs.current[i] = el;
                      }}
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() =>
                        setHoverIdx((h) => (h === i ? null : h))
                      }
                      className="flex cursor-pointer items-center justify-between border-b border-line py-3 pl-4 pr-4 transition-colors last:border-b-0"
                      style={{
                        borderLeft: `2px solid ${
                          STATUS_COLOR[line.match_status]
                        }`,
                        backgroundColor:
                          hoverIdx === i ? "var(--mist)" : undefined,
                      }}
                    >
                      <span className="mono text-[11px] text-steel">
                        {line.charge_code}
                      </span>
                      <span className="mono tabular text-[12px] text-ink">
                        {fmtMoney(line.contract_amount, line.contract_currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* CENTER — Matcher label (desktop-only; connectors need the 3-col layout) */}
            <div className="pointer-events-none hidden justify-center pt-1 xl:flex">
              <span className="mono text-[9px] text-steel-soft">
                AI MATCH
              </span>
            </div>

            {/* RIGHT — Invoice Side */}
            <div>
              <Panel
                kicker={invoice.invoice_id}
                title="Invoice Side"
                bodyClassName="p-0"
              >
                <div className="border-b border-line px-4 py-3">
                  <div className="mono text-[9px] text-steel-soft">CARRIER</div>
                  <div className="mt-1 text-[12.5px] text-ink">
                    {invoice.carrier}
                    <span className="text-steel"> &middot; {invoice.invoice_date}</span>
                  </div>
                </div>
                <div>
                  {invoice.lines.map((line, i) => (
                    <div
                      key={`${line.charge_code}-${i}`}
                      ref={(el) => {
                        rightRefs.current[i] = el;
                      }}
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() =>
                        setHoverIdx((h) => (h === i ? null : h))
                      }
                      className="flex cursor-pointer items-center justify-between gap-3 border-b border-line py-3 pl-4 pr-4 transition-colors last:border-b-0"
                      style={{
                        backgroundColor:
                          hoverIdx === i ? "var(--mist)" : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <StatusDot status={line.match_status} />
                        <span className="mono text-[11px] text-steel">
                          {line.charge_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="mono tabular text-[12px] text-ink">
                          {fmtMoney(line.billed_amount, line.billed_currency)}
                        </span>
                        {line.match_status === "mismatch" && (
                          <span
                            className="mono tabular text-[11px]"
                            style={{ color: "var(--leak)" }}
                          >
                            +{fmtUsd(line.leak_amount_usd, false)}
                          </span>
                        )}
                        {line.match_status === "needs_review" && (
                          <span
                            className="mono flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: "var(--gold-soft)",
                              color: "var(--gold)",
                            }}
                          >
                            ?
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* SVG connector overlay — desktop-only, spans the 3-column container */}
            <svg
              className="pointer-events-none absolute left-0 top-0 hidden xl:block"
              width={size.width}
              height={size.height}
            >
              {connectors.map((c, i) => {
                const midX = (c.x1 + c.x2) / 2;
                const d = `M ${c.x1} ${c.y1} C ${midX} ${c.y1} ${midX} ${c.y2} ${c.x2} ${c.y2}`;
                const color = STATUS_COLOR[c.line.match_status];
                const active = hoverIdx === i;
                const dimmed = hoverIdx !== null && !active;
                return (
                  <g key={i} opacity={dimmed ? 0.3 : 1}>
                    <path
                      d={d}
                      fill="none"
                      stroke={color}
                      strokeWidth={active ? 3 : 2}
                    />
                    <circle
                      cx={midX}
                      cy={(c.y1 + c.y2) / 2}
                      r={active ? 5 : 4}
                      fill={color}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {hovered && (
              <div
                className="mono pointer-events-none absolute z-10 whitespace-nowrap px-3 py-2 text-[10.5px] text-white"
                style={{
                  left: (hovered.x1 + hovered.x2) / 2,
                  top: (hovered.y1 + hovered.y2) / 2,
                  transform: "translate(-50%, -130%)",
                  backgroundColor: "var(--ink)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {tooltipText(hovered.line)}
              </div>
            )}
          </div>

          {/* Summary bar */}
          <div
            className="mono flex flex-wrap items-center justify-center gap-2 border border-line px-5 py-3 text-[11px] text-steel"
            style={{ backgroundColor: "var(--mist)", borderRadius: "var(--radius-sm)" }}
          >
            <SummaryStat
              value={`${matchedCount} of ${invoice.lines.length}`}
              label="lines matched"
            />
            <Divider />
            <SummaryStat
              value={String(invoice.mismatch_count)}
              label={invoice.mismatch_count === 1 ? "leak found" : "leaks found"}
              color="var(--leak)"
            />
            <Divider />
            <SummaryStat
              value={fmtUsd(invoice.leak_total_usd, false)}
              label="total leakage on this invoice"
              color="var(--leak)"
            />
          </div>
        </div>
      </ScreenFrame>
      <StepFooter prev="/documents" next="/detail" />
    </>
  );
}

function SummaryStat({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <span>
      <span className="tabular font-semibold" style={{ color: color ?? "var(--ink)" }}>
        {value}
      </span>{" "}
      <span>{label}</span>
    </span>
  );
}

function Divider(): ReactNode {
  return <span className="text-steel-soft">&middot;</span>;
}
