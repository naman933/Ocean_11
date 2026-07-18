// ─────────────────────────────────────────────────────────────
// KOSMIC — Dispute & Reasoning Module
// ─────────────────────────────────────────────────────────────

import {
  type InvoiceSummary,
  type InvoiceLine,
  type LeakCategory,
  getInvoices,
  fmtUsd,
  lanePair,
} from "./freight-data";

// ── Types ────────────────────────────────────────────────────

export interface Leak {
  invoice: InvoiceSummary;
  line: InvoiceLine;
  lineIdx: number;
  globalIdx: number;
}

export interface ReasoningStep {
  label: string;
  detail: string;
  tone: "neutral" | "leak" | "green";
}

export interface ClauseRef {
  ref: string;
  text: string;
}

// ── Collect leaks ────────────────────────────────────────────

export function collectLeaks(
  invoices?: InvoiceSummary[]
): Leak[] {
  const invs = invoices || getInvoices();
  const leaks: Leak[] = [];
  let globalIdx = 0;

  for (const inv of invs) {
    for (let i = 0; i < inv.lines.length; i++) {
      const line = inv.lines[i];
      if (line.match_status === "mismatch") {
        leaks.push({ invoice: inv, line, lineIdx: i, globalIdx });
        globalIdx++;
      }
    }
  }

  // Sort by leak amount descending for priority register
  return leaks.sort((a, b) => b.line.leak_amount_usd - a.line.leak_amount_usd);
}

// ── Priority ─────────────────────────────────────────────────

export function priorityOf(leak: Leak): "High" | "Medium" | "Low" {
  if (leak.line.leak_amount_usd >= 400) return "High";
  if (leak.line.leak_amount_usd >= 100) return "Medium";
  return "Low";
}

// ── Contract clauses ─────────────────────────────────────────

export function clauseFor(category: LeakCategory): ClauseRef {
  switch (category) {
    case "rate_misapplication":
      return {
        ref: "Schedule A — Contracted Rate Table",
        text: "Ocean freight rates as specified in Schedule A shall apply to all shipments booked under this contract for the applicable lane, equipment type, and contract period. Any deviation from Schedule A rates requires prior written agreement.",
      };
    case "surcharge_error":
      return {
        ref: "cl. 4.2 — Surcharge Cap & Index Reset",
        text: "BAF and CAF surcharges shall not exceed the amounts or percentages specified in this contract. BAF adjustments shall reset quarterly based on the applicable Platts SG 380 CST index. CAF is fixed at the contracted percentage for the contract duration.",
      };
    case "demurrage_detention":
      return {
        ref: "cl. 8.3 / 8.5 — Demurrage Waiver & Force Majeure",
        text: "Demurrage charges shall be waived in full when delay is attributable to carrier operations, including but not limited to vessel late arrival, equipment shortage, or carrier-initiated schedule change (cl. 8.3). Detention meter shall be paused during port congestion events, force majeure, or government-mandated holds (cl. 8.5).",
      };
    case "off_contract_spot":
      return {
        ref: "cl. 5.1 — Carrier-Initiated Rebooking Protection",
        text: "In the event of a blank sailing, vessel omission, or carrier-initiated cancellation, the shipper shall be entitled to rebooking on the next available vessel at the contracted rate. The carrier shall not apply spot market rates when the original booking was made under this contract.",
      };
    case "accessorial_duplicate":
      return {
        ref: "cl. 7.4 — Documentation & Accessorial Charges",
        text: "One documentation fee per Bill of Lading is permitted under this contract. Duplicate documentation charges, second-issuance fees, or any accessorial not explicitly listed in Schedule B are not billable without prior written authorization.",
      };
    case "volume_rebate_shortfall":
      return {
        ref: "cl. 6.2 — Volume Rebate (MQC)",
        text: "A retroactive rebate shall apply to all ocean freight charges once cumulative TEU volume crosses the Minimum Quantity Commitment (MQC) within the applicable measurement period. The rebate shall be applied as a credit on the next invoice cycle following threshold confirmation.",
      };
    default:
      return { ref: "—", text: "No applicable clause." };
  }
}

// ── Fault trail (5-step reasoning per leak) ──────────────────

