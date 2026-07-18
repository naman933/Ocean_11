import { useEffect, useMemo, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ScreenFrame, StepFooter } from "../components/AppShell";
import Panel from "../components/Panel";
import { STEPS } from "../lib/nav";
import { clauseFor, collectLeaks, faultTrail, type Leak } from "../lib/dispute";
import {
  LEAK_CATEGORY_LABELS,
  PASS_LABELS,
  SHIPMENT_LOG,
  fmtMoney,
  fmtUsd,
  getInvoices,
  getVolumeRebateAnalysis,
  lanePair,
} from "../lib/freight-data";

type ReasoningTone = "neutral" | "leak" | "green";

// ── Small shared bits ────────────────────────────────────────

function Tag({
  children,
  bg,
  color,
}: {
  children: ReactNode;
  bg: string;
  color: string;
}) {
  return (
    <span
      className="mono inline-flex items-center px-2 py-1 text-[10px]"
      style={{ backgroundColor: bg, color, borderRadius: "var(--radius-sm)" }}
    >
      {children}
    </span>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mono text-[9px] text-steel-soft">{label}</div>
      <div className="mono tabular mt-1 truncate text-[12px] text-ink">
        {value}
      </div>
    </div>
  );
}

// ── Scope + carousel controls ────────────────────────────────

