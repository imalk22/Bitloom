const variants = {
  primary:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border border-transparent",
  ghost:
    "bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--elevated)]",
  buy: "bg-[var(--up)] text-[#042f2e] hover:brightness-110 border border-transparent font-semibold",
  sell: "bg-[var(--down)] text-white hover:brightness-110 border border-transparent font-semibold",
  soft: "bg-[var(--elevated)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)]",
  light:
    "bg-[var(--mkt-text)] text-white hover:opacity-90 border border-transparent",
  lightGhost:
    "bg-white text-[var(--mkt-text)] border border-[var(--mkt-border)] hover:bg-[var(--mkt-bg-2)]",
};

export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  disabled,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-[4px] px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
