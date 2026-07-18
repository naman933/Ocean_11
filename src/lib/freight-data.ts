// ─────────────────────────────────────────────────────────────
// KOSMIC — Ocean Freight Leak Detector
// Complete seed dataset + helpers
// ─────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────

export type MatchStatus = "matched" | "mismatch" | "needs_review";

export type LeakCategory =
  | "none"
  | "rate_misapplication"
  | "surcharge_error"
  | "demurrage_detention"
  | "off_contract_spot"
  | "accessorial_duplicate"
  | "volume_rebate_shortfall";

export type PassType = "pass1" | "pass2";

export interface RateCardRow {
  contract_id: string;
  carrier: string;
  lane_origin: string;
  lane_destination: string;
  container_type: string;
  base_ocean_freight: number;
  baf_amount: number;
  caf_pct: number;
  thc_origin_amount: number;
  thc_origin_currency: string;
  thc_destination_amount: number;
  thc_destination_currency: string;
  doc_fee: number;
  demurrage_free_days: number;
  detention_free_days: number;
  detention_daily_rate: number;
  transit_days: number;
  routing: string;
  contract_effective: string;
  contract_expiry: string;
  gri_protection_clause: string;
}

export interface InvoiceLine {
  invoice_id: string;
  carrier: string;
  booking_no: string;
  bl_no: string;
  container_no: string;
  lane_origin: string;
  lane_destination: string;
  container_type: string;
  invoice_date: string;
  charge_code: string;
  charge_description: string;
  billed_amount: number;
  billed_currency: string;
  contract_amount: number;
  contract_currency: string;
  match_status: MatchStatus;
  leak_category: LeakCategory;
  leak_amount_usd: number;
  evidence_note: string;
  pass_type: PassType; // which detection pass catches this
}

export interface InvoiceSummary {
  invoice_id: string;
  carrier: string;
  lane_origin: string;
  lane_destination: string;
  container_type: string;
  invoice_date: string;
  bl_no: string;
  booking_no: string;
  container_no: string;
  lines: InvoiceLine[];
  billed_total_usd: number;
  leak_total_usd: number;
  mismatch_count: number;
  needs_review_count: number;
  status: MatchStatus;
  contract_id: string;
}

export interface VolumeRebateTerm {
  carrier: string;
  contract_id: string;
  rebate_threshold_teu: number;
  rebate_percentage: number;
  measurement_period: string;
  period_label: string;
  clause_ref: string;
  clause_text: string;
}

export interface ShipmentRecord {
  shipment_id: string;
  shipment_date: string;
  carrier: string;
  lane_origin: string;
  lane_destination: string;
  container_type: string;
  container_count: number;
  teu: number;
  booking_type: "contract" | "spot";
  freight_forwarder: string | null;
  linked_invoice_id: string;
  contracted_rate_available: boolean;
  contracted_rate_usd: number | null;
  actual_rate_usd: number;
  avoidable_premium_usd: number;
}

// ── Constants ────────────────────────────────────────────────

export const LANE_LABELS: Record<string, string> = {
  INNSA: "Nhava Sheva",
  INMUN: "Mundra",
  NLRTM: "Rotterdam",
  DEHAM: "Hamburg",
  USLGB: "Long Beach",
};

export const LEAK_CATEGORY_LABELS: Record<LeakCategory, string> = {
  none: "No leak",
  rate_misapplication: "Rate misapplication",
  surcharge_error: "Surcharge error",
  demurrage_detention: "Demurrage / Detention",
  off_contract_spot: "Off-contract spot booking",
  accessorial_duplicate: "Accessorial duplicate",
  volume_rebate_shortfall: "Volume rebate shortfall",
};

export const OWNER_BY_CATEGORY: Record<LeakCategory, string> = {
  none: "—",
  rate_misapplication: "Logistics Procurement",
  surcharge_error: "Freight Audit",
  demurrage_detention: "Freight Audit",
  off_contract_spot: "Category Manager",
  accessorial_duplicate: "Finance / AP",
  volume_rebate_shortfall: "Category Manager",
};

export const PASS_LABELS: Record<PassType, string> = {
  pass1: "Contract Compliance",
  pass2: "Spend Intelligence",
};

export const FX: Record<string, number> = { USD: 1, EUR: 1.08, INR: 0.012 };

// ── Leak trend (6 months, for sparkline) ─────────────────────

export const LEAK_TREND = [
  { month: "Feb", usd: 18420 },
  { month: "Mar", usd: 22110 },
  { month: "Apr", usd: 19870 },
  { month: "May", usd: 27340 },
  { month: "Jun", usd: 31280 },
  { month: "Jul", usd: 24960 },
];

// ── Table 1: Rate Card ──────────────────────────────────────

