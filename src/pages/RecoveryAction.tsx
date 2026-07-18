import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Bot, Check, Copy, Send } from "lucide-react";
import { ScreenFrame, StepFooter } from "../components/AppShell";
import Panel from "../components/Panel";
import { STEPS } from "../lib/nav";
import {
  carrierDisputeEmail,
  clauseFor,
  collectLeaks,
  disputeSubject,
  draftDispute,
  priorityOf,
  type Leak,
} from "../lib/dispute";
import {
  LEAK_CATEGORY_LABELS,
  OWNER_BY_CATEGORY,
  fmtMoney,
  fmtUsd,
  lanePair,
} from "../lib/freight-data";

type Priority = "High" | "Medium" | "Low";

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

const PRIORITY_COLOR: Record<Priority, { bg: string; fg: string }> = {
  High: { bg: "var(--leak-soft)", fg: "var(--leak)" },
  Medium: { bg: "var(--gold-soft)", fg: "var(--gold)" },
  Low: { bg: "var(--green-soft)", fg: "var(--green)" },
};

function PriorityPill({ priority }: { priority: Priority }) {
  const c = PRIORITY_COLOR[priority];
  return (
    <Tag bg={c.bg} color={c.fg}>
      {priority}
    </Tag>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="mono inline-flex items-center gap-1.5 border border-line px-2.5 py-1.5 text-[10px] text-steel transition-colors hover:bg-mist"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Recovery register ────────────────────────────────────────

function RecoveryRegister({
  leaks,
  selectedIdx,
  onSelect,
}: {
  leaks: Leak[];
  selectedIdx: number;
  onSelect: (i: number) => void;
}) {
  const total = leaks.reduce((sum, l) => sum + l.line.leak_amount_usd, 0);

  return (
    <Panel
      kicker="RECOVERY REGISTER"
      title="Prioritized by dollar impact"
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
          <thead>
            <tr className="mono text-left text-[9px] text-steel-soft">
              <th className="py-2 pl-4 font-normal">#</th>
              <th className="py-2 font-normal">INVOICE</th>
              <th className="py-2 font-normal">CARRIER &middot; LANE</th>
              <th className="py-2 font-normal">CATEGORY</th>
              <th className="py-2 font-normal">PASS</th>
              <th className="py-2 text-right font-normal">$ AT STAKE</th>
              <th className="py-2 pl-3 font-normal">PRIORITY</th>
              <th className="py-2 pr-4 font-normal">OWNER</th>
            </tr>
          </thead>
          <tbody>
            {leaks.map((leak, i) => {
              const selected = i === selectedIdx;
              const isPass2 = leak.line.pass_type === "pass2";
              const priority = priorityOf(leak);
              return (
                <tr
                  key={i}
                  onClick={() => onSelect(i)}
                  className="cursor-pointer border-t border-line transition-colors hover:bg-mist"
                  style={{
                    backgroundColor: selected ? "var(--mist2)" : undefined,
                  }}
                >
                  <td
                    className="py-2.5 pl-4 text-steel-soft"
                    style={{
                      boxShadow: selected
                        ? "inset 2px 0 0 var(--leak)"
                        : isPass2
                        ? "inset 2px 0 0 var(--ink2)"
                        : undefined,
                    }}
                  >
                    {i + 1}
                  </td>
                  <td className="mono whitespace-nowrap py-2.5 pr-3 text-ink">
                    {leak.line.invoice_id}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-steel">
                    {leak.line.carrier} &middot;{" "}
                    {lanePair(leak.line.lane_origin, leak.line.lane_destination)}
                  </td>
                  <td className="py-2.5 pr-3 text-ink">
                    {LEAK_CATEGORY_LABELS[leak.line.leak_category]}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="mono inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] text-steel"
                      style={{
                        backgroundColor: "var(--mist2)",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      {leak.line.pass_type === "pass1" ? "P1" : "P2"}
                    </span>
                  </td>
                  <td className="mono tabular whitespace-nowrap py-2.5 text-right text-ink">
                    {fmtUsd(leak.line.leak_amount_usd, false)}
                  </td>
                  <td className="py-2.5 pl-3 pr-3">
                    <PriorityPill priority={priority} />
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-steel">
                    {OWNER_BY_CATEGORY[leak.line.leak_category]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        className="mono flex items-center justify-between border-t border-line px-4 py-3 text-[11px] text-steel"
        style={{ backgroundColor: "var(--mist)" }}
      >
        <span>TOTAL RECOVERABLE</span>
        <span className="tabular font-semibold text-ink">
          {fmtUsd(total)} across {leaks.length} leaks
        </span>
      </div>
    </Panel>
  );
}

// ── Evidence pack ────────────────────────────────────────────

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="border border-line p-3 text-center"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      <div className="mono text-[9px] text-steel-soft">{label}</div>
      <div
        className="mono tabular mt-1.5 text-[15px] font-semibold"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function EvidencePack({ leak }: { leak: Leak }) {
  const { line, invoice } = leak;
  const clause = clauseFor(line.leak_category);
  const email = draftDispute(leak, invoice.contract_id);
  const to = carrierDisputeEmail(line.carrier);
  const subject = disputeSubject(leak);

  return (
    <Panel
      kicker={invoice.invoice_id}
      title="Evidence Pack"
      right={
        <Tag bg="var(--leak-soft)" color="var(--leak)">
          {LEAK_CATEGORY_LABELS[line.leak_category]}
        </Tag>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <StatBox
          label="CONTRACTED"
          value={fmtMoney(line.contract_amount, line.contract_currency)}
          color="var(--green)"
        />
        <StatBox
          label="INVOICED"
          value={fmtMoney(line.billed_amount, line.billed_currency)}
          color="var(--ink)"
        />
        <StatBox
          label="OVERAGE"
          value={fmtUsd(line.leak_amount_usd, false)}
          color="var(--leak)"
        />
      </div>

      <div className="mt-5">
        <div className="mono text-[9px] text-steel-soft">{clause.ref}</div>
        <blockquote
          className="mt-2 border-l-2 bg-mist p-4 text-[13px] italic leading-relaxed text-steel"
          style={{
            borderLeftColor: "var(--steel-soft)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          &ldquo;{clause.text}&rdquo;
        </blockquote>
      </div>

      <div className="mt-5">
        <div className="mono flex items-center justify-between text-[9px] text-steel-soft">
          <span>AUTO-DRAFTED DISPUTE</span>
          <CopyButton text={email} />
        </div>
        <div className="mono mt-2 space-y-0.5 text-[10.5px] text-steel">
          <div>To: {to}</div>
          <div>Subject: {subject}</div>
        </div>
        <pre
          className="mt-2 whitespace-pre-wrap border border-line bg-mist p-3 text-[11.5px] leading-relaxed text-ink"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {email}
        </pre>
      </div>
    </Panel>
  );
}

// ── AI Audit Assistant ───────────────────────────────────────

const AUDIT_CONTEXT = `You are the AI audit assistant for KOSMIC Ocean Freight Leak Detector. You have analyzed the freight program for Aarav Textiles & Industries. Here are the complete audit findings:

PORTFOLIO SUMMARY:
- Total spend analyzed: $24,571 across 10 invoices, 40 charge lines
- Total leakage found: $3,170.85 (12.9% leak rate)
- Pass 1 (Contract Compliance): $1,320.85 — errors in how bills were calculated
- Pass 2 (Spend Intelligence): $1,850.00 — errors in how decisions were made

PASS 1 LEAKS (was the bill correct?):
1. INV-OML-88213 | Rate misapplication | $250 | Nhava Sheva→Rotterdam 40HC | Carrier applied legacy FY24-25 rate ($2,050) instead of contracted $1,800. Ref: Schedule A.
2. INV-OML-88213 | Surcharge error (BAF) | $60 | BAF billed $420 vs contracted cap $360. Carrier did not reset Q1 index. Ref: cl. 4.2.
3. INV-OML-88213 | Demurrage | $450 | Demurrage $450 for 5 days. Vessel arrived 4 days late (carrier fault). Cl. 8.3 waives demurrage on carrier-attributable delay.
4. INV-OML-88247 | Surcharge error (BAF) | $60 | BAF on spot booking at $420 vs cap $360. Ref: cl. 4.2.
5. INV-OML-88255 | Accessorial duplicate | $45 | Duplicate documentation fee on same B/L. Cl. 7.4 permits one DOC per B/L.
6. INV-OML-88266 | Detention overcharge | $420 | Billed 9 days at $60/day ($540). 7 free days + 6 congestion-paused days per cl. 8.5. Only 2 days chargeable ($120).
7. INV-OML-88281 | Surcharge error (CAF) | $35.85 | CAF at 5.2% instead of contracted 3.5%. Ref: cl. 4.2.

PASS 2 LEAKS (was the decision correct?):
8. INV-OML-88240 | Off-contract spot | $950 | Mundra→Hamburg booked spot at $2,600 vs contract $1,650. Triggered by blank sailing. Cl. 5.1 protects contracted rate on carrier-initiated rebooking.
9. INV-OML-88247 | Off-contract spot | $680 | Nhava Sheva→Rotterdam booked spot at $2,480 vs contract $1,800. Space constraint. Pattern: 2 spot bookings on contracted lanes in Q2 = $1,630 total avoidable premium. Root cause: booking team not invoking cl. 5.1.
10. INV-ASC-11032 | Volume rebate shortfall | $220 | ASC Q2 volume: 850+880+870 = 2,600 TEU, crossing 2,500 MQC threshold. 2% retroactive rebate under cl. 6.2 not applied.

CARRIERS: Odyssey Maritime Lines (OML) — $2,950.85 leakage. Atlas Sea Carriers (ASC) — $220.00 leakage.
CONTRACTS: SC-OML-2026-0417 (Apr 2026–Mar 2027), SC-ASC-2026-0091 (Jan–Dec 2026).
TOP LANES BY LEAKAGE: Nhava Sheva→Rotterdam $2,140, Mundra→Hamburg $985.85, Nhava Sheva→Long Beach $45.

RECOVERY PRIORITIES:
- High (>$400): Spot booking $950, Spot booking $680, Demurrage $450, Detention $420
- Medium ($100-400): Rate misapplication $250, Rebate shortfall $220
- Low (<$100): BAF errors $60 each, Duplicate $45, CAF error $35.85

PROCESS RECOMMENDATIONS:
- Add cl. 5.1 carrier-rebooking checkpoint to booking SOP to prevent spot leakage
- Implement quarterly TEU tracking dashboard per carrier to catch rebate thresholds before period close
- Automate BAF/CAF index reset verification at each quarter boundary
- Flag duplicate accessorial charges at invoice ingestion stage`;

const SYSTEM_PROMPT = `${AUDIT_CONTEXT}

INSTRUCTIONS: Be specific — cite invoice IDs, clause references, and dollar amounts from the findings above. Keep responses concise (3-5 sentences) unless asked for a draft or a detailed breakdown. When asked to draft something, produce the full text.`;

const SUGGESTED_QUESTIONS = [
  "Explain the spot booking pattern",
  "Show the rebate gap build-up",
  "What process changes prevent this?",
  "Top 3 recovery priorities",
  "Draft ASC rebate claim",
];

// Broad synthesis questions need more headroom than a single-fact lookup.
const SYNTHESIS_QUESTIONS = new Set([
  "What process changes prevent this?",
  "Top 3 recovery priorities",
]);

const GROQ_TIMEOUT_MS = 15000;

const FALLBACK_RESPONSES: Record<string, string> = {
  "Explain the spot booking pattern":
    "The agent found two off-contract spot bookings on lanes with active contracts, totaling $1,630 in avoidable premium:\n1. **INV-OML-88240** — Mundra→Hamburg booked spot at $2,600 vs. the contracted $1,650 ($950 premium). Triggered by a blank sailing.\n2. **INV-OML-88247** — Nhava Sheva→Rotterdam booked spot at $2,480 vs. the contracted $1,800 ($680 premium). Triggered by a space constraint.\n\nBoth lanes were covered under SC-OML-2026-0417, and clause 5.1 protects the contracted rate on carrier-initiated rebooking — the booking team should have invoked it instead of accepting spot pricing. This is a recurring pattern, not a one-off, which is why we're recommending a booking SOP checkpoint.",
  "Show the rebate gap build-up":
    "ASC's Q2 shipment volume under contract SC-ASC-2026-0091 built up as follows: 850 TEU in April, 880 TEU in May, and 870 TEU in June — a cumulative 2,600 TEU. That crosses the 2,500 TEU minimum quantity commitment (MQC) threshold in clause 6.2, which triggers a 2% retroactive rebate on the full quarter's volume. ASC never applied it, leaving $220 owed on INV-ASC-11032. This is a Pass 2 finding — no single invoice shows the shortfall, only the aggregated shipment history does.",
  "What process changes prevent this?":
    "Four process changes would prevent most of this leakage from recurring:\n1. **Booking SOP checkpoint** — Before any spot booking, verify no active contract covers that lane. If a contract exists and carrier can't provide space, invoke cl. 5.1 rebooking protection instead of accepting spot rates.\n2. **Quarterly TEU tracker** — Build a live dashboard tracking cumulative TEU per carrier against MQC thresholds. Alert the category manager when volume reaches 80% of threshold so remaining shipments can be routed to trigger the rebate.\n3. **Automated surcharge verification** — At each quarter boundary, validate that BAF and CAF index resets are reflected in carrier billing systems before accepting new invoices.\n4. **Invoice ingestion rules** — Flag duplicate charge codes on the same B/L at the point of invoice entry, before approval.",
  "Top 3 recovery priorities":
    "Based on the audit, your top 3 recovery priorities are:\n1. **Off-contract spot bookings** — $1,630 across 2 shipments. Both were on lanes with active contracts. File disputes under cl. 5.1 and add a rebooking checkpoint to your booking SOP.\n2. **Demurrage & detention overcharges** — $870 combined. Vessel delay (cl. 8.3) and port congestion (cl. 8.5) clauses clearly apply. Request credit notes with voyage delay evidence.\n3. **Rate misapplication** — $250 on INV-OML-88213. Carrier used legacy rate card. Straightforward credit request under Schedule A.",
  "Draft ASC rebate claim":
    "Subject: Volume Rebate Shortfall — Contract SC-ASC-2026-0091, Q2 2026\n\nTo: ASC Dispute Resolution\n\nOur Q2 2026 shipment volume under contract SC-ASC-2026-0091 totaled 2,600 TEU (850 in April, 880 in May, 870 in June), crossing the 2,500 TEU minimum quantity commitment threshold defined in clause 6.2. Per that clause, this entitles Aarav Textiles & Industries to a 2% retroactive rebate on the full quarter's volume, which has not been applied to invoice INV-ASC-11032.\n\nWe request a credit note for the outstanding rebate of $220, along with confirmation that the rebate will be applied automatically in future quarters whenever the threshold is crossed.\n\nRegards,\nAarav Textiles & Industries — Freight Audit Team",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  note?: string;
}

function formatMessageContent(content: string): ReactNode {
  return content.split("\n").map((line, i) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
    const text = isBullet ? trimmed.slice(2) : line;
    const parts = text
      .split(/(\*\*[^*]+\*\*)/g)
      .filter(Boolean)
      .map((part, j) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={j}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{part}</span>
        )
      );
    return (
      <div key={i} className={isBullet ? "flex gap-2" : undefined}>
        {isBullet && <span className="text-steel-soft">&bull;</span>}
        <span>{parts}</span>
      </div>
    );
  });
}

function ChatBubble({ role, content, note }: ChatMessage) {
  const isUser = role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] px-3 py-2 text-[13px] leading-relaxed ${
          isUser ? "text-white" : "text-ink"
        }`}
        style={{
          backgroundColor: isUser ? "var(--ink)" : "var(--mist)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {formatMessageContent(content)}
      </div>
      {note && (
        <div className="mt-1 px-1 text-[11px]" style={{ color: "var(--steel)" }}>
          {note}
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div
      className="inline-flex items-center gap-1 px-3 py-2.5"
      style={{ backgroundColor: "var(--mist)", borderRadius: "var(--radius-sm)" }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full"
          style={{
            backgroundColor: "var(--steel-soft)",
            animationDelay: `${i * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}

function AuditAssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");

    const fallback = FALLBACK_RESPONSES[trimmed];
    function showFallbackOrUnavailable() {
      if (fallback) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: fallback,
            note: "Response generated from cached analysis",
          },
        ]);
      } else {
        setUnavailable(true);
      }
    }

    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
    if (!apiKey || apiKey.startsWith("your_")) {
      showFallbackOrUnavailable();
      return;
    }

    setLoading(true);
    setUnavailable(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
    const isSynthesis = SYNTHESIS_QUESTIONS.has(trimmed);

    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...nextMessages.map(({ role, content }) => ({ role, content })),
            ],
            temperature: 0.3,
            max_tokens: isSynthesis ? 1000 : 800,
          }),
          signal: controller.signal,
        }
      );
      if (!res.ok) throw new Error(`Groq API error ${res.status}`);
      const data = await res.json();
      const reply: string | undefined = data?.choices?.[0]?.message?.content;
      if (!reply?.trim()) throw new Error("Empty response");
      setMessages((m) => [...m, { role: "assistant", content: reply.trim() }]);
    } catch {
      showFallbackOrUnavailable();
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <Panel
      kicker="ASK THE AGENT"
      title="AI Audit Assistant"
      bodyClassName="p-0"
    >
      <div ref={scrollRef} className="max-h-72 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !loading && (
          <p className="text-[13px] leading-relaxed text-steel">
            Ask about specific leaks, contract clauses, or request a dispute
            draft — the assistant has full context on this audit.
          </p>
        )}
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} note={m.note} />
        ))}
        {loading && <TypingIndicator />}
        {unavailable && !loading && (
          <div
            className="mono px-3 py-2.5 text-[10.5px] text-steel"
            style={{
              backgroundColor: "var(--gold-soft)",
              color: "var(--gold)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            AI assistant unavailable — dispute drafts still available above.
          </div>
        )}
      </div>

      <div className="border-t border-line p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={loading}
              className="mono border border-line px-2.5 py-1.5 text-[10px] text-steel transition-colors hover:bg-mist disabled:opacity-40"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              {q}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div
            className="flex flex-1 items-center gap-2 border border-line px-3 py-2"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <Bot size={14} color="var(--steel-soft)" className="shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a leak, clause, or recovery action…"
              className="flex-1 text-[13px] text-ink outline-none placeholder:text-steel-soft"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center justify-center bg-ink px-4 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </Panel>
  );
}

// ── Screen ───────────────────────────────────────────────────

export default function RecoveryAction() {
  const leaks = useMemo(() => collectLeaks(), []);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = leaks[selectedIdx];

  return (
    <>
      <ScreenFrame
        step={STEPS[4]}
        title="Prioritized register, one owner per leak, dispute already drafted."
        description="Work the recovery queue by dollar impact, then send the pre-drafted dispute."
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-7">
            <RecoveryRegister
              leaks={leaks}
              selectedIdx={selectedIdx}
              onSelect={setSelectedIdx}
            />
            <AuditAssistantPanel />
          </div>
          <div className="xl:col-span-5">
            {selected && <EvidencePack leak={selected} />}
          </div>
        </div>
      </ScreenFrame>
      <StepFooter prev="/detail" />
    </>
  );
}