export function faultTrail(leak: Leak): ReasoningStep[] {
  const { line } = leak;
  const lane = lanePair(line.lane_origin, line.lane_destination);

  switch (line.leak_category) {
    case "rate_misapplication":
      return [
        {
          label: "Extract billed rate",
          detail: `Invoice ${line.invoice_id} charges ${fmtUsd(line.billed_amount)} for Ocean Freight on ${lane}, ${line.container_type}.`,
          tone: "neutral",
        },
        {
          label: "Look up contracted rate",
          detail: `Contract SC-OML-2026-0417 Schedule A specifies ${fmtUsd(line.contract_amount)} for this lane and equipment.`,
          tone: "neutral",
        },
        {
          label: "Detect mismatch",
          detail: `Billed rate exceeds contracted rate by ${fmtUsd(line.leak_amount_usd)}. Carrier appears to have applied FY24-25 legacy rate card.`,
          tone: "leak",
        },
        {
          label: "Verify contract validity",
          detail: `Contract effective 2026-04-01 through 2027-03-31. Invoice date ${line.invoice_date} falls within contract period. Contracted rate applies.`,
          tone: "green",
        },
        {
          label: "Conclude: recoverable",
          detail: `Overcharge of ${fmtUsd(line.leak_amount_usd)} is fully recoverable under Schedule A. Recommend credit request to carrier.`,
          tone: "green",
        },
      ];

    case "surcharge_error":
      if (line.charge_code === "BAF") {
        return [
          {
            label: "Extract billed surcharge",
            detail: `BAF charged at ${fmtUsd(line.billed_amount)} on invoice ${line.invoice_id}.`,
            tone: "neutral",
          },
          {
            label: "Check contracted cap",
            detail: `Clause 4.2 caps BAF at ${fmtUsd(line.contract_amount)} for the contract period.`,
            tone: "neutral",
          },
          {
            label: "Cross-reference index",
            detail: `Q2 Platts SG 380 CST index supports a BAF of ${fmtUsd(line.contract_amount)}. Carrier did not reset from Q1 levels.`,
            tone: "leak",
          },
          {
            label: "Quantify overcharge",
            detail: `Excess BAF of ${fmtUsd(line.leak_amount_usd)} above contracted cap.`,
            tone: "leak",
          },
          {
            label: "Conclude: recoverable",
            detail: `${fmtUsd(line.leak_amount_usd)} recoverable under cl. 4.2 surcharge cap provision.`,
            tone: "green",
          },
        ];
      }
      // CAF error
      return [
        {
          label: "Extract billed CAF",
          detail: `CAF charged at ${fmtUsd(line.billed_amount)} on invoice ${line.invoice_id} (${lane}).`,
          tone: "neutral",
        },
        {
          label: "Calculate contracted CAF",
          detail: `Contract specifies CAF at 3.5% of O/F. For this lane, that equals ${fmtUsd(line.contract_amount)}.`,
          tone: "neutral",
        },
        {
          label: "Detect percentage mismatch",
          detail: `Carrier applied 5.2% instead of contracted 3.5%. This is a systematic billing error, not an index-driven change.`,
          tone: "leak",
        },
        {
          label: "Verify contract terms",
          detail: `Clause 4.2 fixes CAF at 3.5% for the full contract duration. No exceptions or escalation clauses apply.`,
          tone: "green",
        },
        {
          label: "Conclude: recoverable",
          detail: `Overcharge of ${fmtUsd(line.leak_amount_usd)} is fully recoverable. Recommend carrier corrects CAF percentage in billing system.`,
          tone: "green",
        },
      ];

    case "demurrage_detention":
      if (line.charge_code === "DEM") {
        return [
          {
            label: "Identify demurrage charge",
            detail: `Demurrage of ${fmtUsd(line.billed_amount)} billed on invoice ${line.invoice_id} for container at ${lanePair(line.lane_origin, line.lane_destination)}.`,
            tone: "neutral",
          },
          {
            label: "Check vessel schedule",
            detail: `Vessel OML-Voyage-2216W was scheduled to arrive on time but arrived 4 days late — a carrier-attributable delay.`,
            tone: "leak",
          },
          {
            label: "Apply demurrage waiver clause",
            detail: `Clause 8.3 waives demurrage when delay is carrier-attributable. All 5 days of demurrage are a direct consequence of vessel late arrival.`,
            tone: "green",
          },
          {
            label: "Confirm free-time allowance",
            detail: `Contract provides 5 free days. Even without the waiver, vessel delay consumed the entire free-time window.`,
            tone: "green",
          },
          {
            label: "Conclude: fully recoverable",
            detail: `Full demurrage charge of ${fmtUsd(line.leak_amount_usd)} is recoverable under cl. 8.3 carrier-delay waiver.`,
            tone: "green",
          },
        ];
      }
      // Detention
      return [
        {
          label: "Review detention invoice",
          detail: `Detention of ${fmtUsd(line.billed_amount)} billed for 9 days at $60/day on invoice ${line.invoice_id}.`,
          tone: "neutral",
        },
        {
          label: "Apply free-time allowance",
          detail: `Contract provides 7 free detention days. Without adjustments, 2 chargeable days (2 × $60 = $120).`,
          tone: "neutral",
        },
        {
          label: "Check port congestion events",
          detail: `Rotterdam experienced documented port congestion during this period. Clause 8.5 pauses the detention meter during congestion events.`,
          tone: "leak",
        },
        {
          label: "Recalculate chargeable days",
          detail: `Of 9 total days, 6 are congestion-paused (cl. 8.5) and 7 are free (contract). Net chargeable: 2 days = ${fmtUsd(line.contract_amount)}.`,
          tone: "green",
        },
        {
          label: "Conclude: overcharge recoverable",
          detail: `${fmtUsd(line.leak_amount_usd)} overcharged (${fmtUsd(line.billed_amount)} billed vs ${fmtUsd(line.contract_amount)} correct). Recoverable under cl. 8.5.`,
          tone: "green",
        },
      ];

    case "off_contract_spot":
      return [
        {
          label: "Detect spot booking on contracted lane",
          detail: `Shipment on ${lane} booked at spot rate ${fmtUsd(line.billed_amount)} via invoice ${line.invoice_id}.`,
          tone: "neutral",
        },
        {
          label: "Verify active contract exists",
          detail: `Contract SC-OML-2026-0417 covers this lane at ${fmtUsd(line.contract_amount)} for ${line.container_type}. Contract was active on ${line.invoice_date}.`,
          tone: "neutral",
        },
        {
          label: "Identify trigger event",
          detail: `Spot booking was triggered by a blank sailing / space constraint. This is a carrier-initiated event, not a shipper decision.`,
          tone: "leak",
        },
        {
          label: "Apply contract protection clause",
          detail: `Clause 5.1 protects contracted rate on carrier-initiated rebooking. Shipper should have invoked cl. 5.1 instead of accepting spot rate.`,
          tone: "green",
        },
        {
          label: "Conclude: avoidable premium",
          detail: `Premium of ${fmtUsd(line.leak_amount_usd)} over contracted rate is recoverable. This is 1 of 2 spot bookings on contracted lanes this quarter — pattern suggests booking process gap requiring corrective action.`,
          tone: "green",
        },
      ];

    case "accessorial_duplicate":
      return [
        {
          label: "Identify accessorial charge",
          detail: `Second documentation fee (DOCFEE-02) of ${fmtUsd(line.billed_amount)} on invoice ${line.invoice_id}.`,
          tone: "neutral",
        },
        {
          label: "Check for duplicates on same B/L",
          detail: `B/L ${leak.invoice.bl_no} already has a DOC charge of $45 on this invoice. Two documentation fees on the same B/L.`,
          tone: "leak",
        },
        {
          label: "Apply contract limit",
          detail: `Clause 7.4 permits one documentation charge per Bill of Lading. The second charge is not contractually permitted.`,
          tone: "green",
        },
        {
          label: "Verify no authorization exists",
          detail: `No prior written authorization found for additional accessorial charges on this B/L. Charge is unauthorized.`,
          tone: "green",
        },
        {
          label: "Conclude: duplicate recoverable",
          detail: `Duplicate charge of ${fmtUsd(line.leak_amount_usd)} is fully recoverable under cl. 7.4. Recommend carrier reviews billing templates to prevent recurrence.`,
          tone: "green",
        },
      ];

    case "volume_rebate_shortfall":
      return [
        {
          label: "Aggregate quarterly TEU volume",
          detail: `Agent scanned all ASC shipments in Q2 2026. Cumulative volume: 2,600 TEU across 3 booking batches (850 + 880 + 870 TEU).`,
          tone: "neutral",
        },
        {
          label: "Check MQC threshold",
          detail: `Contract SC-ASC-2026-0091 clause 6.2 sets MQC at 2,500 TEU per quarter. Actual volume of 2,600 TEU exceeds threshold by 100 TEU.`,
          tone: "neutral",
        },
        {
          label: "Confirm rebate eligibility",
          detail: `Threshold crossed — 2% retroactive rebate should apply to all Q2 ASC ocean freight charges.`,
          tone: "leak",
        },
        {
          label: "Calculate missing rebate",
          detail: `Rebate of ${fmtUsd(line.leak_amount_usd)} not applied on invoice ${line.invoice_id}. This pattern likely extends to other ASC invoices in Q2 that also did not receive the rebate credit.`,
          tone: "leak",
        },
        {
          label: "Conclude: rebate recoverable",
          detail: `${fmtUsd(line.leak_amount_usd)} recoverable on this invoice under cl. 6.2. Recommend requesting cumulative rebate credit for all Q2 ASC invoices. This is a cross-invoice insight — no single invoice would have surfaced this.`,
          tone: "green",
        },
      ];

    default:
      return [
        {
          label: "No fault trail available",
          detail: "This line does not have a leak classification.",
          tone: "neutral",
        },
      ];
  }
}