export const RATE_CARD: RateCardRow[] = [
  {
    contract_id: "SC-OML-2026-0417",
    carrier: "OML",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    base_ocean_freight: 1800,
    baf_amount: 360,
    caf_pct: 3.5,
    thc_origin_amount: 14500,
    thc_origin_currency: "INR",
    thc_destination_amount: 165,
    thc_destination_currency: "EUR",
    doc_fee: 45,
    demurrage_free_days: 5,
    detention_free_days: 7,
    detention_daily_rate: 60,
    transit_days: 24,
    routing: "Direct",
    contract_effective: "2026-04-01",
    contract_expiry: "2027-03-31",
    gri_protection_clause: "Rate firm for MQC-committed volume; GRI only above MQC with 30 days notice.",
  },
  {
    contract_id: "SC-OML-2026-0417",
    carrier: "OML",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    base_ocean_freight: 1200,
    baf_amount: 270,
    caf_pct: 3.5,
    thc_origin_amount: 14500,
    thc_origin_currency: "INR",
    thc_destination_amount: 120,
    thc_destination_currency: "EUR",
    doc_fee: 45,
    demurrage_free_days: 5,
    detention_free_days: 7,
    detention_daily_rate: 60,
    transit_days: 24,
    routing: "Direct",
    contract_effective: "2026-04-01",
    contract_expiry: "2027-03-31",
    gri_protection_clause: "Rate firm for MQC-committed volume; GRI only above MQC with 30 days notice.",
  },
  {
    contract_id: "SC-OML-2026-0417",
    carrier: "OML",
    lane_origin: "INMUN",
    lane_destination: "DEHAM",
    container_type: "40HC",
    base_ocean_freight: 1650,
    baf_amount: 360,
    caf_pct: 3.5,
    thc_origin_amount: 13200,
    thc_origin_currency: "INR",
    thc_destination_amount: 145,
    thc_destination_currency: "EUR",
    doc_fee: 45,
    demurrage_free_days: 5,
    detention_free_days: 7,
    detention_daily_rate: 60,
    transit_days: 26,
    routing: "Direct",
    contract_effective: "2026-04-01",
    contract_expiry: "2027-03-31",
    gri_protection_clause: "Rate firm for MQC-committed volume; GRI only above MQC with 30 days notice.",
  },
  {
    contract_id: "SC-OML-2026-0417",
    carrier: "OML",
    lane_origin: "INNSA",
    lane_destination: "USLGB",
    container_type: "40GP",
    base_ocean_freight: 2950,
    baf_amount: 360,
    caf_pct: 3.5,
    thc_origin_amount: 17500,
    thc_origin_currency: "INR",
    thc_destination_amount: 210,
    thc_destination_currency: "USD",
    doc_fee: 45,
    demurrage_free_days: 5,
    detention_free_days: 7,
    detention_daily_rate: 60,
    transit_days: 32,
    routing: "1x TS Colombo",
    contract_effective: "2026-04-01",
    contract_expiry: "2027-03-31",
    gri_protection_clause: "Rate firm for MQC-committed volume; GRI only above MQC with 30 days notice.",
  },
  {
    contract_id: "SC-ASC-2026-0091",
    carrier: "ASC",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    base_ocean_freight: 1200,
    baf_amount: 255,
    caf_pct: 3.5,
    thc_origin_amount: 14100,
    thc_origin_currency: "INR",
    thc_destination_amount: 158,
    thc_destination_currency: "EUR",
    doc_fee: 45,
    demurrage_free_days: 5,
    detention_free_days: 7,
    detention_daily_rate: 60,
    transit_days: 26,
    routing: "Direct",
    contract_effective: "2026-01-01",
    contract_expiry: "2026-12-31",
    gri_protection_clause: "2% retroactive rebate once cumulative TEU crosses MQC (cl. 6.2).",
  },
];

// ── Table 2: Invoice Lines ──────────────────────────────────
// Spec invoices 1-7 + 3 new invoices for Pass 2 intelligence