function ScopeControls({
  invoices,
  scopeId,
  onScopeChange,
  index,
  total,
  onPrev,
  onNext,
}: {
  invoices: ReturnType<typeof getInvoices>;
  scopeId: string;
  onScopeChange: (id: string) => void;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <select
        value={scopeId}
        onChange={(e) => onScopeChange(e.target.value)}
        className="mono border border-line bg-white px-3 py-2 text-[11px] text-ink outline-none"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <option value="">All invoices</option>
        {invoices.map((inv) => (
          <option key={inv.invoice_id} value={inv.invoice_id}>
            {inv.invoice_id} &middot; {inv.mismatch_count} leak
            {inv.mismatch_count === 1 ? "" : "s"}
          </option>
        ))}
      </select>

      <div
        className="mono flex items-center gap-1 border border-line bg-white text-[11px] text-ink"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <button
          onClick={onPrev}
          disabled={index <= 0}
          className="flex h-8 w-8 items-center justify-center border-r border-line transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="tabular px-3 whitespace-nowrap">
          Leak {total === 0 ? 0 : index + 1} of {total}
        </span>
        <button
          onClick={onNext}
          disabled={index >= total - 1}
          className="flex h-8 w-8 items-center justify-center border-l border-line transition-colors hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Hero leak card ───────────────────────────────────────────

function HeroLeakCard({ leak }: { leak: Leak }) {
  const { line } = leak;
  const isPass2 = line.pass_type === "pass2";
  return (
    <div>
      {isPass2 && (
        <div
          className="mono flex items-center gap-2 px-6 py-2 text-[10px] text-white"
          style={{
            backgroundColor: "var(--ink2)",
            borderTopLeftRadius: "var(--radius-lg)",
            borderTopRightRadius: "var(--radius-lg)",
          }}
        >
          SPEND INTELLIGENCE &middot; This finding required cross-invoice
          analysis
        </div>
      )}
      <div
        className="border border-line bg-paper p-6"
        style={{
          borderRadius: isPass2 ? "0 0 var(--radius-lg) var(--radius-lg)" : "var(--radius-lg)",
          borderTop: isPass2 ? "none" : undefined,
          borderLeftWidth: 6,
          borderLeftColor: "var(--leak)",
        }}
      >
      <div className="flex flex-wrap items-center gap-2">
        <Tag bg="var(--leak-soft)" color="var(--leak)">
          {LEAK_CATEGORY_LABELS[line.leak_category]}
        </Tag>
        <Tag bg="var(--mist2)" color="var(--steel)">
          {PASS_LABELS[line.pass_type]}
        </Tag>
      </div>

      <h2 className="display mt-3 text-[20px] font-semibold text-ink">
        {line.charge_description}
      </h2>

      <div className="mono mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-steel">
        <span>{line.invoice_id}</span>
        <span className="text-steel-soft">&middot;</span>
        <span>{line.carrier}</span>
        <span className="text-steel-soft">&middot;</span>
        <span>{lanePair(line.lane_origin, line.lane_destination)}</span>
        <span className="text-steel-soft">&middot;</span>
        <span>{line.container_type}</span>
        <span className="text-steel-soft">&middot;</span>
        <span>{line.invoice_date}</span>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-ink">
        {line.evidence_note}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <span className="mono text-[11px] text-steel">RECOVERABLE</span>
        <span
          className="display tabular text-[28px] font-bold"
          style={{ color: "var(--leak)" }}
        >
          {fmtUsd(line.leak_amount_usd, false)}
        </span>
      </div>
      </div>
    </div>
  );
}

// ── Fault reasoning ──────────────────────────────────────────

const TONE_COLOR: Record<ReasoningTone, { fg: string; bg: string }> = {
  neutral: { fg: "var(--steel)", bg: "var(--mist2)" },
  leak: { fg: "var(--leak)", bg: "var(--leak-soft)" },
  green: { fg: "var(--green)", bg: "var(--green-soft)" },
};

function FaultReasoningPanel({ leak }: { leak: Leak }) {
  const steps = faultTrail(leak);
  return (
    <Panel kicker="AGENT REASONING" title="Step by step">
      <div>
        {steps.map((step, i) => {
          const tone = TONE_COLOR[step.tone];
          return (
            <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
              {i < steps.length - 1 && (
                <div
                  className="absolute left-[13px] top-7 bottom-0 w-px"
                  style={{ backgroundColor: "var(--line)" }}
                />
              )}
              <div
                className="mono flex h-7 w-7 shrink-0 items-center justify-center text-[11px] font-semibold"
                style={{
                  borderRadius: "9999px",
                  backgroundColor: tone.bg,
                  color: tone.fg,
                  border: `1px solid ${tone.fg}`,
                }}
              >
                {i + 1}
              </div>
              <div className="pt-0.5">
                <div className="text-[14px] font-semibold text-ink">
                  {step.label}
                </div>
                <div className="mt-1 text-[14px] leading-relaxed text-steel">
                  {step.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ── Cross-invoice context (Pass 2 only) ───────────────────────

function monthLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
  });
}

function TypePill({ isSpot }: { isSpot: boolean }) {
  return (
    <span
      className="mono inline-flex items-center px-1.5 py-0.5 text-[9px]"
      style={{
        backgroundColor: isSpot ? "var(--leak-soft)" : "var(--green-soft)",
        color: isSpot ? "var(--leak)" : "var(--green)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {isSpot ? "SPOT" : "CONTRACT"}
    </span>
  );
}

function SpotCrossInvoiceBody({ leak }: { leak: Leak }) {
  const carrierShipments = SHIPMENT_LOG.filter(
    (s) => s.carrier === leak.line.carrier
  );
  const spotOnContract = carrierShipments.filter(
    (s) => s.booking_type === "spot" && s.contracted_rate_available
  );
  const combinedPremium = spotOnContract.reduce(
    (sum, s) => sum + s.avoidable_premium_usd,
    0
  );
  const sortedSpot = [...spotOnContract].sort((a, b) =>
    a.shipment_date.localeCompare(b.shipment_date)
  );
  const thisShipment = carrierShipments.find(
    (s) => s.linked_invoice_id === leak.line.invoice_id
  );
  const isRecurring = thisShipment
    ? sortedSpot.findIndex((s) => s.shipment_id === thisShipment.shipment_id) > 0
    : false;

  return (
    <>
      <div className="mono mb-3 text-[10px] text-steel-soft">
        RELATED SHIPMENTS
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
          <thead>
            <tr className="mono text-left text-[9px] text-steel-soft">
              <th className="pb-2 font-normal">DATE</th>
              <th className="pb-2 font-normal">LANE</th>
              <th className="pb-2 font-normal">TYPE</th>
              <th className="pb-2 text-right font-normal">RATE</th>
              <th className="pb-2 pl-3 font-normal">CONTRACT?</th>
              <th className="pb-2 text-right font-normal">PREMIUM</th>
            </tr>
          </thead>
          <tbody>
            {carrierShipments.map((s) => {
              const isSpot = s.booking_type === "spot";
              return (
                <tr
                  key={s.shipment_id}
                  className="border-t border-line"
                  style={{
                    backgroundColor: isSpot ? "var(--leak-soft)" : undefined,
                  }}
                >
                  <td className="mono tabular py-2 text-ink">
                    {s.shipment_date}
                  </td>
                  <td className="py-2 pr-3 text-ink">
                    {lanePair(s.lane_origin, s.lane_destination)}
                  </td>
                  <td className="py-2 pr-3">
                    <TypePill isSpot={isSpot} />
                  </td>
                  <td className="mono tabular py-2 text-right text-ink">
                    {fmtUsd(s.actual_rate_usd, false)}
                  </td>
                  <td className="py-2 pl-3 text-steel">
                    {s.contracted_rate_available ? "Yes" : "No"}
                  </td>
                  <td className="mono tabular py-2 text-right text-ink">
                    {s.avoidable_premium_usd > 0
                      ? fmtUsd(s.avoidable_premium_usd, false)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-steel">
        The agent compared this booking against {carrierShipments.length}{" "}
        shipments in Q2 and identified {spotOnContract.length} instances
        where spot rates were paid on lanes with active contracts. Combined
        avoidable premium: {fmtUsd(combinedPremium, false)}.
      </p>
      {isRecurring && (
        <p
          className="mt-2 text-[12.5px] font-medium leading-relaxed"
          style={{ color: "var(--leak)" }}
        >
          This is a recurring pattern — not an isolated incident. Recommend
          process intervention.
        </p>
      )}
    </>
  );
}

function RebateCrossInvoiceBody({ leak }: { leak: Leak }) {
  const rebate = getVolumeRebateAnalysis().find(
    (r) => r.carrier === leak.line.carrier
  );

  let cum = 0;
  const rows = SHIPMENT_LOG.filter(
    (s) => s.carrier === leak.line.carrier && s.booking_type === "contract"
  )
    .sort((a, b) => a.shipment_date.localeCompare(b.shipment_date))
    .map((s) => {
      const cumStart = cum;
      cum += s.teu;
      const cumEnd = cum;
      const threshold = rebate?.threshold_teu ?? 0;
      return {
        ...s,
        cumStart,
        cumEnd,
        crosses: cumStart < threshold && cumEnd >= threshold,
      };
    });

  if (!rebate) return null;

  const maxCum = rows[rows.length - 1]?.cumEnd ?? 1;
  const crossingRow = rows.find((r) => r.crosses);

  return (
    <>
      <div className="mono mb-3 text-[10px] text-steel-soft">
        TEU ACCUMULATION TIMELINE
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.shipment_id}
            className="flex items-center gap-3 p-2"
            style={{
              backgroundColor: r.crosses ? "var(--green-soft)" : undefined,
              borderRadius: "var(--radius-sm)",
            }}
          >
            <div className="mono tabular w-20 shrink-0 text-[11px] text-steel">
              {r.shipment_date}
            </div>
            <div className="relative h-2 flex-1 overflow-hidden bg-mist" style={{ borderRadius: "var(--radius-sm)" }}>
              <div
                className="h-full"
                style={{
                  width: `${(r.cumEnd / maxCum) * 100}%`,
                  backgroundColor:
                    r.cumEnd >= rebate.threshold_teu
                      ? "var(--green)"
                      : "var(--steel)",
                }}
              />
              <div
                className="absolute top-0 bottom-0 border-l-2 border-dashed"
                style={{
                  left: `${(rebate.threshold_teu / maxCum) * 100}%`,
                  borderColor: "var(--ink)",
                }}
              />
            </div>
            <div className="mono tabular w-36 shrink-0 text-right text-[11px] text-ink">
              +{r.teu.toLocaleString()} TEU{" "}
              <span className="text-steel-soft">
                &middot; cum {r.cumEnd.toLocaleString()}
              </span>
            </div>
            {r.crosses && (
              <CheckCircle2 size={14} color="var(--green)" className="shrink-0" />
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-steel">
        The agent tracked cumulative volume across {rows.length}{" "}
        {leak.line.carrier} booking batches over Q2 2026. The MQC threshold
        of {rebate.threshold_teu.toLocaleString()} TEU was crossed in{" "}
        {crossingRow ? monthLabel(crossingRow.shipment_date) : "Q2"},
        triggering eligibility for a {rebate.rebate_pct}% retroactive rebate
        under {rebate.clause_ref.replace("cl.", "clause")}.
      </p>
    </>
  );
}

function CrossInvoiceContextPanel({ leak }: { leak: Leak }) {
  if (leak.line.pass_type !== "pass2") return null;

  return (
    <div
      className="border border-line bg-paper"
      style={{
        borderRadius: "var(--radius-lg)",
        borderLeftWidth: 3,
        borderLeftColor: "var(--ink2)",
      }}
    >
      <div className="border-b border-line px-6 py-5">
        <div className="mono text-[10px] text-steel">
          CROSS-INVOICE CONTEXT
        </div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-steel">
          This insight was generated by analyzing multiple invoices and
          shipments — not from a single document comparison.
        </p>
      </div>
      <div className="p-6">
        {leak.line.leak_category === "off_contract_spot" && (
          <SpotCrossInvoiceBody leak={leak} />
        )}
        {leak.line.leak_category === "volume_rebate_shortfall" && (
          <RebateCrossInvoiceBody leak={leak} />
        )}
      </div>
    </div>
  );
}

// ── Right column panels ──────────────────────────────────────

function ClausePanel({ leak }: { leak: Leak }) {
  const clause = clauseFor(leak.line.leak_category);
  return (
    <Panel kicker={clause.ref} title="Contract clause cited">
      <blockquote
        className="border-l-2 bg-mist p-4 text-[13px] italic leading-relaxed text-steel"
        style={{ borderLeftColor: "var(--steel-soft)", borderRadius: "var(--radius-sm)" }}
      >
        &ldquo;{clause.text}&rdquo;
      </blockquote>
    </Panel>
  );
}

function SourceInvoicePanel({ leak }: { leak: Leak }) {
  const { line, invoice } = leak;
  return (
    <Panel kicker={invoice.invoice_id} title="Source invoice">
      <div className="grid grid-cols-2 gap-4 border-b border-line pb-4">
        <MetaField label="CARRIER" value={invoice.carrier} />
        <MetaField label="B/L" value={invoice.bl_no} />
        <MetaField label="CONTAINER" value={invoice.container_no} />
        <MetaField label="DATE" value={invoice.invoice_date} />
      </div>

      <div className="mt-4 border-b border-line pb-4">
        <div className="mono text-[10px] text-steel-soft">
          {line.charge_code} &middot; {line.charge_description}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[12px] text-steel">Billed</span>
          <span className="mono tabular text-[13px] text-ink">
            {fmtMoney(line.billed_amount, line.billed_currency)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[12px] text-steel">Contracted</span>
          <span className="mono tabular text-[13px] text-ink">
            {fmtMoney(line.contract_amount, line.contract_currency)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[12px] text-steel">Delta</span>
          <span
            className="mono tabular text-[13px] font-semibold"
            style={{ color: "var(--leak)" }}
          >
            +{fmtUsd(line.leak_amount_usd, false)}
          </span>
        </div>
      </div>

      <Link
        to={`/documents?inv=${invoice.invoice_id}`}
        className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink transition-colors hover:text-steel"
      >
        <ArrowLeft size={13} />
        View in Source Documents
      </Link>
    </Panel>
  );
}

// ── Screen ───────────────────────────────────────────────────

export default function LeakDetail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const invoices = useMemo(() => getInvoices(), []);

  const scopeId = searchParams.get("inv") ?? "";
  const leaks = useMemo(() => {
    if (!scopeId) return collectLeaks();
    const scoped = invoices.filter((i) => i.invoice_id === scopeId);
    return collectLeaks(scoped);
  }, [scopeId, invoices]);

  const rawIdx = parseInt(searchParams.get("leak") ?? "0", 10);
  const leakIdx = Math.min(
    Math.max(Number.isFinite(rawIdx) ? rawIdx : 0, 0),
    Math.max(leaks.length - 1, 0)
  );
  const leak = leaks[leakIdx];

  function goToIndex(idx: number) {
    const next = new URLSearchParams(searchParams);
    next.set("leak", String(idx));
    setSearchParams(next, { replace: true });
  }

  function handleScopeChange(id: string) {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("inv", id);
    else next.delete("inv");
    next.set("leak", "0");
    setSearchParams(next, { replace: true });
  }

  // Make the leak index explicit in the URL (defaults to the highest-value
  // leak in scope) instead of relying on a hidden fallback.
  useEffect(() => {
    if (!searchParams.get("leak")) {
      const next = new URLSearchParams(searchParams);
      next.set("leak", "0");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ScreenFrame
        step={STEPS[3]}
        title="One leak, fully explained."
        description="Every claim traces back to a specific contract clause and a step-by-step fault trail."
        right={
          <ScopeControls
            invoices={invoices}
            scopeId={scopeId}
            onScopeChange={handleScopeChange}
            index={leakIdx}
            total={leaks.length}
            onPrev={() => goToIndex(Math.max(0, leakIdx - 1))}
            onNext={() => goToIndex(Math.min(leaks.length - 1, leakIdx + 1))}
          />
        }
      >
        {!leak ? (
          <div className="border border-dashed border-line py-24 text-center text-steel">
            No leaks found on {scopeId || "this scope"}. Switch to All
            invoices to keep browsing.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-7">
              <HeroLeakCard leak={leak} />
              <FaultReasoningPanel leak={leak} />
              <CrossInvoiceContextPanel leak={leak} />
            </div>
            <div className="space-y-6 xl:col-span-5">
              <ClausePanel leak={leak} />
              <SourceInvoicePanel leak={leak} />
            </div>
          </div>
        )}
      </ScreenFrame>
      <StepFooter prev="/reasoning" next="/recovery" />
    </>
  );
}
