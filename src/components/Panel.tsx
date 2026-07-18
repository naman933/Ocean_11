import type { ReactNode } from "react";

export default function Panel({
  title,
  kicker,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  kicker?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`border border-line bg-paper ${className}`}
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      {(title || kicker || right) && (
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            {kicker && (
              <div className="mono text-[10px] text-steel">{kicker}</div>
            )}
            {title && (
              <h2 className="display mt-0.5 text-[15px] font-semibold text-ink">
                {title}
              </h2>
            )}
          </div>
          {right && <div>{right}</div>}
        </header>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