export const INVOICE_LINES: InvoiceLine[] = [
  // ────────────────────────────────────────────────────────────
  // INV-OML-88213 — Hero invoice, 3 stacked leaks (Pass 1)
  // Nhava Sheva → Rotterdam, 40HC, 2026-05-14
  // ────────────────────────────────────────────────────────────
  {
    invoice_id: "INV-OML-88213",
    carrier: "OML",
    booking_no: "BK-OML-260501",
    bl_no: "MOLBL260417",
    container_no: "OMLU-7741293",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-14",
    charge_code: "O/F",
    charge_description: "Ocean Freight",
    billed_amount: 2050,
    billed_currency: "USD",
    contract_amount: 1800,
    contract_currency: "USD",
    match_status: "mismatch",
    leak_category: "rate_misapplication",
    leak_amount_usd: 250,
    evidence_note:
      "Billed at $2,050 against contracted $1,800. Carrier applied FY24-25 legacy rate card instead of current SC-OML-2026-0417. Schedule A, line 1 specifies $1,800 for INNSA→NLRTM 40HC.",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88213",
    carrier: "OML",
    booking_no: "BK-OML-260501",
    bl_no: "MOLBL260417",
    container_no: "OMLU-7741293",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-14",
    charge_code: "BAF",
    charge_description: "Bunker Adjustment Factor",
    billed_amount: 420,
    billed_currency: "USD",
    contract_amount: 360,
    contract_currency: "USD",
    match_status: "mismatch",
    leak_category: "surcharge_error",
    leak_amount_usd: 60,
    evidence_note:
      "BAF billed at $420 vs contracted cap of $360. Q1 2026 Platts SG 380 CST index was not reset to Q2 levels. Clause 4.2 caps BAF at $360 for contract period.",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88213",
    carrier: "OML",
    booking_no: "BK-OML-260501",
    bl_no: "MOLBL260417",
    container_no: "OMLU-7741293",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-14",
    charge_code: "CAF",
    charge_description: "Currency Adjustment Factor",
    billed_amount: 63,
    billed_currency: "USD",
    contract_amount: 63,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88213",
    carrier: "OML",
    booking_no: "BK-OML-260501",
    bl_no: "MOLBL260417",
    container_no: "OMLU-7741293",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-14",
    charge_code: "THC-D",
    charge_description: "Terminal Handling — Destination",
    billed_amount: 165,
    billed_currency: "EUR",
    contract_amount: 165,
    contract_currency: "EUR",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88213",
    carrier: "OML",
    booking_no: "BK-OML-260501",
    bl_no: "MOLBL260417",
    container_no: "OMLU-7741293",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-14",
    charge_code: "DEM",
    charge_description: "Demurrage",
    billed_amount: 450,
    billed_currency: "USD",
    contract_amount: 0,
    contract_currency: "USD",
    match_status: "mismatch",
    leak_category: "demurrage_detention",
    leak_amount_usd: 450,
    evidence_note:
      "Demurrage of $450 billed for 5 days at port. Vessel OML-Voyage-2216W arrived 4 days late (carrier-caused delay). Clause 8.3 waives demurrage when delay is carrier-attributable. Full amount recoverable.",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88213",
    carrier: "OML",
    booking_no: "BK-OML-260501",
    bl_no: "MOLBL260417",
    container_no: "OMLU-7741293",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-14",
    charge_code: "DOC",
    charge_description: "Documentation Fee",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 45,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },

  // ────────────────────────────────────────────────────────────
  // INV-OML-88214 — Control invoice, fully clean (Pass 1)
  // Nhava Sheva → Rotterdam, 40HC, 2026-05-16
  // ────────────────────────────────────────────────────────────
  {
    invoice_id: "INV-OML-88214",
    carrier: "OML",
    booking_no: "BK-OML-260503",
    bl_no: "MOLBL260419",
    container_no: "OMLU-7741305",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-16",
    charge_code: "O/F",
    charge_description: "Ocean Freight",
    billed_amount: 1800,
    billed_currency: "USD",
    contract_amount: 1800,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88214",
    carrier: "OML",
    booking_no: "BK-OML-260503",
    bl_no: "MOLBL260419",
    container_no: "OMLU-7741305",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-16",
    charge_code: "BAF",
    charge_description: "Bunker Adjustment Factor",
    billed_amount: 360,
    billed_currency: "USD",
    contract_amount: 360,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88214",
    carrier: "OML",
    booking_no: "BK-OML-260503",
    bl_no: "MOLBL260419",
    container_no: "OMLU-7741305",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-16",
    charge_code: "CAF",
    charge_description: "Currency Adjustment Factor",
    billed_amount: 63,
    billed_currency: "USD",
    contract_amount: 63,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88214",
    carrier: "OML",
    booking_no: "BK-OML-260503",
    bl_no: "MOLBL260419",
    container_no: "OMLU-7741305",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-16",
    charge_code: "THC-D",
    charge_description: "Terminal Handling — Destination",
    billed_amount: 165,
    billed_currency: "EUR",
    contract_amount: 165,
    contract_currency: "EUR",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88214",
    carrier: "OML",
    booking_no: "BK-OML-260503",
    bl_no: "MOLBL260419",
    container_no: "OMLU-7741305",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-05-16",
    charge_code: "DOC",
    charge_description: "Documentation Fee",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 45,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },

  // ────────────────────────────────────────────────────────────
  // INV-OML-88240 — Off-contract spot booking (Pass 2)
  // Mundra → Hamburg, 40HC, 2026-06-02
  // ────────────────────────────────────────────────────────────
  {
    invoice_id: "INV-OML-88240",
    carrier: "OML",
    booking_no: "BK-SPOT-260601",
    bl_no: "MOLBL260428",
    container_no: "OMLU-7741380",
    lane_origin: "INMUN",
    lane_destination: "DEHAM",
    container_type: "40HC",
    invoice_date: "2026-06-02",
    charge_code: "O/F",
    charge_description: "Ocean Freight (Spot)",
    billed_amount: 2600,
    billed_currency: "USD",
    contract_amount: 1650,
    contract_currency: "USD",
    match_status: "mismatch",
    leak_category: "off_contract_spot",
    leak_amount_usd: 950,
    evidence_note:
      "Spot booking at $2,600 on Mundra→Hamburg lane where contract SC-OML-2026-0417 provides $1,650. Triggered by blank sailing MOL-Voyage-2209E. Clause 5.1 protects contracted rate on carrier-initiated rebooking — shipper should have invoked cl. 5.1 instead of accepting spot rate.",
    pass_type: "pass2",
  },
  {
    invoice_id: "INV-OML-88240",
    carrier: "OML",
    booking_no: "BK-SPOT-260601",
    bl_no: "MOLBL260428",
    container_no: "OMLU-7741380",
    lane_origin: "INMUN",
    lane_destination: "DEHAM",
    container_type: "40HC",
    invoice_date: "2026-06-02",
    charge_code: "BAF",
    charge_description: "Bunker Adjustment Factor",
    billed_amount: 360,
    billed_currency: "USD",
    contract_amount: 360,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88240",
    carrier: "OML",
    booking_no: "BK-SPOT-260601",
    bl_no: "MOLBL260428",
    container_no: "OMLU-7741380",
    lane_origin: "INMUN",
    lane_destination: "DEHAM",
    container_type: "40HC",
    invoice_date: "2026-06-02",
    charge_code: "DOC",
    charge_description: "Documentation Fee",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 45,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },

  // ────────────────────────────────────────────────────────────
  // INV-OML-88255 — Accessorial duplicate + amber (Pass 1)
  // Nhava Sheva → Long Beach, 40GP, 2026-06-10
  // ────────────────────────────────────────────────────────────
  {
    invoice_id: "INV-OML-88255",
    carrier: "OML",
    booking_no: "BK-OML-260608",
    bl_no: "MOLBL260445",
    container_no: "OMLU-7741412",
    lane_origin: "INNSA",
    lane_destination: "USLGB",
    container_type: "40GP",
    invoice_date: "2026-06-10",
    charge_code: "O/F",
    charge_description: "Ocean Freight",
    billed_amount: 2950,
    billed_currency: "USD",
    contract_amount: 2950,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88255",
    carrier: "OML",
    booking_no: "BK-OML-260608",
    bl_no: "MOLBL260445",
    container_no: "OMLU-7741412",
    lane_origin: "INNSA",
    lane_destination: "USLGB",
    container_type: "40GP",
    invoice_date: "2026-06-10",
    charge_code: "BAF",
    charge_description: "Bunker Adjustment Factor",
    billed_amount: 360,
    billed_currency: "USD",
    contract_amount: 360,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88255",
    carrier: "OML",
    booking_no: "BK-OML-260608",
    bl_no: "MOLBL260445",
    container_no: "OMLU-7741412",
    lane_origin: "INNSA",
    lane_destination: "USLGB",
    container_type: "40GP",
    invoice_date: "2026-06-10",
    charge_code: "DOC",
    charge_description: "Documentation Fee",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 45,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88255",
    carrier: "OML",
    booking_no: "BK-OML-260608",
    bl_no: "MOLBL260445",
    container_no: "OMLU-7741412",
    lane_origin: "INNSA",
    lane_destination: "USLGB",
    container_type: "40GP",
    invoice_date: "2026-06-10",
    charge_code: "THC-O",
    charge_description: "Terminal Handling — Origin",
    billed_amount: 175,
    billed_currency: "USD",
    contract_amount: 210, // contract is in INR (₹17,500) → ~$210
    contract_currency: "USD",
    match_status: "needs_review",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note:
      "OCR extraction confidence 71%. Contract specifies origin THC in INR (₹17,500 ≈ $210) but invoice shows $175 in USD. Currency mismatch requires human review — possible favorable rate or data entry error.",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88255",
    carrier: "OML",
    booking_no: "BK-OML-260608",
    bl_no: "MOLBL260445",
    container_no: "OMLU-7741412",
    lane_origin: "INNSA",
    lane_destination: "USLGB",
    container_type: "40GP",
    invoice_date: "2026-06-10",
    charge_code: "DOCFEE-02",
    charge_description: "Documentation Fee (Duplicate)",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 0,
    contract_currency: "USD",
    match_status: "mismatch",
    leak_category: "accessorial_duplicate",
    leak_amount_usd: 45,
    evidence_note:
      "Second documentation fee (DOCFEE-02) on same B/L MOLBL260445 — DOC already billed at $45 on this invoice. Clause 7.4 permits one documentation charge per B/L. Duplicate charge of $45 fully recoverable.",
    pass_type: "pass1",
  },

  // ────────────────────────────────────────────────────────────
  // INV-OML-88266 — Detention over-billed (Pass 1)
  // Nhava Sheva → Rotterdam, 40HC, 2026-06-18
  // ────────────────────────────────────────────────────────────
  {
    invoice_id: "INV-OML-88266",
    carrier: "OML",
    booking_no: "BK-OML-260615",
    bl_no: "MOLBL260452",
    container_no: "OMLU-7741450",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-06-18",
    charge_code: "O/F",
    charge_description: "Ocean Freight",
    billed_amount: 1800,
    billed_currency: "USD",
    contract_amount: 1800,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88266",
    carrier: "OML",
    booking_no: "BK-OML-260615",
    bl_no: "MOLBL260452",
    container_no: "OMLU-7741450",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-06-18",
    charge_code: "BAF",
    charge_description: "Bunker Adjustment Factor",
    billed_amount: 360,
    billed_currency: "USD",
    contract_amount: 360,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88266",
    carrier: "OML",
    booking_no: "BK-OML-260615",
    bl_no: "MOLBL260452",
    container_no: "OMLU-7741450",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-06-18",
    charge_code: "DET",
    charge_description: "Detention",
    billed_amount: 540,
    billed_currency: "USD",
    contract_amount: 120,
    contract_currency: "USD",
    match_status: "mismatch",
    leak_category: "demurrage_detention",
    leak_amount_usd: 420,
    evidence_note:
      "Detention billed for 9 days at $60/day ($540). Contract provides 7 free days. Port congestion at Rotterdam paused the detention meter for 6 of 9 days per clause 8.5 force majeure provision. Only 2 days chargeable (2 × $60 = $120). Overcharge of $420.",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88266",
    carrier: "OML",
    booking_no: "BK-OML-260615",
    bl_no: "MOLBL260452",
    container_no: "OMLU-7741450",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-06-18",
    charge_code: "DOC",
    charge_description: "Documentation Fee",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 45,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },

  // ────────────────────────────────────────────────────────────
  // INV-ASC-11032 — Volume rebate shortfall (Pass 2)
  // Nhava Sheva → Rotterdam, 20GP, 2026-07-01
  // ────────────────────────────────────────────────────────────
  {
    invoice_id: "INV-ASC-11032",
    carrier: "ASC",
    booking_no: "BK-ASC-260625",
    bl_no: "ASCBL260512",
    container_no: "ASCU-3320187",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    invoice_date: "2026-07-01",
    charge_code: "O/F",
    charge_description: "Ocean Freight",
    billed_amount: 1200,
    billed_currency: "USD",
    contract_amount: 1200,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-ASC-11032",
    carrier: "ASC",
    booking_no: "BK-ASC-260625",
    bl_no: "ASCBL260512",
    container_no: "ASCU-3320187",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    invoice_date: "2026-07-01",
    charge_code: "BAF",
    charge_description: "Bunker Adjustment Factor",
    billed_amount: 255,
    billed_currency: "USD",
    contract_amount: 255,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-ASC-11032",
    carrier: "ASC",
    booking_no: "BK-ASC-260625",
    bl_no: "ASCBL260512",
    container_no: "ASCU-3320187",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    invoice_date: "2026-07-01",
    charge_code: "DOC",
    charge_description: "Documentation Fee",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 45,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-ASC-11032",
    carrier: "ASC",
    booking_no: "BK-ASC-260625",
    bl_no: "ASCBL260512",
    container_no: "ASCU-3320187",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    invoice_date: "2026-07-01",
    charge_code: "REBATE",
    charge_description: "Volume Rebate (Not Applied)",
    billed_amount: 0,
    billed_currency: "USD",
    contract_amount: -220,
    contract_currency: "USD",
    match_status: "mismatch",
    leak_category: "volume_rebate_shortfall",
    leak_amount_usd: 220,
    evidence_note:
      "Cumulative ASC volume in Q2 2026 reached 2,600 TEU, crossing the 2,500 TEU MQC threshold. Clause 6.2 entitles Aarav Textiles to a 2% retroactive rebate on all Q2 ASC spend. Rebate of $220 on this invoice not applied. Agent detected this by aggregating TEU across 4 ASC invoices in Q2.",
    pass_type: "pass2",
  },

  // ────────────────────────────────────────────────────────────
  // INV-OML-88281 — CAF misapplied (Pass 1)
  // Mundra → Hamburg, 40HC, 2026-07-05
  // ────────────────────────────────────────────────────────────
  {
    invoice_id: "INV-OML-88281",
    carrier: "OML",
    booking_no: "BK-OML-260702",
    bl_no: "MOLBL260468",
    container_no: "OMLU-7741501",
    lane_origin: "INMUN",
    lane_destination: "DEHAM",
    container_type: "40HC",
    invoice_date: "2026-07-05",
    charge_code: "O/F",
    charge_description: "Ocean Freight",
    billed_amount: 1650,
    billed_currency: "USD",
    contract_amount: 1650,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88281",
    carrier: "OML",
    booking_no: "BK-OML-260702",
    bl_no: "MOLBL260468",
    container_no: "OMLU-7741501",
    lane_origin: "INMUN",
    lane_destination: "DEHAM",
    container_type: "40HC",
    invoice_date: "2026-07-05",
    charge_code: "BAF",
    charge_description: "Bunker Adjustment Factor",
    billed_amount: 360,
    billed_currency: "USD",
    contract_amount: 360,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88281",
    carrier: "OML",
    booking_no: "BK-OML-260702",
    bl_no: "MOLBL260468",
    container_no: "OMLU-7741501",
    lane_origin: "INMUN",
    lane_destination: "DEHAM",
    container_type: "40HC",
    invoice_date: "2026-07-05",
    charge_code: "CAF",
    charge_description: "Currency Adjustment Factor",
    billed_amount: 93.6,
    billed_currency: "USD",
    contract_amount: 57.75,
    contract_currency: "USD",
    match_status: "mismatch",
    leak_category: "surcharge_error",
    leak_amount_usd: 35.85,
    evidence_note:
      "CAF billed at 5.2% of O/F ($1,650 × 5.2% = $85.80 + rounding to $93.60) instead of contracted 3.5% ($1,650 × 3.5% = $57.75). Clause 4.2 fixes CAF at 3.5% for contract duration. Overcharge of $35.85.",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88281",
    carrier: "OML",
    booking_no: "BK-OML-260702",
    bl_no: "MOLBL260468",
    container_no: "OMLU-7741501",
    lane_origin: "INMUN",
    lane_destination: "DEHAM",
    container_type: "40HC",
    invoice_date: "2026-07-05",
    charge_code: "DOC",
    charge_description: "Documentation Fee",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 45,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },

  // ════════════════════════════════════════════════════════════
  // NEW INVOICES — Pass 2 Spend Intelligence additions
  // ════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // INV-OML-88247 — Second spot booking on contracted lane (Pass 2)
  // Nhava Sheva → Rotterdam, 40HC, 2026-06-08
  // This creates the PATTERN: two spot bookings on contracted lanes
  // ────────────────────────────────────────────────────────────
  {
    invoice_id: "INV-OML-88247",
    carrier: "OML",
    booking_no: "BK-SPOT-260605",
    bl_no: "MOLBL260435",
    container_no: "OMLU-7741395",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-06-08",
    charge_code: "O/F",
    charge_description: "Ocean Freight (Spot)",
    billed_amount: 2480,
    billed_currency: "USD",
    contract_amount: 1800,
    contract_currency: "USD",
    match_status: "mismatch",
    leak_category: "off_contract_spot",
    leak_amount_usd: 680,
    evidence_note:
      "Spot booking at $2,480 on Nhava Sheva→Rotterdam lane where contract SC-OML-2026-0417 provides $1,800. Booking triggered by space constraint on original vessel. This is the second spot booking on a contracted lane in Q2 — combined with INV-OML-88240, total avoidable spot premium is $1,630. Pattern suggests systematic booking process gap.",
    pass_type: "pass2",
  },
  {
    invoice_id: "INV-OML-88247",
    carrier: "OML",
    booking_no: "BK-SPOT-260605",
    bl_no: "MOLBL260435",
    container_no: "OMLU-7741395",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-06-08",
    charge_code: "BAF",
    charge_description: "Bunker Adjustment Factor",
    billed_amount: 420,
    billed_currency: "USD",
    contract_amount: 360,
    contract_currency: "USD",
    match_status: "mismatch",
    leak_category: "surcharge_error",
    leak_amount_usd: 60,
    evidence_note:
      "Spot booking BAF at $420 vs contracted cap of $360. Even on spot bookings, BAF should not exceed contractual cap per clause 4.2 if booking references the master contract.",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-OML-88247",
    carrier: "OML",
    booking_no: "BK-SPOT-260605",
    bl_no: "MOLBL260435",
    container_no: "OMLU-7741395",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    invoice_date: "2026-06-08",
    charge_code: "DOC",
    charge_description: "Documentation Fee",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 45,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },

  // ────────────────────────────────────────────────────────────
  // INV-ASC-11018 — Clean ASC invoice, builds Q2 TEU count (Pass 2 context)
  // Nhava Sheva → Rotterdam, 20GP, 2026-05-20
  // ────────────────────────────────────────────────────────────
  {
    invoice_id: "INV-ASC-11018",
    carrier: "ASC",
    booking_no: "BK-ASC-260515",
    bl_no: "ASCBL260498",
    container_no: "ASCU-3320142",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    invoice_date: "2026-05-20",
    charge_code: "O/F",
    charge_description: "Ocean Freight",
    billed_amount: 1200,
    billed_currency: "USD",
    contract_amount: 1200,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-ASC-11018",
    carrier: "ASC",
    booking_no: "BK-ASC-260515",
    bl_no: "ASCBL260498",
    container_no: "ASCU-3320142",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    invoice_date: "2026-05-20",
    charge_code: "BAF",
    charge_description: "Bunker Adjustment Factor",
    billed_amount: 255,
    billed_currency: "USD",
    contract_amount: 255,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-ASC-11018",
    carrier: "ASC",
    booking_no: "BK-ASC-260515",
    bl_no: "ASCBL260498",
    container_no: "ASCU-3320142",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    invoice_date: "2026-05-20",
    charge_code: "DOC",
    charge_description: "Documentation Fee",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 45,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },

  // ────────────────────────────────────────────────────────────
  // INV-ASC-11025 — Clean ASC invoice, builds Q2 TEU count (Pass 2 context)
  // Nhava Sheva → Rotterdam, 20GP, 2026-06-12
  // ────────────────────────────────────────────────────────────
  {
    invoice_id: "INV-ASC-11025",
    carrier: "ASC",
    booking_no: "BK-ASC-260608",
    bl_no: "ASCBL260505",
    container_no: "ASCU-3320165",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    invoice_date: "2026-06-12",
    charge_code: "O/F",
    charge_description: "Ocean Freight",
    billed_amount: 1200,
    billed_currency: "USD",
    contract_amount: 1200,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-ASC-11025",
    carrier: "ASC",
    booking_no: "BK-ASC-260608",
    bl_no: "ASCBL260505",
    container_no: "ASCU-3320165",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    invoice_date: "2026-06-12",
    charge_code: "BAF",
    charge_description: "Bunker Adjustment Factor",
    billed_amount: 255,
    billed_currency: "USD",
    contract_amount: 255,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
  {
    invoice_id: "INV-ASC-11025",
    carrier: "ASC",
    booking_no: "BK-ASC-260608",
    bl_no: "ASCBL260505",
    container_no: "ASCU-3320165",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    invoice_date: "2026-06-12",
    charge_code: "DOC",
    charge_description: "Documentation Fee",
    billed_amount: 45,
    billed_currency: "USD",
    contract_amount: 45,
    contract_currency: "USD",
    match_status: "matched",
    leak_category: "none",
    leak_amount_usd: 0,
    evidence_note: "",
    pass_type: "pass1",
  },
];

// ── Table 3: Volume Rebate Terms ─────────────────────────────

export const VOLUME_REBATE_TERMS: VolumeRebateTerm[] = [
  {
    carrier: "OML",
    contract_id: "SC-OML-2026-0417",
    rebate_threshold_teu: 3000,
    rebate_percentage: 3,
    measurement_period: "Q2-2026",
    period_label: "Apr–Jun 2026",
    clause_ref: "cl. 6.1",
    clause_text:
      "A 3% retroactive volume rebate shall apply to all ocean freight charges once cumulative TEU volume exceeds 3,000 TEU within the applicable quarter.",
  },
  {
    carrier: "ASC",
    contract_id: "SC-ASC-2026-0091",
    rebate_threshold_teu: 2500,
    rebate_percentage: 2,
    measurement_period: "Q2-2026",
    period_label: "Apr–Jun 2026",
    clause_ref: "cl. 6.2",
    clause_text:
      "A 2% retroactive rebate shall apply to all ocean freight charges once cumulative TEU volume crosses the Minimum Quantity Commitment (MQC) of 2,500 TEU within the applicable quarter.",
  },
];

// ── Table 4: Shipment Log ────────────────────────────────────
// One row per physical shipment. Links to invoices.
// Used by Pass 2 to detect spot bookings on contracted lanes
// and to compute cumulative TEU for rebate analysis.

export const SHIPMENT_LOG: ShipmentRecord[] = [
  // ── OML contract shipments ────────────────────
  {
    shipment_id: "SHP-001",
    shipment_date: "2026-05-12",
    carrier: "OML",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    container_count: 1,
    teu: 2,
    booking_type: "contract",
    freight_forwarder: null,
    linked_invoice_id: "INV-OML-88213",
    contracted_rate_available: true,
    contracted_rate_usd: 1800,
    actual_rate_usd: 2050,
    avoidable_premium_usd: 0, // rate error, not a spot decision
  },
  {
    shipment_id: "SHP-002",
    shipment_date: "2026-05-14",
    carrier: "OML",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    container_count: 1,
    teu: 2,
    booking_type: "contract",
    freight_forwarder: null,
    linked_invoice_id: "INV-OML-88214",
    contracted_rate_available: true,
    contracted_rate_usd: 1800,
    actual_rate_usd: 1800,
    avoidable_premium_usd: 0,
  },
  // ── OML spot bookings on contracted lanes (Pass 2 flags) ──
  {
    shipment_id: "SHP-003",
    shipment_date: "2026-06-01",
    carrier: "OML",
    lane_origin: "INMUN",
    lane_destination: "DEHAM",
    container_type: "40HC",
    container_count: 1,
    teu: 2,
    booking_type: "spot",
    freight_forwarder: "GlobalFreight Logistics",
    linked_invoice_id: "INV-OML-88240",
    contracted_rate_available: true,
    contracted_rate_usd: 1650,
    actual_rate_usd: 2600,
    avoidable_premium_usd: 950,
  },
  {
    shipment_id: "SHP-004",
    shipment_date: "2026-06-06",
    carrier: "OML",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    container_count: 1,
    teu: 2,
    booking_type: "spot",
    freight_forwarder: "GlobalFreight Logistics",
    linked_invoice_id: "INV-OML-88247",
    contracted_rate_available: true,
    contracted_rate_usd: 1800,
    actual_rate_usd: 2480,
    avoidable_premium_usd: 680,
  },
  // ── OML contract shipments (continued) ────────
  {
    shipment_id: "SHP-005",
    shipment_date: "2026-06-08",
    carrier: "OML",
    lane_origin: "INNSA",
    lane_destination: "USLGB",
    container_type: "40GP",
    container_count: 1,
    teu: 2,
    booking_type: "contract",
    freight_forwarder: null,
    linked_invoice_id: "INV-OML-88255",
    contracted_rate_available: true,
    contracted_rate_usd: 2950,
    actual_rate_usd: 2950,
    avoidable_premium_usd: 0,
  },
  {
    shipment_id: "SHP-006",
    shipment_date: "2026-06-16",
    carrier: "OML",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "40HC",
    container_count: 1,
    teu: 2,
    booking_type: "contract",
    freight_forwarder: null,
    linked_invoice_id: "INV-OML-88266",
    contracted_rate_available: true,
    contracted_rate_usd: 1800,
    actual_rate_usd: 1800,
    avoidable_premium_usd: 0,
  },
  {
    shipment_id: "SHP-007",
    shipment_date: "2026-07-03",
    carrier: "OML",
    lane_origin: "INMUN",
    lane_destination: "DEHAM",
    container_type: "40HC",
    container_count: 1,
    teu: 2,
    booking_type: "contract",
    freight_forwarder: null,
    linked_invoice_id: "INV-OML-88281",
    contracted_rate_available: true,
    contracted_rate_usd: 1650,
    actual_rate_usd: 1650,
    avoidable_premium_usd: 0,
  },
  // ── ASC shipments (building Q2 TEU count) ─────
  {
    shipment_id: "SHP-008",
    shipment_date: "2026-04-08",
    carrier: "ASC",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    container_count: 850,
    teu: 850,
    booking_type: "contract",
    freight_forwarder: null,
    linked_invoice_id: "—", // bulk Q2 shipments before our invoice window
    contracted_rate_available: true,
    contracted_rate_usd: 1200,
    actual_rate_usd: 1200,
    avoidable_premium_usd: 0,
  },
  {
    shipment_id: "SHP-009",
    shipment_date: "2026-05-18",
    carrier: "ASC",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    container_count: 880,
    teu: 880,
    booking_type: "contract",
    freight_forwarder: null,
    linked_invoice_id: "INV-ASC-11018",
    contracted_rate_available: true,
    contracted_rate_usd: 1200,
    actual_rate_usd: 1200,
    avoidable_premium_usd: 0,
  },
  {
    shipment_id: "SHP-010",
    shipment_date: "2026-06-10",
    carrier: "ASC",
    lane_origin: "INNSA",
    lane_destination: "NLRTM",
    container_type: "20GP",
    container_count: 870,
    teu: 870,
    booking_type: "contract",
    freight_forwarder: null,
    linked_invoice_id: "INV-ASC-11025",
    contracted_rate_available: true,
    contracted_rate_usd: 1200,
    actual_rate_usd: 1200,
    avoidable_premium_usd: 0,
  },
  // This is the shipment that pushes ASC over the 2,500 TEU threshold
  // 850 + 880 + 870 = 2,600 TEU → crosses 2,500 MQC
  // But rebate was never applied on INV-ASC-11032
];

// ── Helpers ──────────────────────────────────────────────────

export function fmtUsd(n: number, cents = true): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
}

