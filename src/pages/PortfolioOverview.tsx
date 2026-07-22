import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Lightbulb } from "lucide-react";
import { ScreenFrame, StepFooter } from "../components/AppShell";
import Panel from "../components/Panel";
import { STEPS } from "../lib/nav";
import { collectLeaks } from "../lib/dispute";
import {
  FX,
  INVOICE_LINES,
  LEAK_CATEGORY_LABELS,
  LEAK_TREND,
  SHIPMENT_LOG,
  fmtUsd,
  getPortfolioStats,
  getSpotBookingsOnContractedLanes,
  getVolumeRebateAnalysis,
  lanePair,
  laneLabel,
  type InvoiceLine,
  type LeakCategory,
} from "../lib/freight-data";

// ── Shared lookups (used by both the hero row and the waterfall) ─

const CARRIER_NAMES: Record<string, string> = {
  OML: "Odyssey Maritime Lines",
  ASC: "Atlas Sea Carriers",
};

function formatLaneKey(key: string): string {
  const [origin, dest] = key.split("→");
  return origin && dest ? `${laneLabel(origin)} → ${laneLabel(dest)}` : key;
}

// ── KPI hero row ─────────────────────────────────────────────

const PASS1_BREAKDOWN: { key: LeakCategory; label: string }[] = [
  { key: "rate_misapplication", label: "Rate errors" },
  { key: "surcharge_error", label: "Surcharge errors" },
  { key: "demurrage_detention", label: "D&D overcharges" },
  { key: "accessorial_duplicate", label: "Duplicate charges" },
];

const PASS2_BREAKDOWN: { key: LeakCategory; label: string }[] = [
  { key: "off_contract_spot", label: "Spot booking exposure" },
  { key: "volume_rebate_shortfall", label: "Volume rebate shortfall" },
];

function HeroLeakageCard({
  stats,
}: {
  stats: ReturnType<typeof getPortfolioStats>;
}) {
  return (
    <div
      className="border border-line bg-paper p-6"
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mono text-[10px] text-steel">
            TOTAL LEAKAGE IDENTIFIED
          </div>
          <div className="flex items-center gap-3">
            <div
              className="display tabular mt-2 text-[44px] font-bold leading-none"
              style={{ color: "var(--leak)" }}
            >
              {fmtUsd(stats.totalLeak)}
            </div>
            <span
              className="mono rounded-sm px-1.5 py-0.5 text-[10px]"
              style={{ backgroundColor: "var(--leak-soft)", color: "var(--leak)" }}
            >
              +18.4% vs prior period
            </span>
          </div>
        </div>
        <div className="text-[14px] leading-snug text-steel">
          across {stats.invoiceCount} invoices &middot; {stats.lineCount} lines
          audited &middot; {(stats.leakRate * 100).toFixed(1)}% leak rate
        </div>
      </div>
    </div>
  );
}

