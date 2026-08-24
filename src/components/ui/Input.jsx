export default function Input({ className = "", label, hint, error, tone = "dark", ...props }) {
  const light = tone === "light";
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className={`mb-1.5 block text-xs font-medium ${light ? "text-[var(--mkt-muted)]" : "text-[var(--muted)]"}`}>
          {label}
        </span>
      )}
      <input
        className={`w-full rounded-[4px] px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[var(--accent)]/40 ${
          light
            ? "border border-[var(--mkt-border)] bg-white text-[var(--mkt-text)] placeholder:text-[var(--mkt-muted)]"
            : "border border-[var(--border)] bg-[var(--elevated)] text-[var(--text)] placeholder:text-[var(--muted)]"
        } ${error ? "border-[var(--down)]" : ""}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-[var(--down)]">{error}</span>}
      {hint && !error && (
        <span className={`mt-1 block text-xs ${light ? "text-[var(--mkt-muted)]" : "text-[var(--muted)]"}`}>{hint}</span>
      )}
    </label>
  );
}
