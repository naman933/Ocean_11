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
  PASS_LABELS,
  RATE_CARD,
  SHIPMENT_LOG,
  VOLUME_REBATE_TERMS,
  fmtMoney,
  fmtUsd,
  getPortfolioStats,
  lanePair,
} from "../lib/freight-data";

type Priority = "High" | "Medium" | "Low";
type PortfolioStats = ReturnType<typeof getPortfolioStats>;

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

const SYSTEM_PROMPT_INTRO =
  "You are the AI audit assistant for the KOSMIC Ocean Freight Leak Detector. You have access to the full audit results for Aarav Textiles & Industries. Answer questions about leaks, contracts, disputes, and recovery actions. Be specific — cite invoice IDs, clause references, and dollar amounts. Keep responses concise (3-5 sentences unless asked for detail). When asked to draft something, produce the full text.\n\nYou are particularly strong at explaining Pass 2 (Spend Intelligence) findings — these are cross-invoice patterns that no line-by-line audit would catch. When asked about spot bookings, explain the pattern across both instances, reference clause 5.1 carrier-rebooking protection, and recommend the SOP change. When asked about the volume rebate, walk through the 850+880+870 TEU accumulation story and reference clause 6.2. Always distinguish between Pass 1 (contract compliance — was the bill correct?) and Pass 2 (spend intelligence — was the decision correct?) when relevant.";

const SUGGESTED_QUESTIONS = [
  "Explain the spot booking pattern",
  "Show the rebate gap build-up",
  "What process changes prevent this?",
  "Top 3 recovery priorities",
  "Draft ASC rebate claim",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(leaks: Leak[], stats: PortfolioStats): string {
  const leaksContext = leaks.map((leak) => {
    const clause = clauseFor(leak.line.leak_category);
    return {
      invoice_id: leak.line.invoice_id,
      carrier: leak.line.carrier,
      lane: lanePair(leak.line.lane_origin, leak.line.lane_destination),
      charge_code: leak.line.charge_code,
      charge_description: leak.line.charge_description,
      category: LEAK_CATEGORY_LABELS[leak.line.leak_category],
      pass: PASS_LABELS[leak.line.pass_type],
      billed_amount: leak.line.billed_amount,
      billed_currency: leak.line.billed_currency,
      contract_amount: leak.line.contract_amount,
      contract_currency: leak.line.contract_currency,
      leak_amount_usd: leak.line.leak_amount_usd,
      priority: priorityOf(leak),
      owner: OWNER_BY_CATEGORY[leak.line.leak_category],
      evidence_note: leak.line.evidence_note,
      clause_ref: clause.ref,
      clause_text: clause.text,
      dispute_to: carrierDisputeEmail(leak.line.carrier),
      dispute_subject: disputeSubject(leak),
      dispute_email: draftDispute(leak, leak.invoice.contract_id),
    };
  });

  const context = {
    portfolio_stats: {
      total_billed_usd: stats.totalBilled,
      total_leak_usd: stats.totalLeak,
      leak_rate: stats.leakRate,
      pass1_leak_usd: stats.pass1Leak,
      pass2_leak_usd: stats.pass2Leak,
      by_category: stats.byCategory,
      by_carrier: stats.byCarrier,
      by_lane: stats.byLane,
      spot_premium_usd: stats.spotPremium,
      volume_rebate_analysis: stats.rebateAnalysis,
    },
    contract_terms: RATE_CARD,
    volume_rebate_terms: VOLUME_REBATE_TERMS,
    shipment_log: SHIPMENT_LOG,
    leaks: leaksContext,
  };

  return `${SYSTEM_PROMPT_INTRO}\n\nAUDIT DATA (JSON):\n${JSON.stringify(
    context
  )}`;
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

function ChatBubble({ role, content }: ChatMessage) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
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

function AuditAssistantPanel({
  leaks,
  stats,
}: {
  leaks: Leak[];
  stats: PortfolioStats;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const systemPrompt = useMemo(
    () => buildSystemPrompt(leaks, stats),
    [leaks, stats]
  );

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

    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
    if (!apiKey || apiKey.startsWith("your_")) {
      setUnavailable(true);
      return;
    }

    setLoading(true);
    setUnavailable(false);
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
              { role: "system", content: systemPrompt },
              ...nextMessages,
            ],
            temperature: 0.3,
          }),
        }
      );
      if (!res.ok) throw new Error(`Groq API error ${res.status}`);
      const data = await res.json();
      const reply: string | undefined = data?.choices?.[0]?.message?.content;
      if (!reply?.trim()) throw new Error("Empty response");
      setMessages((m) => [...m, { role: "assistant", content: reply.trim() }]);
    } catch {
      setUnavailable(true);
    } finally {
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
          <ChatBubble key={i} role={m.role} content={m.content} />
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
  const stats = useMemo(() => getPortfolioStats(), []);
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
            <AuditAssistantPanel leaks={leaks} stats={stats} />
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