function PassBreakdownCard({
  kicker,
  question,
  amount,
  breakdown,
  values,
  accent,
  tag,
}: {
  kicker: string;
  question: string;
  amount: number;
  breakdown: { key: LeakCategory; label: string }[];
  values: Record<string, number>;
  accent: string;
  tag?: string;
}) {
  return (
    <div
      className="relative overflow-hidden border border-line bg-paper"
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <div className="p-5 pb-6">
        <div className="mono flex items-center justify-between text-[10px] text-steel">
          <span>{kicker}</span>
          {tag && (
            <span
              className="mono rounded-sm px-1.5 py-0.5 text-[9px]"
              style={{ backgroundColor: "var(--mist2)", color: "var(--ink2)" }}
            >
              {tag}
            </span>
          )}
        </div>
        <div
          className="display tabular mt-2 text-[28px] font-bold leading-none text-ink"
        >
          {fmtUsd(amount)}
        </div>
        <div className="mt-1.5 text-[13px] italic text-steel">{question}</div>

        <div className="mt-4 space-y-1 border-t border-line pt-3">
          {breakdown.map((b) => (
            <div
              key={b.key}
              className="mono flex items-center justify-between text-[12px] text-steel"
            >
              <span>{b.label}</span>
              <span className="tabular text-ink">
                {fmtUsd(values[b.key] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[2px]"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}

function PlusConnector() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden -translate-x-1/2 items-center sm:flex">
      <span
        className="display flex h-8 w-8 items-center justify-center border border-line bg-paper text-[18px] text-steel"
        style={{ borderRadius: "999px" }}
      >
        +
      </span>
    </div>
  );
}

function SumConnector({ total }: { total: number }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <div className="h-3 w-px" style={{ backgroundColor: "var(--line)" }} />
      <div className="mono text-[11px] text-steel-soft">
        = {fmtUsd(total)} total leakage
      </div>
      <div className="h-3 w-px" style={{ backgroundColor: "var(--line)" }} />
    </div>
  );
}

function StatStrip({
  stats,
}: {
  stats: ReturnType<typeof getPortfolioStats>;
}) {
  // Distinct carriers/lanes across every invoice line, not just the ones
  // carrying leakage — this is "how big is the program," not "where does
  // it leak" (that's what stats.byCarrier/byLane are for, elsewhere).
  const carrierCount = new Set(INVOICE_LINES.map((l) => l.carrier)).size;
  const laneCount = new Set(
    INVOICE_LINES.map((l) => `${l.lane_origin}→${l.lane_destination}`)
  ).size;

  const items = [
    `${stats.invoiceCount} invoices processed`,
    `${stats.lineCount} charge lines audited`,
    `${carrierCount} carriers`,
    `${laneCount} trade lanes`,
    "100% coverage",
  ];
  return (
    <div
      className="mono flex h-9 w-full items-center justify-center gap-4 text-[11px] text-steel"
      style={{ backgroundColor: "var(--mist)", borderRadius: "var(--radius-sm)" }}
    >
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-4">
          {i > 0 && <span className="text-steel-soft">|</span>}
          {item}
        </span>
      ))}
    </div>
  );
}

// ── Leakage waterfall ────────────────────────────────────────

type WaterfallLevel = "portfolio" | "carrier" | "lane";

interface WaterfallBar {
  name: string;
  subLabel: string;
  value: number;
  base: number;
  top: number;
  kind: "start" | "drop" | "end";
}

const WATERFALL_CATEGORY_META: Record<
  LeakCategory,
  { name: string; subLabel: string }
> = {
  none: { name: "", subLabel: "" },
  off_contract_spot: { name: "Off-contract spot", subLabel: "SPOT REBOOK" },
  demurrage_detention: { name: "Demurrage / detention", subLabel: "DEM / DET" },
  rate_misapplication: { name: "Rate misapplication", subLabel: "RATE MISMATCH" },
  volume_rebate_shortfall: { name: "Volume rebate shortfall", subLabel: "MQC REBATE" },
  surcharge_error: { name: "Surcharge error", subLabel: "BAF / CAF" },
  accessorial_duplicate: { name: "Accessorial duplicate", subLabel: "DUPLICATE" },
};

const CARRIER_SHORT_NAMES: Record<string, string> = {
  OML: "ODYSSEY",
  ASC: "ATLAS",
};

const WATERFALL_YAXIS_WIDTH = 68;
const WATERFALL_MARGIN = { top: 30, right: 20, bottom: 60, left: 20 };

// Filters INVOICE_LINES down to the active carrier(s) / lane, then computes
// the same shape of figures getPortfolioStats() computes for the whole
// portfolio — so every view (portfolio, carrier, lane) runs through one
// code path instead of three separate hardcoded cases.
function computeFilteredWaterfallStats(lines: InvoiceLine[]) {
  const totalBilled = lines.reduce(
    (sum, l) => sum + l.billed_amount * (FX[l.billed_currency] || 1),
    0
  );
  const leakLines = lines.filter((l) => l.match_status === "mismatch");
  const totalLeak = leakLines.reduce((sum, l) => sum + l.leak_amount_usd, 0);

  const byCategory = new Map<LeakCategory, number>();
  for (const l of leakLines) {
    byCategory.set(
      l.leak_category,
      (byCategory.get(l.leak_category) ?? 0) + l.leak_amount_usd
    );
  }

  const invoiceCount = new Set(lines.map((l) => l.invoice_id)).size;

  return { totalBilled, totalLeak, byCategory, invoiceCount };
}

function buildWaterfallBars(
  stats: ReturnType<typeof computeFilteredWaterfallStats>
): WaterfallBar[] {
  const drops = Array.from(stats.byCategory.entries())
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  const bars: WaterfallBar[] = [
    {
      name: "Total invoiced",
      subLabel: `${stats.invoiceCount} INVOICE${stats.invoiceCount === 1 ? "" : "S"}`,
      value: stats.totalBilled,
      base: 0,
      top: stats.totalBilled,
      kind: "start",
    },
  ];

  let running = stats.totalBilled;
  for (const [category, value] of drops) {
    const meta = WATERFALL_CATEGORY_META[category];
    const top = running;
    running -= value;
    bars.push({
      name: meta.name,
      subLabel: meta.subLabel,
      value,
      base: running,
      top,
      kind: "drop",
    });
  }

  bars.push({
    name: "Net clean + recoverable",
    subLabel: "POST-AUDIT BASELINE",
    value: Math.max(0, stats.totalBilled - stats.totalLeak),
    base: 0,
    top: Math.max(0, stats.totalBilled - stats.totalLeak),
    kind: "end",
  });

  return bars;
}

// Greedily wraps a label onto two lines so nothing renders with an
// ellipsis — the x-axis has real estate budgeted for exactly this.
function wrapLabel(text: string, maxLineLen: number): [string, string?] {
  if (text.length <= maxLineLen) return [text];
  const words = text.split(" ");
  let line1 = "";
  let line2 = "";
  for (const w of words) {
    if (!line1 || (line1 + " " + w).trim().length <= maxLineLen) {
      line1 = (line1 + " " + w).trim();
    } else {
      line2 = (line2 + " " + w).trim();
    }
  }
  return line2 ? [line1, line2] : [line1];
}

function WaterfallAxisTick(props: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  chartData: WaterfallBar[];
}) {
  const { x = 0, y = 0, payload, chartData } = props;
  const bar = chartData.find((b) => b.name === payload?.value);
  if (!bar) return null;
  const nameLines = wrapLabel(bar.name, 16);
  const subLines = wrapLabel(bar.subLabel, 11);
  const subStartY = 14 + nameLines.length * 13 + 6;

  return (
    <g transform={`translate(${x},${y})`}>
      {nameLines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={14 + i * 13}
          textAnchor="middle"
          style={{ fontSize: 11, fontFamily: "Inter", fill: "var(--ink)" }}
        >
          {line}
        </text>
      ))}
      {subLines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={subStartY + i * 11}
          textAnchor="middle"
          style={{
            fontSize: 9.5,
            fontFamily: "IBM Plex Mono",
            fill: "var(--steel)",
            letterSpacing: "0.06em",
          }}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function WaterfallValueLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  index?: number;
  chartData: WaterfallBar[];
}) {
  const { x = 0, y = 0, width = 0, index, chartData } = props;
  const bar = index === undefined ? undefined : chartData[index];
  if (!bar) return null;

  const color =
    bar.kind === "start"
      ? "var(--ink)"
      : bar.kind === "end"
      ? "var(--green)"
      : "var(--leak)";
  const text = bar.kind === "drop" ? `-${fmtUsd(bar.value)}` : fmtUsd(bar.value);

  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      style={{ fontSize: 13, fontWeight: 600, fontFamily: "Inter", fill: color }}
    >
      {text}
    </text>
  );
}

