export default function Tabs({ tabs, value, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {tabs.map((tab) => {
        const id = typeof tab === "string" ? tab : tab.id;
        const label = typeof tab === "string" ? tab : tab.label;
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`cursor-pointer rounded-[2px] px-2.5 py-1.5 text-xs font-medium transition ${
              active
                ? "bg-[var(--accent)] text-white"
                : "bg-transparent text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
