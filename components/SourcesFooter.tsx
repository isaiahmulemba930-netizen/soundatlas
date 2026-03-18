import { HOMEPAGE_SOURCE_GROUPS } from "@/lib/source-attribution";

export function SourcesFooter() {
  return (
    <footer className="mt-10 border-t border-[var(--border-main)] pt-6 text-xs text-[var(--text-muted)]">
      <div className="flex items-center gap-3">
        <span className="kicker">Sources</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {HOMEPAGE_SOURCE_GROUPS.map((group) => (
          <div key={group.label} className="rounded-[1rem] border p-4" style={{ borderColor: "var(--border-main)", background: "rgba(255,255,255,0.02)" }}>
            <p className="font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">{group.label}</p>
            <p className="mt-2 leading-6">{group.sources.join(", ")}</p>
          </div>
        ))}
      </div>
    </footer>
  );
}