function WaterfallLevelControl({
  value,
  onChange,
}: {
  value: WaterfallLevel;
  onChange: (v: WaterfallLevel) => void;
}) {
  const options: { key: WaterfallLevel; label: string }[] = [
    { key: "portfolio", label: "PORTFOLIO" },
    { key: "carrier", label: "CARRIER" },
    { key: "lane", label: "LANE" },
  ];
  return (
    <div className="mono inline-flex gap-1.5 text-[11px]">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="px-3 uppercase transition-colors"
            style={{
              height: 32,
              borderRadius: "var(--radius-sm)",
              backgroundColor: active ? "var(--ink)" : "var(--mist)",
              color: active ? "#fff" : "var(--steel)",
              border: active ? "2px solid var(--ink)" : "2px solid transparent",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CarrierToggleButtons({
  carriers,
  active,
  onToggle,
}: {
  carriers: string[];
  active: Set<string>;
  onToggle: (carrier: string) => void;
}) {
  return (
    <div className="mono inline-flex gap-1.5 text-[11px]">
      {carriers.map((c) => {
        const isActive = active.has(c);
        return (
          <button
            key={c}
            onClick={() => onToggle(c)}
            className="px-3 uppercase transition-colors"
            style={{
              height: 32,
              borderRadius: "var(--radius-sm)",
              backgroundColor: isActive ? "var(--ink)" : "var(--mist)",
              color: isActive ? "#fff" : "var(--steel)",
            }}
          >
            {CARRIER_SHORT_NAMES[c] ?? c}
          </button>
        );
      })}
    </div>
  );
}

function LaneSelect({
  lanes,
  value,
  onChange,
}: {
  lanes: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mono border border-line bg-white px-3 text-[11px] text-ink outline-none"
      style={{ height: 32, borderRadius: "var(--radius-sm)" }}
    >
      <option value="ALL">All lanes</option>
      {lanes.map((lane) => (
        <option key={lane} value={lane}>
          {formatLaneKey(lane)}
        </option>
      ))}
    </select>
  );
}

function WaterfallLegend() {
  const items: { color: string; label: string }[] = [
    { color: "var(--ink)", label: "Total invoiced" },
    { color: "var(--leak)", label: "Leak category (step down)" },
    { color: "var(--green)", label: "Net clean baseline" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5"
            style={{ backgroundColor: item.color, borderRadius: 2 }}
          />
          <span className="text-[12px] text-steel">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function LeakageWaterfall() {
  const [level, setLevel] = useState<WaterfallLevel>("portfolio");
  const [activeCarriers, setActiveCarriers] = useState<Set<string>>(
    () => new Set(Array.from(new Set(INVOICE_LINES.map((l) => l.carrier))))
  );
  const [lane, setLane] = useState<string>("ALL");

  const allCarriers = useMemo(
    () => Array.from(new Set(INVOICE_LINES.map((l) => l.carrier))),
    []
  );
  const allLanes = useMemo(
    () =>
      Array.from(
        new Set(INVOICE_LINES.map((l) => `${l.lane_origin}→${l.lane_destination}`))
      ),
    []
  );

  function toggleCarrier(carrier: string) {
    setActiveCarriers((prev) => {
      const next = new Set(prev);
      if (next.has(carrier)) {
        if (next.size === 1) return prev; // keep at least one active
        next.delete(carrier);
      } else {
        next.add(carrier);
      }
      return next;
    });
  }

  const filteredLines = useMemo(() => {
    if (level === "carrier") {
      return INVOICE_LINES.filter((l) => activeCarriers.has(l.carrier));
    }
    if (level === "lane" && lane !== "ALL") {
      const [origin, dest] = lane.split("→");
      return INVOICE_LINES.filter(
        (l) => l.lane_origin === origin && l.lane_destination === dest
      );
    }
    return INVOICE_LINES;
  }, [level, activeCarriers, lane]);

  const stats = useMemo(
    () => computeFilteredWaterfallStats(filteredLines),
    [filteredLines]
  );
  const data = useMemo(() => buildWaterfallBars(stats), [stats]);

  const filterKey = `${level}:${Array.from(activeCarriers).join(",")}:${lane}`;

  return (
    <Panel
      kicker="SPEND WATERFALL · Q2 2026"
      right={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <WaterfallLevelControl value={level} onChange={setLevel} />
          {level === "carrier" && (
            <CarrierToggleButtons
              carriers={allCarriers}
              active={activeCarriers}
              onToggle={toggleCarrier}
            />
          )}
          {level === "lane" && (
            <LaneSelect lanes={allLanes} value={lane} onChange={setLane} />
          )}
        </div>
      }
    >
      <h3 className="display text-[22px] font-bold text-ink">
        Total invoiced &rarr; leakage by category &rarr; net clean spend
      </h3>
      <p className="mt-1.5 text-[14px] text-steel">
        Every red step is a leak category the agent surfaced; the green
        landing bar is what the freight budget should have been.
      </p>

      <div
        className="mt-5"
        style={{ width: "100%", opacity: 1, transition: "opacity 300ms ease-out" }}
      >
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart
            key={filterKey}
            data={data}
            margin={WATERFALL_MARGIN}
            barCategoryGap="12%"
          >
            <XAxis
              dataKey="name"
              axisLine={{ stroke: "var(--line)" }}
              tickLine={false}
              interval={0}
              tick={(tickProps: object) => (
                <WaterfallAxisTick {...tickProps} chartData={data} />
              )}
            />
            <YAxis
              width={WATERFALL_YAXIS_WIDTH}
              axisLine={false}
              tickLine={false}
              tickCount={5}
              tick={{ fontSize: 11, fontFamily: "Inter", fill: "#4A5B72" }}
              tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`}
            />
            <Bar
              dataKey="base"
              stackId="waterfall"
              fill="transparent"
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-out"
            />
            <Bar
              dataKey="value"
              stackId="waterfall"
              radius={[2, 2, 0, 0]}
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-out"
              minPointSize={3}
            >
              {data.map((bar) => (
                <Cell
                  key={bar.name}
                  fill={
                    bar.kind === "start"
                      ? "var(--ink)"
                      : bar.kind === "end"
                      ? "var(--green)"
                      : "var(--leak)"
                  }
                />
              ))}
              <LabelList
                dataKey="value"
                content={(labelProps: object) => (
                  <WaterfallValueLabel {...labelProps} chartData={data} />
                )}
              />
            </Bar>
            <Line
              dataKey="top"
              type="stepAfter"
              stroke="var(--steel-soft)"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              isAnimationActive
              animationDuration={300}
              animationEasing="ease-out"
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <WaterfallLegend />
        <div className="mono text-[12px] text-steel">
          TOTAL LEAKAGE THIS VIEW &middot;{" "}
          <span className="font-semibold" style={{ color: "var(--leak)" }}>
            {fmtUsd(stats.totalLeak)}
          </span>
        </div>
      </div>
    </Panel>
  );
}

// ── Concentration panel ──────────────────────────────────────

type ConcentrationMode = "category" | "carrier" | "lane";

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="mono inline-flex overflow-hidden border border-line text-[10px]"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      {options.map((opt, i) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 transition-colors ${
            value === opt.key
              ? "bg-ink text-white"
              : "bg-white text-steel hover:bg-mist"
          } ${i > 0 ? "border-l border-line" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ConcentrationRow({
  label,
  sublabel,
  value,
  max,
  total,
}: {
  label: string;
  sublabel?: string;
  value: number;
  max: number;
  total: number;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const widthPct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-48 shrink-0">
        <div className="truncate text-[12.5px] text-ink" title={label}>
          {label}
        </div>
        {sublabel && (
          <div className="mono truncate text-[9px] text-steel-soft">
            {sublabel}
          </div>
        )}
      </div>
      <div
        className="h-2 flex-1 overflow-hidden bg-mist"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <div
          className="h-full"
          style={{
            width: `${widthPct}%`,
            backgroundColor: "var(--leak)",
            borderRadius: "var(--radius-sm)",
          }}
        />
      </div>
      <div className="mono tabular w-20 shrink-0 text-right text-[12px] text-ink">
        {fmtUsd(value, false)}
      </div>
      <div className="mono tabular w-12 shrink-0 text-right text-[11px] text-steel-soft">
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

function ConcentrationPanel({
  stats,
}: {
  stats: ReturnType<typeof getPortfolioStats>;
}) {
  const [mode, setMode] = useState<ConcentrationMode>("category");

  const rows = useMemo<
    { label: string; sublabel?: string; value: number }[]
  >(() => {
    if (mode === "category") {
      return Object.entries(stats.byCategory)
        .map(([key, value]) => ({
          label: LEAK_CATEGORY_LABELS[key as LeakCategory],
          value,
        }))
        .sort((a, b) => b.value - a.value);
    }
    if (mode === "carrier") {
      return Object.entries(stats.byCarrier)
        .map(([key, value]) => ({
          label: key,
          sublabel: CARRIER_NAMES[key],
          value,
        }))
        .sort((a, b) => b.value - a.value);
    }
    return Object.entries(stats.byLane)
      .map(([key, value]) => ({ label: formatLaneKey(key), value }))
      .sort((a, b) => b.value - a.value);
  }, [mode, stats]);

  const max = Math.max(...rows.map((r) => r.value), 0);

  return (
    <Panel
      kicker="LEAK CONCENTRATION"
      title="Where the leakage concentrates"
      right={
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { key: "category", label: "By category" },
            { key: "carrier", label: "By carrier" },
            { key: "lane", label: "By lane" },
          ]}
        />
      }
      bodyClassName="p-0"
    >
      <div className="flex flex-col xl:flex-row">
        <div className="flex-1 space-y-4 p-5">
          {rows.map((r) => (
            <ConcentrationRow
              key={r.label}
              label={r.label}
              sublabel={r.sublabel}
              value={r.value}
              max={max}
              total={stats.totalLeak}
            />
          ))}
        </div>

        <div className="w-full shrink-0 border-t border-line p-5 xl:w-64 xl:border-l xl:border-t-0">
          <div className="mono text-[10px] text-steel">6-MONTH TREND</div>
          <div className="mt-3 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={LEAK_TREND}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="leakFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--leak)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--leak)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(m: string) => m.toUpperCase()}
                  tick={{ fontSize: 9, fontFamily: "IBM Plex Mono", fill: "#A0AABC" }}
                />
                <Tooltip
                  formatter={(v) => fmtUsd(Number(v), false)}
                  labelFormatter={(l) => l}
                  contentStyle={{
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                    fontSize: 11,
                    fontFamily: "IBM Plex Mono",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="usd"
                  stroke="var(--leak)"
                  strokeWidth={2}
                  fill="url(#leakFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ── Pass 2 spend intelligence panels ──────────────────────────

function InsightPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-line bg-paper ${className}`}
      style={{
        borderRadius: "var(--radius-lg)",
        borderLeftWidth: 3,
        borderLeftColor: "var(--ink2)",
      }}
    >
      {children}
    </div>
  );
}

function InsightNote({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-4 flex items-start gap-3 bg-mist p-4"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      <Lightbulb size={15} className="mt-0.5 shrink-0" color="var(--steel)" />
      <p className="text-[12.5px] leading-relaxed text-steel">{children}</p>
    </div>
  );
}

function ViewLeakDetailLink({ leakIdx }: { leakIdx: number }) {
  return (
    <div className="mt-3 text-right">
      <Link
        to={leakIdx >= 0 ? `/detail?leak=${leakIdx}` : "/detail"}
        className="text-[12.5px] font-medium text-ink transition-colors hover:text-steel"
      >
        View leak detail →
      </Link>
    </div>
  );
}

// Extracts a short trigger phrase from a shipment's linked invoice evidence
// note — the underlying data doesn't carry a dedicated "trigger" field, so
// this reads it out of the existing evidence text rather than hardcoding it.
function triggerFor(shipment: (typeof SHIPMENT_LOG)[number]): string {
  const line = INVOICE_LINES.find(
    (l) => l.invoice_id === shipment.linked_invoice_id && l.charge_code === "O/F"
  );
  const note = (line?.evidence_note ?? "").toLowerCase();
  if (note.includes("blank sailing")) return "Blank sailing";
  if (note.includes("space constraint")) return "Space constraint";
  return "Carrier-initiated event";
}

function SpotExposurePanel({ spotLeakIdx }: { spotLeakIdx: number }) {
  const bookings = getSpotBookingsOnContractedLanes();
  const total = bookings.reduce((s, b) => s + b.avoidable_premium_usd, 0);

  return (
    <InsightPanel>
      <div className="p-6">
        <div className="mono text-[10px] text-steel">
          OFF-CONTRACT SPOT EXPOSURE
        </div>
        <div className="display mt-2 text-[18px] font-semibold text-ink">
          {bookings.length} spot bookings detected on contracted lanes
        </div>
        <div
          className="display tabular mt-1 text-[24px] font-bold"
          style={{ color: "var(--leak)" }}
        >
          {fmtUsd(total, false)}{" "}
          <span className="text-[13px] font-medium text-steel">
            avoidable premium
          </span>
        </div>
      </div>

      <div className="border-t border-line px-6 py-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
            <thead>
              <tr className="mono text-left text-[9px] text-steel-soft">
                <th className="pb-2 font-normal">DATE</th>
                <th className="pb-2 font-normal">LANE</th>
                <th className="pb-2 text-right font-normal">SPOT RATE</th>
                <th className="pb-2 text-right font-normal">CONTRACT RATE</th>
                <th className="pb-2 text-right font-normal">PREMIUM</th>
                <th className="pb-2 pl-3 font-normal">TRIGGER</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.shipment_id} className="border-t border-line">
                  <td className="mono tabular py-2.5 text-ink">
                    {b.shipment_date}
                  </td>
                  <td className="py-2.5 pr-3 text-ink">
                    {lanePair(b.lane_origin, b.lane_destination)}
                  </td>
                  <td className="mono tabular py-2.5 text-right text-ink">
                    {fmtUsd(b.actual_rate_usd, false)}
                  </td>
                  <td className="mono tabular py-2.5 text-right text-ink">
                    {fmtUsd(b.contracted_rate_usd ?? 0, false)}
                  </td>
                  <td
                    className="mono tabular py-2.5 text-right font-semibold"
                    style={{ color: "var(--leak)" }}
                  >
                    {fmtUsd(b.avoidable_premium_usd, false)}
                  </td>
                  <td className="py-2.5 pl-3 text-steel">
                    {triggerFor(b)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <InsightNote>
          Pattern detected — booking team did not invoke clause 5.1
          (carrier-rebooking protection) on either occasion. Both triggers
          were carrier-initiated events where contracted rates should have
          applied. Recommend: add cl. 5.1 checkpoint to booking SOP.
        </InsightNote>

        <ViewLeakDetailLink leakIdx={spotLeakIdx} />
      </div>
    </InsightPanel>
  );
}

interface TeuSegment {
  month: string;
  teu: number;
  cumStart: number;
  cumEnd: number;
}

function monthLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
  });
}

function TeuBuildupBar({
  segments,
  threshold,
}: {
  segments: TeuSegment[];
  threshold: number;
}) {
  const lastCum = segments[segments.length - 1]?.cumEnd ?? 0;
  const scaleMax = Math.max(lastCum, threshold) * 1.03;
  const thresholdPct = (threshold / scaleMax) * 100;

  return (
    <div className="mt-4">
      <div className="relative h-7">
        <div
          className="flex h-full gap-0.5 overflow-hidden"
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          {segments.map((seg, i) => {
            const beforeThreshold = Math.max(
              0,
              Math.min(seg.teu, threshold - seg.cumStart)
            );
            const afterThreshold = seg.teu - beforeThreshold;
            const segWidthPct = (seg.teu / scaleMax) * 100;
            return (
              <div
                key={seg.month}
                className="flex h-full"
                style={{ width: `${segWidthPct}%` }}
              >
                {beforeThreshold > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(beforeThreshold / seg.teu) * 100}%`,
                      backgroundColor: "var(--steel)",
                      opacity: 0.5 + i * 0.18,
                    }}
                  />
                )}
                {afterThreshold > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(afterThreshold / seg.teu) * 100}%`,
                      backgroundColor: "var(--green)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div
          className="absolute top-0 bottom-0 border-l-2 border-dashed"
          style={{ left: `${thresholdPct}%`, borderColor: "var(--ink)" }}
        />
      </div>

      <div className="mt-2 flex text-[10px]">
        {segments.map((seg) => (
          <div
            key={seg.month}
            className="mono truncate text-steel"
            style={{ width: `${(seg.teu / scaleMax) * 100}%` }}
          >
            {seg.month} &middot; {seg.teu.toLocaleString()} TEU
            {seg.cumEnd !== seg.teu && (
              <span className="text-steel-soft">
                {" "}
                — cum. {seg.cumEnd.toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="relative mt-1 h-3.5">
        <div
          className="mono absolute top-0 whitespace-nowrap text-[9px] text-steel-soft"
          style={{ right: `${100 - thresholdPct}%` }}
        >
          MQC THRESHOLD &middot; {threshold.toLocaleString()} TEU
        </div>
      </div>
    </div>
  );
}

function VolumeRebateGapPanel({ rebateLeakIdx }: { rebateLeakIdx: number }) {
  const rebate = getVolumeRebateAnalysis().find((r) => r.carrier === "ASC");
  if (!rebate) return null;

  const segments: TeuSegment[] = useMemo(() => {
    let cum = 0;
    return SHIPMENT_LOG.filter(
      (s) => s.carrier === "ASC" && s.booking_type === "contract"
    )
      .sort((a, b) => a.shipment_date.localeCompare(b.shipment_date))
      .map((s) => {
        const cumStart = cum;
        cum += s.teu;
        return {
          month: monthLabel(s.shipment_date),
          teu: s.teu,
          cumStart,
          cumEnd: cum,
        };
      });
  }, []);

  return (
    <InsightPanel>
      <div className="p-6">
        <div className="mono text-[10px] text-steel">VOLUME REBATE GAP</div>
        <div className="mono mt-2 text-[12px] text-ink">
          {CARRIER_NAMES[rebate.carrier] ?? rebate.carrier} ({rebate.carrier})
          <span className="text-steel"> &middot; {rebate.contract_id}</span>
        </div>

        <TeuBuildupBar segments={segments} threshold={rebate.threshold_teu} />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div
            className="border border-line p-3"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <div className="mono flex items-center gap-1.5 text-[9px] text-steel-soft">
              <CheckCircle2 size={12} color="var(--green)" />
              THRESHOLD CROSSED
            </div>
            <div className="mono tabular mt-1.5 text-[15px] font-semibold text-ink">
              {rebate.actual_teu.toLocaleString()} /{" "}
              {rebate.threshold_teu.toLocaleString()} TEU
            </div>
          </div>
          <div
            className="border border-line p-3"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <div className="mono text-[9px] text-steel-soft">REBATE OWED</div>
            <div
              className="mono tabular mt-1.5 text-[15px] font-semibold"
              style={{ color: "var(--leak)" }}
            >
              {fmtUsd(rebate.rebate_missed_usd, false)}
            </div>
          </div>
        </div>

        <InsightNote>
          Clause 6.2 entitles a 2% retroactive rebate on all Q2 ASC ocean
          freight once MQC is crossed. No rebate credit has been applied on
          any Q2 invoice. This insight required aggregating TEU across 3
          separate booking batches — no single invoice would surface this.
        </InsightNote>

        <ViewLeakDetailLink leakIdx={rebateLeakIdx} />
      </div>
    </InsightPanel>
  );
}

// ── Date period filter ───────────────────────────────────────

type Period = "1W" | "1M" | "3M" | "1Y" | "Custom";

interface CustomRange {
  from: string;
  to: string;
}

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "1Y", label: "1Y" },
  { key: "Custom", label: "Custom" },
];

function DateFilterControl({
  period,
  onChange,
  customRange,
  onCustomRangeChange,
  onApplyCustom,
}: {
  period: Period;
  onChange: (p: Period) => void;
  customRange: CustomRange;
  onCustomRangeChange: (r: CustomRange) => void;
  onApplyCustom: () => void;
}) {
  return (
    <div className="relative">
      <div
        className="mono inline-flex overflow-hidden border border-line text-[11px]"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        {PERIOD_OPTIONS.map((opt, i) => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`flex items-center justify-center px-3 transition-colors ${
              period === opt.key
                ? "bg-ink text-white"
                : "bg-mist text-steel hover:bg-mist2"
            } ${i > 0 ? "border-l border-line" : ""}`}
            style={{ height: 28 }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {period === "Custom" && (
        <div
          className="absolute right-0 top-[34px] z-20 w-64 border border-line bg-white p-4 shadow-lg"
          style={{ borderRadius: "var(--radius-md)" }}
        >
          <div className="mono text-[9px] text-steel-soft">CUSTOM RANGE</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1">
              <div className="mono text-[9px] text-steel-soft">FROM</div>
              <input
                type="date"
                value={customRange.from}
                onChange={(e) =>
                  onCustomRangeChange({ ...customRange, from: e.target.value })
                }
                className="mt-1 w-full border border-line px-2 py-1 text-[12px] text-ink outline-none focus:border-ink"
                style={{ borderRadius: "var(--radius-sm)" }}
              />
            </div>
            <div className="flex-1">
              <div className="mono text-[9px] text-steel-soft">TO</div>
              <input
                type="date"
                value={customRange.to}
                onChange={(e) =>
                  onCustomRangeChange({ ...customRange, to: e.target.value })
                }
                className="mt-1 w-full border border-line px-2 py-1 text-[12px] text-ink outline-none focus:border-ink"
                style={{ borderRadius: "var(--radius-sm)" }}
              />
            </div>
          </div>
          <button
            onClick={onApplyCustom}
            className="mono mt-3 w-full bg-ink py-2 text-[11px] text-white transition-opacity hover:opacity-90"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// ── Screen ───────────────────────────────────────────────────

export default function PortfolioOverview() {
  const stats = getPortfolioStats();
  const leaks = useMemo(() => collectLeaks(), []);
  const spotLeakIdx = leaks.findIndex(
    (l) => l.line.leak_category === "off_contract_spot"
  );
  const rebateLeakIdx = leaks.findIndex(
    (l) => l.line.leak_category === "volume_rebate_shortfall"
  );

  const [period, setPeriod] = useState<Period>("3M");
  const [customRange, setCustomRange] = useState<CustomRange>({
    from: "2026-05-01",
    to: "2026-07-15",
  });
  const [fading, setFading] = useState(false);

  // This is demo data — every period shows the same figures. The fade is
  // purely theatrical, so the screen still *feels* like it refreshed.
  function triggerFade() {
    setFading(true);
    window.setTimeout(() => setFading(false), 200);
  }

  function handlePeriodChange(p: Period) {
    if (p === period) return;
    setPeriod(p);
    triggerFade();
  }

  return (
    <>
      <ScreenFrame
        step={STEPS[0]}
        title="How big is the problem, and where does it concentrate?"
        description="Start at the top: total leakage across the portfolio, split by detection pass, and where it concentrates by category, carrier, and lane."
        right={
          <DateFilterControl
            period={period}
            onChange={handlePeriodChange}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            onApplyCustom={triggerFade}
          />
        }
      >
        <div
          className="space-y-6"
          style={{ opacity: fading ? 0 : 1, transition: "opacity 200ms ease" }}
        >
          <div className="space-y-4">
            <HeroLeakageCard stats={stats} />
            <SumConnector total={stats.totalLeak} />
            <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-2">
              <PassBreakdownCard
                kicker="PASS 1 · CONTRACT COMPLIANCE"
                question="Was the bill correct?"
                amount={stats.pass1Leak}
                breakdown={PASS1_BREAKDOWN}
                values={stats.byCategory}
                accent="var(--steel)"
              />
              <PlusConnector />
              <PassBreakdownCard
                kicker="PASS 2 · SPEND INTELLIGENCE"
                question="Was the decision correct?"
                amount={stats.pass2Leak}
                breakdown={PASS2_BREAKDOWN}
                values={stats.byCategory}
                accent="var(--ink2)"
                tag="CROSS-INVOICE"
              />
            </div>
            <StatStrip stats={stats} />
          </div>

          <LeakageWaterfall />

          <ConcentrationPanel stats={stats} />

          <div>
            <div className="mono mb-3 text-[10px] text-steel">
              SPEND INTELLIGENCE ENGINE &middot; PASS 2
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SpotExposurePanel spotLeakIdx={spotLeakIdx} />
              <VolumeRebateGapPanel rebateLeakIdx={rebateLeakIdx} />
            </div>
          </div>
        </div>
      </ScreenFrame>
      <StepFooter next="/documents" />
    </>
  );
}
