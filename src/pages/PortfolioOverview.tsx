import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  Cell,
  ComposedChart,
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
  INVOICE_LINES,
  LEAK_CATEGORY_LABELS,
  LEAK_TREND,
  PASS_LABELS,
  SHIPMENT_LOG,
  fmtUsd,
  getPortfolioStats,
  getSpotBookingsOnContractedLanes,
  getVolumeRebateAnalysis,
  lanePair,
  laneLabel,
  type LeakCategory,
  type PassType,
} from "../lib/freight-data";

// ── KPI hero card ────────────────────────────────────────────

function KpiCard({
  kicker,
  value,
  sub,
  accent,
  trend,
  tag,
}: {
  kicker: string;
  value: string;
  sub: string;
  accent: string;
  trend?: string;
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
          {trend && (
            <span
              className="mono rounded-sm px-1.5 py-0.5 text-[9px]"
              style={{ backgroundColor: "var(--leak-soft)", color: "var(--leak)" }}
            >
              {trend}
            </span>
          )}
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
          className="display tabular mt-3 text-[44px] font-bold leading-none"
          style={{ color: accent }}
        >
          {value}
        </div>
        <div className="mt-2 text-[12px] leading-snug text-steel">{sub}</div>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[2px]"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}

// ── Leakage waterfall ────────────────────────────────────────

interface WaterfallBar {
  name: string;
  base: number;
  value: number;
  top: number;
  pctOfTotal: number;
  kind: "total" | "leak" | "clean";
  pass: PassType | null;
  category?: LeakCategory;
}

// Fixed left-to-right order for the cascade — matches the standard
// consulting waterfall reading order (Pass 1 categories, then Pass 2).
const WATERFALL_CATEGORIES: { key: LeakCategory; label: string }[] = [
  { key: "rate_misapplication", label: "Rate Errors" },
  { key: "surcharge_error", label: "Surcharge Errors" },
  { key: "demurrage_detention", label: "D&D Overcharges" },
  { key: "accessorial_duplicate", label: "Duplicate Charges" },
  { key: "off_contract_spot", label: "Spot Exposure" },
  { key: "volume_rebate_shortfall", label: "Rebate Shortfall" },
];

const WATERFALL_CHART_MIN_WIDTH = 720;
const WATERFALL_YAXIS_WIDTH = 64;
const WATERFALL_MARGIN = { top: 24, right: 16, left: 8, bottom: 8 };

function buildWaterfallData(
  stats: ReturnType<typeof getPortfolioStats>
): WaterfallBar[] {
  // Each category's pass is read off the data itself (the first invoice
  // line carrying that leak_category) rather than hardcoded, so the
  // Pass 1 / Pass 2 grouping stays correct if the underlying data changes.
  const passForCategory = (key: LeakCategory): PassType | null =>
    INVOICE_LINES.find((l) => l.leak_category === key)?.pass_type ?? null;

  const bars: WaterfallBar[] = [
    {
      name: "Total Spend",
      base: 0,
      value: stats.totalBilled,
      top: stats.totalBilled,
      pctOfTotal: 100,
      kind: "total",
      pass: null,
    },
  ];

  let running = stats.totalBilled;
  for (const cat of WATERFALL_CATEGORIES) {
    const amount = stats.byCategory[cat.key] ?? 0;
    const top = running;
    running -= amount;
    bars.push({
      name: cat.label,
      base: running,
      value: amount,
      top,
      pctOfTotal: (amount / stats.totalBilled) * 100,
      kind: "leak",
      pass: passForCategory(cat.key),
      category: cat.key,
    });
  }

  const cleanSpend = stats.totalBilled - stats.totalLeak;
  bars.push({
    name: "Clean Spend",
    base: 0,
    value: cleanSpend,
    top: cleanSpend,
    pctOfTotal: (cleanSpend / stats.totalBilled) * 100,
    kind: "clean",
    pass: null,
  });

  return bars;
}

function WaterfallTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: WaterfallBar }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const bar = payload[0].payload;

  return (
    <div
      className="border border-line bg-white px-3 py-2.5"
      style={{ borderRadius: "var(--radius-sm)", minWidth: 190 }}
    >
      <div className="text-[12.5px] font-semibold text-ink">{bar.name}</div>
      <div className="mono tabular mt-1.5 text-[12px] text-ink">
        {fmtUsd(bar.value, false)}
      </div>
      <div className="mono mt-0.5 text-[9.5px] text-steel-soft">
        {bar.pctOfTotal.toFixed(1)}% of total spend
      </div>
      {bar.pass && (
        <div
          className="mono mt-1.5 text-[9px]"
          style={{ color: bar.pass === "pass2" ? "var(--ink2)" : "var(--steel)" }}
        >
          {bar.pass === "pass1" ? "PASS 1" : "PASS 2"} &middot;{" "}
          {PASS_LABELS[bar.pass]}
        </div>
      )}
    </div>
  );
}

