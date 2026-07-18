import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ScreenFrame, StepFooter } from "../components/AppShell";
import Panel from "../components/Panel";
import StatusDot from "../components/StatusDot";
import StatusPill from "../components/StatusPill";
import { STEPS } from "../lib/nav";
import {
  RATE_CARD,
  findContract,
  fmtMoney,
  getInvoices,
  lanePair,
  laneLabel,
  type InvoiceSummary,
  type RateCardRow,
} from "../lib/freight-data";

const DEFAULT_INVOICE_ID = "INV-OML-88213";

// ── Invoice picker ───────────────────────────────────────────

function InvoicePicker({
  invoices,
  selectedId,
  onChange,
}: {
  invoices: InvoiceSummary[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
      className="mono border border-line bg-white px-3 py-2 text-[11px] text-ink outline-none"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      {invoices.map((inv) => (
        <option key={inv.invoice_id} value={inv.invoice_id}>
          {inv.invoice_id} &middot; {lanePair(inv.lane_origin, inv.lane_destination)}
        </option>
      ))}
    </select>
  );
}

// ── Contract rate card panel ─────────────────────────────────

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 last:border-b-0">
      <span className="text-[12.5px] text-steel">{label}</span>
      <span className="mono tabular text-[12.5px] text-ink">{value}</span>
    </div>
  );
}

function RateCardPanel({ contract }: { contract: RateCardRow | undefined }) {
  if (!contract) {
    return (
      <Panel kicker="No contract found" title="Contract Rate Card">
        <p className="text-[13px] text-steel">
          No rate card entry matches this carrier, lane, and equipment
          combination.
        </p>
      </Panel>
    );
  }

  const contractLineCount = RATE_CARD.filter(
    (r) => r.contract_id === contract.contract_id
  ).length;

  return (
    <Panel
      kicker={contract.contract_id}
      title="Contract Rate Card"
      right={
        <span className="mono text-[9px] text-steel-soft">
          {contractLineCount} LANE{contractLineCount !== 1 ? "S" : ""} CONTRACTED
        </span>
      }
    >
      <div>
        <KVRow label="Lane Origin" value={laneLabel(contract.lane_origin)} />
        <KVRow
          label="Lane Destination"
          value={laneLabel(contract.lane_destination)}
        />
        <KVRow label="Equipment Type" value={contract.container_type} />
        <KVRow
          label="Base Ocean Freight"
          value={fmtMoney(contract.base_ocean_freight, "USD")}
        />
        <KVRow label="BAF" value={fmtMoney(contract.baf_amount, "USD")} />
        <KVRow label="CAF %" value={`${contract.caf_pct}%`} />
        <KVRow
          label="THC Origin"
          value={fmtMoney(contract.thc_origin_amount, contract.thc_origin_currency)}
        />
        <KVRow
          label="THC Destination"
          value={fmtMoney(
            contract.thc_destination_amount,
            contract.thc_destination_currency
          )}
        />
        <KVRow label="Doc Fee" value={fmtMoney(contract.doc_fee, "USD")} />
        <KVRow
          label="Demurrage Free Days"
          value={`${contract.demurrage_free_days} days`}
        />
        <KVRow
          label="Detention Free Days"
          value={`${contract.detention_free_days} days`}
        />
        <KVRow
          label="Detention Daily Rate"
          value={`${fmtMoney(contract.detention_daily_rate, "USD")}/day`}
        />
        <KVRow label="Transit Days" value={`${contract.transit_days} days`} />
        <KVRow label="Routing" value={contract.routing} />
      </div>

      <div
        className="mt-5 bg-mist p-4 text-[12px] leading-relaxed text-steel"
        style={{ borderRadius: "var(--radius-sm)" }}
      >
        <div className="mono mb-1.5 text-[9px] text-steel-soft">
          CONTRACT VALIDITY
        </div>
        <div className="tabular">
          {contract.contract_effective} &mdash; {contract.contract_expiry}
        </div>
        <div className="mt-2">{contract.gri_protection_clause}</div>
      </div>
    </Panel>
  );
}

