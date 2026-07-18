import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Waves } from "lucide-react";
import { DEMO_CREDENTIALS, login as loginSession } from "../lib/auth";
import PostLoginLoader from "../components/PostLoginLoader";

type Phase = "form" | "authenticating" | "loading";

function LaneLines() {
  const lanes = [
    { y: 40, rotate: -2, delay: "0s", opacity: 0.14 },
    { y: 78, rotate: 1.5, delay: "-2s", opacity: 0.1 },
    { y: 116, rotate: -1, delay: "-4s", opacity: 0.12 },
    { y: 154, rotate: 2, delay: "-6s", opacity: 0.08 },
  ];

  return (
    <svg
      className="mt-10 w-full max-w-[380px]"
      viewBox="0 0 380 190"
      fill="none"
      aria-hidden="true"
    >
      {lanes.map((lane, i) => (
        <line
          key={i}
          x1="0"
          y1={lane.y}
          x2="380"
          y2={lane.y}
          stroke="#ffffff"
          strokeOpacity={lane.opacity}
          strokeWidth="1.5"
          strokeDasharray="4 10"
          className="lanes-drift"
          style={{
            animationDelay: lane.delay,
            transformOrigin: "center",
            transform: `rotate(${lane.rotate}deg)`,
          }}
        />
      ))}
    </svg>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="mono mb-1.5 block text-[11px] text-steel">
      {children}
    </label>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [phase, setPhase] = useState<Phase>("form");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (phase !== "form") return;

    const valid =
      username === DEMO_CREDENTIALS.username &&
      password === DEMO_CREDENTIALS.password;

    if (!valid) {
      setError(true);
      setShakeKey((k) => k + 1);
      return;
    }

    setError(false);
    setPhase("authenticating");
    setTimeout(() => {
      loginSession();
      setPhase("loading");
    }, 800);
  }

  if (phase === "loading") {
    return (
      <PostLoginLoader onComplete={() => navigate("/", { replace: true })} />
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left: brand panel ── */}
      <div
        className="hidden flex-col items-center justify-between px-10 py-16 lg:flex"
        style={{
          width: "55%",
          background: "linear-gradient(135deg, var(--ink), var(--ink2))",
        }}
      >
        <div />
        <div className="flex flex-col items-center text-center">
          <div
            className="flex h-14 w-14 items-center justify-center bg-white/10"
            style={{ borderRadius: "var(--radius-md)" }}
          >
            <Waves size={26} strokeWidth={2} color="#fff" />
          </div>
          <div
            className="display mt-6 text-[36px] font-bold text-white"
            style={{ letterSpacing: "-0.02em" }}
          >
            KOSMIC
          </div>
          <p className="mt-2 max-w-[360px] text-[16px] leading-relaxed text-white/60">
            Ocean Freight Spend Leakage &amp; Recovery Agent
          </p>
          <LaneLines />
        </div>
        <div className="mono text-[11px] text-white/30">
          Powered by Kearney &times; KOSMIC
        </div>
      </div>

      {/* ── Right: login form ── */}
      <div
        className="flex w-full flex-col items-center justify-center bg-paper px-8 lg:w-[45%]"
        style={{ width: "100%" }}
      >
        <div className="w-full max-w-[340px]">
          <div className="mono text-[11px] text-steel">SECURE ACCESS</div>
          <h1 className="display mt-2 text-[22px] font-bold text-ink">
            Sign in to continue
          </h1>
          <div className="mt-5 border-t border-line" />

          <form onSubmit={handleSubmit} className="mt-6" noValidate>
            <div>
              <FieldLabel>Username</FieldLabel>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(false);
                }}
                autoComplete="username"
                autoFocus
                className="h-10 w-full border border-line bg-white px-3 text-[14px] text-ink outline-none transition-colors focus:border-ink"
                style={{ borderRadius: "var(--radius-sm)" }}
              />
            </div>

            <div className="mt-4">
              <FieldLabel>Password</FieldLabel>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  autoComplete="current-password"
                  className="h-10 w-full border border-line bg-white px-3 pr-10 text-[14px] text-ink outline-none transition-colors focus:border-ink"
                  style={{ borderRadius: "var(--radius-sm)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-steel hover:text-ink"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              key={shakeKey}
              type="submit"
              disabled={phase === "authenticating"}
              className={`display mt-6 flex h-11 w-full items-center justify-center gap-2 bg-ink text-[14px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-80 ${
                error ? "shake" : ""
              }`}
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              {phase === "authenticating" ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign in"
              )}
            </button>

            {error && (
              <p className="mt-3 text-[13px]" style={{ color: "var(--leak)" }}>
                Invalid credentials
              </p>
            )}
          </form>

          <div
            className="mt-6 border border-line bg-mist px-4 py-3"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <div className="mono text-[9px] text-steel-soft">
              DEMO ACCESS
            </div>
            <div className="mono tabular mt-1.5 text-[11px] text-steel">
              {DEMO_CREDENTIALS.username} &middot; {DEMO_CREDENTIALS.password}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
