import { useEffect, useRef, useState } from "react";
import { Waves } from "lucide-react";

const PHASE1_MS = 1500;
const PHASE2_MS = 1500;
const PHASE3_MS = 1500;
const FADE_MS = 300;

const LEAK_TARGET = 10;
const RECOVERY_TARGET = 3171;

const PHASE1_MESSAGES = [
  "Syncing invoice records...",
  "Loading contract rate cards...",
  "Mapping shipment history...",
];

const PHASE2_MESSAGES = [
  "Scanning for rate misapplication...",
  "Checking surcharge compliance...",
  "Analyzing spot booking patterns...",
  "Aggregating volume rebate data...",
];

const PHASE3_MESSAGES = [
  "Quantifying recovery value...",
  "Building dispute evidence...",
  "Recovery plan ready.",
];

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useMessageCycle(messages: string[], active: boolean, intervalMs = 500) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    setIndex(0);
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return messages[index];
}

function useCountUp(target: number, durationMs: number, active: boolean) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!active) return;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * easeOutCubic(t)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return value;
}

export default function PostLoginLoader({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    const t2 = setTimeout(() => setPhase(2), PHASE1_MS);
    const t3 = setTimeout(() => setPhase(3), PHASE1_MS + PHASE2_MS);
    const t4 = setTimeout(() => setPhase(4), PHASE1_MS + PHASE2_MS + PHASE3_MS);
    const tDone = setTimeout(
      onComplete,
      PHASE1_MS + PHASE2_MS + PHASE3_MS + FADE_MS
    );
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(tDone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phase1Msg = useMessageCycle(PHASE1_MESSAGES, phase === 1, 480);
  const phase2Msg = useMessageCycle(PHASE2_MESSAGES, phase === 2, 360);
  const phase3Msg = useMessageCycle(PHASE3_MESSAGES, phase >= 3, 480);

  const leakCount = useCountUp(LEAK_TARGET, PHASE2_MS, phase === 2);
  const recoveryValue = useCountUp(RECOVERY_TARGET, 1000, phase === 3);

  const finalLeakCount = phase >= 3 ? LEAK_TARGET : leakCount;

  const barWidth = phase === 1 ? 50 : phase === 2 ? 80 : 100;
  const barDuration = phase === 1 ? PHASE1_MS : phase === 2 ? PHASE2_MS : PHASE3_MS;
  const barColor =
    phase === 1 ? "rgba(255,255,255,0.8)" : phase === 2 ? "var(--leak)" : "var(--green)";

  const statusLabel =
    phase === 1
      ? "CONNECTING TO FREIGHT DATA"
      : phase === 2
      ? "DETECTING LEAKAGE"
      : "SEALING & QUANTIFYING";
  const statusColor = phase === 1 ? "#ffffff" : phase === 2 ? "var(--leak)" : "var(--green)";

  const cycleMsg = phase === 1 ? phase1Msg : phase === 2 ? phase2Msg : phase3Msg;
  const cycleColor = phase === 1 ? "rgba(255,255,255,0.5)" : phase === 2 ? "var(--leak)" : "var(--green)";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${
        phase === 4 ? "loader-fade-out" : ""
      }`}
      style={{ backgroundColor: "var(--ink)" }}
    >
      <div className="logo-fade-in flex flex-col items-center">
        <div
          className={`flex h-14 w-14 items-center justify-center bg-white/10 ${
            phase === 3 ? "lock-flash" : ""
          }`}
          style={{ borderRadius: "var(--radius-md)" }}
        >
          <Waves size={26} strokeWidth={2} color="#fff" />
        </div>

        <div
          className="mono pulse-opacity mt-6 text-[11px] transition-colors duration-500"
          style={{ color: statusColor, letterSpacing: "0.16em" }}
        >
          {statusLabel}
        </div>

        <div
          className="mt-4 h-[2px] overflow-hidden bg-white/15"
          style={{ width: 200 }}
        >
          <div
            className="h-full"
            style={{
              width: `${barWidth}%`,
              backgroundColor: barColor,
              transition: `width ${barDuration}ms ease, background-color 400ms ease`,
            }}
          />
        </div>

        <div className="mt-3 h-4">
          <div key={cycleMsg} className="msg-fade mono text-[10px]" style={{ color: cycleColor }}>
            {cycleMsg}
          </div>
        </div>

        {phase >= 2 && (
          <div className="mt-10 flex flex-col items-center">
            <div
              className="display text-[48px] font-bold tabular transition-colors duration-500"
              style={{ color: phase >= 3 ? "var(--green)" : "var(--leak)" }}
            >
              {finalLeakCount}
            </div>
            <div
              className="mono mt-1 text-[12px] transition-colors duration-500"
              style={{ color: phase >= 3 ? "var(--green)" : "var(--leak)" }}
            >
              leaks detected
            </div>
          </div>
        )}

        {phase === 3 && (
          <div className="mt-8 flex flex-col items-center">
            <div className="display tabular text-[48px] font-bold" style={{ color: "var(--green)" }}>
              ${recoveryValue.toLocaleString()}
            </div>
            <div className="mono mt-1 text-[12px]" style={{ color: "var(--green)" }}>
              recoverable
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