// ── Invoice panel ────────────────────────────────────────────

function InvoicePanel({ invoice }: { invoice: InvoiceSummary }) {
  return (
    <Panel
      kicker={invoice.invoice_id}
      title="Carrier Invoice"
      right={<StatusPill status={invoice.status} />}
    >
      <div className="mb-4 grid grid-cols-4 gap-4 border-b border-line pb-4">
        {[
          { label: "CARRIER", value: invoice.carrier },
          { label: "B/L", value: invoice.bl_no },
          { label: "CONTAINER", value: invoice.container_no },
          { label: "INVOICE DATE", value: invoice.invoice_date },
        ].map((f) => (
          <div key={f.label}>
            <div className="mono text-[9px] text-steel-soft">{f.label}</div>
            <div className="mono tabular mt-1 truncate text-[12px] text-ink">
              {f.value}
            </div>
          </div>
        ))}
      </div>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="mono text-left text-[9px] text-steel-soft">
            <th className="pb-2 font-normal">CODE</th>
            <th className="pb-2 font-normal">DESCRIPTION</th>
            <th className="pb-2 text-right font-normal">BILLED</th>
            <th className="pb-2 pl-3 text-right font-normal">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, i) => {
            const bg =
              line.match_status === "mismatch"
                ? "var(--leak-soft)"
                : line.match_status === "needs_review"
                ? "var(--gold-soft)"
                : "transparent";
            return (
              <tr
                key={i}
                style={{ backgroundColor: bg }}
                className="border-t border-line"
              >
                <td className="mono py-2 pr-2 text-[11px] text-steel">
                  {line.charge_code}
                </td>
                <td className="py-2 pr-2 text-ink">{line.charge_description}</td>
                <td className="mono tabular whitespace-nowrap py-2 text-right text-ink">
                  {fmtMoney(line.billed_amount, line.billed_currency)}
                </td>
                <td className="py-2 pl-3 text-right">
                  <span className="inline-flex justify-end">
                    <StatusDot status={line.match_status} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <span className="mono text-[10px] text-steel">TOTAL BILLED</span>
        <span className="mono tabular text-[14px] font-semibold text-ink">
          {fmtMoney(invoice.billed_total_usd, "USD")}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="mono text-[10px] text-steel">TOTAL LEAKAGE</span>
        <span
          className="mono tabular text-[14px] font-semibold"
          style={{
            color:
              invoice.leak_total_usd > 0 ? "var(--leak)" : "var(--green)",
          }}
        >
          {fmtMoney(invoice.leak_total_usd, "USD")}
        </span>
      </div>
    </Panel>
  );
}

// ── Screen ───────────────────────────────────────────────────

export default function SourceDocuments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const invoices = useMemo(() => getInvoices(), []);

  const selectedId = searchParams.get("inv") || DEFAULT_INVOICE_ID;
  const invoice =
    invoices.find((i) => i.invoice_id === selectedId) ?? invoices[0];

  const contract = findContract(
    invoice.carrier,
    invoice.lane_origin,
    invoice.lane_destination,
    invoice.container_type
  );

  function handleSelect(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("inv", id);
    setSearchParams(next, { replace: true });
  }

  // Make the default invoice explicit in the URL so it carries forward
  // through the rest of the journey instead of relying on a hidden fallback.
  useEffect(() => {
    if (!searchParams.get("inv")) {
      const next = new URLSearchParams(searchParams);
      next.set("inv", DEFAULT_INVOICE_ID);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ScreenFrame
        step={STEPS[1]}
        title="Every reconciliation starts with two documents that were never designed to talk to each other."
        description="Compare the contracted rate card against the invoice as billed, line by line."
        right={
          <InvoicePicker
            invoices={invoices}
            selectedId={invoice.invoice_id}
            onChange={handleSelect}
          />
        }
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <RateCardPanel contract={contract} />
          <InvoicePanel invoice={invoice} />
        </div>
      </ScreenFrame>
      <StepFooter prev="/" next="/reasoning" />
    </>
  );
}