// ── Draft dispute email ──────────────────────────────────────

export function draftDispute(leak: Leak, contractId: string): string {
  const { line } = leak;
  const lane = lanePair(line.lane_origin, line.lane_destination);
  const clause = clauseFor(line.leak_category);

  const categoryIntros: Record<string, string> = {
    rate_misapplication: `We have identified a rate discrepancy on invoice ${line.invoice_id}, shipment ${lane}, equipment ${line.container_type}.\n\nThe Ocean Freight was billed at ${fmtUsd(line.billed_amount)} against a contracted rate of ${fmtUsd(line.contract_amount)} as specified in ${contractId}, ${clause.ref}.\n\nThis represents an overcharge of ${fmtUsd(line.leak_amount_usd)}. Our records indicate the current contract rate card was not applied — the billed amount corresponds to the FY24-25 legacy rate.`,

    surcharge_error: `We have identified a surcharge discrepancy on invoice ${line.invoice_id}, shipment ${lane}, equipment ${line.container_type}.\n\n${line.charge_code} was billed at ${fmtUsd(line.billed_amount)} against a contracted ${line.charge_code === "BAF" ? "cap" : "rate"} of ${fmtUsd(line.contract_amount)} as specified in ${contractId}, ${clause.ref}.\n\nThis represents an overcharge of ${fmtUsd(line.leak_amount_usd)}.`,

    demurrage_detention: `We have identified an overcharge on ${line.charge_code === "DEM" ? "demurrage" : "detention"} on invoice ${line.invoice_id}, shipment ${lane}, equipment ${line.container_type}.\n\n${line.charge_code === "DEM" ? "Demurrage" : "Detention"} was billed at ${fmtUsd(line.billed_amount)}. Per ${contractId}, ${clause.ref}, ${line.charge_code === "DEM" ? "demurrage is waived when delay is carrier-attributable" : "detention meter is paused during port congestion events"}.\n\nThe correct chargeable amount is ${fmtUsd(line.contract_amount)}, resulting in an overcharge of ${fmtUsd(line.leak_amount_usd)}.`,

    off_contract_spot: `We have identified an off-contract spot booking on invoice ${line.invoice_id}, shipment ${lane}, equipment ${line.container_type}.\n\nThis shipment was booked at a spot rate of ${fmtUsd(line.billed_amount)} despite an active contract (${contractId}) providing a rate of ${fmtUsd(line.contract_amount)} for this lane. Per ${clause.ref}, the contracted rate shall apply when rebooking is necessitated by carrier-initiated events including blank sailings.\n\nThe avoidable premium is ${fmtUsd(line.leak_amount_usd)}.`,

    accessorial_duplicate: `We have identified a duplicate accessorial charge on invoice ${line.invoice_id}, shipment ${lane}.\n\nA second documentation fee (${line.charge_code}) of ${fmtUsd(line.billed_amount)} was billed on B/L ${leak.invoice.bl_no}, which already carries a DOC charge on this invoice. Per ${contractId}, ${clause.ref}, only one documentation fee per Bill of Lading is permitted.\n\nThe duplicate charge of ${fmtUsd(line.leak_amount_usd)} is not contractually authorized.`,

    volume_rebate_shortfall: `We have identified a volume rebate shortfall on invoice ${line.invoice_id}.\n\nOur records show cumulative TEU volume with your line exceeded the MQC threshold of 2,500 TEU in Q2 2026 (actual: 2,600 TEU). Per ${contractId}, ${clause.ref}, a 2% retroactive rebate should apply to all ocean freight charges for the measurement period.\n\nThe rebate credit of ${fmtUsd(line.leak_amount_usd)} has not been applied on this invoice.`,
  };

  const intro =
    categoryIntros[line.leak_category] ||
    `We have identified a billing discrepancy of ${fmtUsd(line.leak_amount_usd)} on invoice ${line.invoice_id}.`;

  return `Team,

${intro}

We kindly request a credit note for ${fmtUsd(line.leak_amount_usd)} to be issued against this invoice at your earliest convenience. Supporting documentation including the applicable contract clause, invoice line detail, and reconciliation evidence is attached.

Please confirm receipt and expected timeline for credit processing.

Regards,
Freight Audit — Aarav Textiles & Industries`;
}

// ── Dispute email addresses ──────────────────────────────────

export function carrierDisputeEmail(carrier: string): string {
  const emails: Record<string, string> = {
    OML: "disputes@odyssey-lines.com",
    ASC: "disputes@atlas-carriers.com",
  };
  return emails[carrier] || `disputes@${carrier.toLowerCase()}.com`;
}

export function disputeSubject(leak: Leak): string {
  return `Credit request · ${leak.line.invoice_id} · ${leak.line.charge_code} · ${fmtUsd(leak.line.leak_amount_usd)}`;
}
