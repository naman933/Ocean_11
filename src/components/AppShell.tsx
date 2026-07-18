import type { ReactNode } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, LogOut, Waves } from "lucide-react";
import { STEPS, type Step } from "../lib/nav";
import { logout } from "../lib/auth";

// ── TopBar ───────────────────────────────────────────────────

export function TopBar() {
  const navigate = useNavigate();

  function handleSignOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div
      className="flex h-12 items-center justify-between px-6 text-white"
      style={{
        background: "linear-gradient(90deg, var(--ink), var(--ink2))",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 items-center justify-center bg-white/10"
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          <Waves size={15} strokeWidth={2} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="display text-[14px] font-bold tracking-wide">
            KOSMIC
          </span>
          <span className="mono text-[9px] text-white/50">
            Leak Detector v0.4
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="mono flex items-center gap-1.5 text-[10px] text-white/70">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "var(--green)" }}
          />
          SYNC &middot; 04:12 AGO
        </div>
        <span className="text-[12.5px] text-white/85">
          Aarav Textiles &amp; Industries
        </span>
        <div className="mono flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold">
          AT
        </div>
        <button
          onClick={handleSignOut}
          className="mono flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-[10px] text-white/60 transition-colors hover:border-white/30 hover:text-white"
          style={{ borderRadius: "var(--radius-sm)" }}
        >
          <LogOut size={11} />
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── StepperNav ───────────────────────────────────────────────

export function StepperNav() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const withSearch = (path: string) => (search ? `${path}?${search}` : path);

  return (
    <nav
      className="sticky top-0 z-20 overflow-x-auto border-b border-line bg-white/85 backdrop-blur"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <div className="mx-auto grid min-w-[900px] max-w-[1600px] grid-cols-5">
        {STEPS.map((step) => {
          const active = location.pathname === step.path;
          return (
            <Link
              key={step.n}
              to={withSearch(step.path)}
              className={`flex items-center gap-3 border-r border-line px-5 py-3 last:border-r-0 transition-colors ${
                active ? "bg-mist" : "hover:bg-mist/60"
              }`}
            >
              <span
                className="mono flex h-7 w-7 shrink-0 items-center justify-center text-[11px]"
                style={{
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: active ? "var(--ink)" : "var(--mist2)",
                  color: active ? "#fff" : "var(--steel)",
                }}
              >
                {String(step.n).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-col">
                <span
                  className={`truncate text-[13px] font-medium ${
                    active ? "text-ink" : "text-steel"
                  }`}
                >
                  {step.label}
                </span>
                <span className="mono text-[9px] text-steel-soft">
                  {step.altitude}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ── ScreenFrame ──────────────────────────────────────────────

export function ScreenFrame({
  step,
  title,
  description,
  right,
  children,
}: {
  step: Step;
  title: string;
  description: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="border-b border-line bg-mist px-6 py-8">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mono text-[11px] text-steel">
              SCREEN {String(step.n).padStart(2, "0")} &middot; {step.altitude}
            </div>
            <h1 className="display mt-2 text-[26px] font-bold leading-tight text-ink">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-steel">
              {description}
            </p>
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-6 py-8">{children}</div>
    </div>
  );
}

// ── StepFooter ───────────────────────────────────────────────

export function StepFooter({
  prev,
  next,
  prevLabel = "Back",
  nextLabel = "Next",
}: {
  prev?: string;
  next?: string;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const withSearch = (path: string) => (search ? `${path}?${search}` : path);

  return (
    <div className="border-t border-line bg-paper px-6 py-5">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between">
        {prev ? (
          <Link
            to={withSearch(prev)}
            className="mono inline-flex items-center gap-2 border border-line bg-white px-4 py-2.5 text-[11px] text-ink transition-colors hover:bg-mist"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <ArrowLeft size={14} />
            {prevLabel}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={withSearch(next)}
            className="mono inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-[11px] text-white transition-opacity hover:opacity-90"
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            {nextLabel}
            <ArrowRight size={14} />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

// ── AppShell ─────────────────────────────────────────────────

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <TopBar />
      <StepperNav />
      {children}
    </div>
  );
}