export function fmtMoney(value: number, currency: string): string {
  const sym: Record<string, string> = { USD: "$", EUR: "€", INR: "₹" };
  const prefix = sym[currency] || currency + " ";
  return `${prefix}${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function laneLabel(code: string): string {
  return LANE_LABELS[code] || code;
}

export function lanePair(origin: string, dest: string): string {
  return `${laneLabel(origin)} → ${laneLabel(dest)}`;
}

export function findContract(
  carrier: string,
  origin: string,
  dest: string,
  containerType: string
): RateCardRow | undefined {
  return RATE_CARD.find(
    (r) =>
      r.carrier === carrier &&
      r.lane_origin === origin &&
      r.lane_destination === dest &&
      r.container_type === containerType
  );
}

export function getInvoices(): InvoiceSummary[] {
  const grouped = new Map<string, InvoiceLine[]>();
  for (const line of INVOICE_LINES) {
    if (!grouped.has(line.invoice_id)) grouped.set(line.invoice_id, []);
    grouped.get(line.invoice_id)!.push(line);
  }

  const invoices: InvoiceSummary[] = [];
  for (const [id, lines] of grouped) {
    const first = lines[0];
    const billedTotal = lines.reduce(
      (sum, l) => sum + l.billed_amount * (FX[l.billed_currency] || 1),
      0
    );
    const leakTotal = lines.reduce((sum, l) => sum + l.leak_amount_usd, 0);
    const mismatchCount = lines.filter(
      (l) => l.match_status === "mismatch"
    ).length;
    const needsReviewCount = lines.filter(
      (l) => l.match_status === "needs_review"
    ).length;

    const status: MatchStatus =
      mismatchCount > 0
        ? "mismatch"
        : needsReviewCount > 0
        ? "needs_review"
        : "matched";

    const contract = findContract(
      first.carrier,
      first.lane_origin,
      first.lane_destination,
      first.container_type
    );

    invoices.push({
      invoice_id: id,
      carrier: first.carrier,
      lane_origin: first.lane_origin,
      lane_destination: first.lane_destination,
      container_type: first.container_type,
      invoice_date: first.invoice_date,
      bl_no: first.bl_no,
      booking_no: first.booking_no,
      container_no: first.container_no,
      lines,
      billed_total_usd: billedTotal,
      leak_total_usd: leakTotal,
      mismatch_count: mismatchCount,
      needs_review_count: needsReviewCount,
      status,
      contract_id: contract?.contract_id || "—",
    });
  }

  return invoices.sort(
    (a, b) =>
      new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()
  );
}

// ── Pass 2 Intelligence Helpers ──────────────────────────────

export function getSpotBookingsOnContractedLanes(): ShipmentRecord[] {
  return SHIPMENT_LOG.filter(
    (s) => s.booking_type === "spot" && s.contracted_rate_available
  );
}

export function getTotalAvoidableSpotPremium(): number {
  return getSpotBookingsOnContractedLanes().reduce(
    (sum, s) => sum + s.avoidable_premium_usd,
    0
  );
}

export function getVolumeRebateAnalysis(): Array<{
  carrier: string;
  contract_id: string;
  threshold_teu: number;
  actual_teu: number;
  gap_teu: number;
  crossed: boolean;
  rebate_pct: number;
  rebate_missed_usd: number;
  clause_ref: string;
  period_label: string;
}> {
  return VOLUME_REBATE_TERMS.map((term) => {
    const carrierShipments = SHIPMENT_LOG.filter(
      (s) => s.carrier === term.carrier && s.booking_type === "contract"
    );
    const actualTeu = carrierShipments.reduce((sum, s) => sum + s.teu, 0);
    const crossed = actualTeu >= term.rebate_threshold_teu;

    // Sum the rebate shortfall already flagged on invoice lines for this carrier
    const rebateMissed = crossed
      ? INVOICE_LINES.filter(
          (l) =>
            l.carrier === term.carrier &&
            l.leak_category === "volume_rebate_shortfall"
        ).reduce((sum, l) => sum + l.leak_amount_usd, 0)
      : 0;

    return {
      carrier: term.carrier,
      contract_id: term.contract_id,
      threshold_teu: term.rebate_threshold_teu,
      actual_teu: actualTeu,
      gap_teu: Math.max(0, term.rebate_threshold_teu - actualTeu),
      crossed,
      rebate_pct: term.rebate_percentage,
      rebate_missed_usd: rebateMissed,
      clause_ref: term.clause_ref,
      period_label: term.period_label,
    };
  });
}

// ── Aggregate stats ──────────────────────────────────────────

export function getPortfolioStats() {
  const invoices = getInvoices();
  const allLines = INVOICE_LINES;
  const totalBilled = invoices.reduce((s, i) => s + i.billed_total_usd, 0);
  const totalLeak = invoices.reduce((s, i) => s + i.leak_total_usd, 0);
  const leakLines = allLines.filter((l) => l.match_status === "mismatch");

  const pass1Leak = leakLines
    .filter((l) => l.pass_type === "pass1")
    .reduce((s, l) => s + l.leak_amount_usd, 0);

  const pass2Leak = leakLines
    .filter((l) => l.pass_type === "pass2")
    .reduce((s, l) => s + l.leak_amount_usd, 0);

  const byCategory = new Map<LeakCategory, number>();
  for (const l of leakLines) {
    byCategory.set(
      l.leak_category,
      (byCategory.get(l.leak_category) || 0) + l.leak_amount_usd
    );
  }

  const byCarrier = new Map<string, number>();
  for (const l of leakLines) {
    byCarrier.set(
      l.carrier,
      (byCarrier.get(l.carrier) || 0) + l.leak_amount_usd
    );
  }

  const byLane = new Map<string, number>();
  for (const l of leakLines) {
    const lane = `${l.lane_origin}→${l.lane_destination}`;
    byLane.set(lane, (byLane.get(lane) || 0) + l.leak_amount_usd);
  }

  return {
    invoiceCount: invoices.length,
    lineCount: allLines.length,
    totalBilled,
    totalLeak,
    leakRate: totalLeak / totalBilled,
    leakLineCount: leakLines.length,
    pass1Leak,
    pass2Leak,
    byCategory: Object.fromEntries(byCategory),
    byCarrier: Object.fromEntries(byCarrier),
    byLane: Object.fromEntries(byLane),
    spotPremium: getTotalAvoidableSpotPremium(),
    rebateAnalysis: getVolumeRebateAnalysis(),
  };
}