function LeakageWaterfall({
  stats,
}: {
  stats: ReturnType<typeof getPortfolioStats>;
}) {
  const data = useMemo(() => buildWaterfallData(stats), [stats]);

  return (
    <Panel kicker="SPEND LEAKAGE WATERFALL">
      <p className="text-[14px] text-steel">
        From total spend to recoverable value &mdash; where the money leaks
      </p>

      <div className="mt-5 overflow-x-auto">
        <div style={{ minWidth: WATERFALL_CHART_MIN_WIDTH }}>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={WATERFALL_MARGIN}>
                <defs>
                  <pattern
                    id="spotStripe"
                    width="6"
                    height="6"
                    patternTransform="rotate(45)"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="6" height="6" fill="var(--leak)" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="6"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="2"
                    />
                  </pattern>
                </defs>
                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: "var(--line)" }}
                  tickLine={false}
                  interval={0}
                  tick={{ fontSize: 12, fontFamily: "Inter", fill: "#4A5B72" }}
                />
                <YAxis
                  width={WATERFALL_YAXIS_WIDTH}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontFamily: "Inter", fill: "#4A5B72" }}
                  tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`}
                />
                <Tooltip
                  content={<WaterfallTooltip />}
                  cursor={{ fill: "var(--mist)" }}
                />
                <Bar
                  dataKey="base"
                  stackId="waterfall"
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="value"
                  stackId="waterfall"
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                  minPointSize={2}
                >
                  {data.map((bar) => (
                    <Cell
                      key={bar.name}
                      fill={
                        bar.kind !== "leak"
                          ? "var(--green)"
                          : bar.category === "off_contract_spot"
                          ? "url(#spotStripe)"
                          : "var(--leak)"
                      }
                    />
                  ))}
                </Bar>
                <Line
                  dataKey="top"
                  type="stepAfter"
                  stroke="var(--steel-soft)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                  legendType="none"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div
            className="flex"
            style={{
              paddingLeft: WATERFALL_YAXIS_WIDTH + WATERFALL_MARGIN.left,
              paddingRight: WATERFALL_MARGIN.right,
            }}
          >
            <div style={{ width: "12.5%" }} />
            <div style={{ width: "50%" }} className="text-center">
              <div
                className="border-t"
                style={{ borderColor: "var(--steel-soft)" }}
              />
              <div className="mono mt-1.5 text-[10px] text-steel">
                PASS 1 &middot; CONTRACT COMPLIANCE
              </div>
            </div>
            <div style={{ width: "25%" }} className="text-center">
              <div className="border-t" style={{ borderColor: "var(--ink2)" }} />
              <div
                className="mono mt-1.5 text-[10px]"
                style={{ color: "var(--ink2)" }}
              >
                PASS 2 &middot; SPEND INTELLIGENCE
              </div>
            </div>
            <div style={{ width: "12.5%" }} />
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ── Concentration panel ──────────────────────────────────────

type ConcentrationMode = "category" | "carrier" | "lane";

const CARRIER_NAMES: Record<string, string> = {
  OML: "Odyssey Maritime Lines",
  ASC: "Atlas Sea Carriers",
};

function formatLaneKey(key: string): string {
  const [origin, dest] = key.split("→");
  return origin && dest ? `${laneLabel(origin)} → ${laneLabel(dest)}` : key;
}

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

  return (
    <>
      <ScreenFrame
        step={STEPS[0]}
        title="How big is the problem, and where does it concentrate?"
        description="Start at the top: total leakage across the portfolio, split by detection pass, and where it concentrates by category, carrier, and lane."
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              kicker="Leakage identified"
              value={fmtUsd(stats.totalLeak, false)}
              sub={`${(stats.leakRate * 100).toFixed(1)}% of total spend audited`}
              accent="var(--leak)"
              trend="+18.4% vs May"
            />
            <KpiCard
              kicker="Pass 1 · Compliance"
              value={fmtUsd(stats.pass1Leak, false)}
              sub="rate, surcharge, D&D, duplicate errors"
              accent="var(--ink)"
            />
            <KpiCard
              kicker="Pass 2 · Intelligence"
              value={fmtUsd(stats.pass2Leak, false)}
              sub="spot exposure, rebate shortfall"
              accent="var(--ink)"
              tag="CROSS-INVOICE"
            />
            <KpiCard
              kicker="Invoice coverage"
              value="100%"
              sub={`${stats.lineCount} lines audited · ${stats.invoiceCount} invoices`}
              accent="var(--green)"
            />
          </div>

          <LeakageWaterfall stats={stats} />

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
