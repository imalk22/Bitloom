const styles = {
  live: "text-[var(--up)]",
  reconnecting: "text-amber-400",
  offline: "text-[var(--down)]",
};

const labels = {
  live: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

export default function ConnectionStatus({ status = "offline" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${styles[status] || styles.offline}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "live" ? "bg-[var(--up)]" : status === "reconnecting" ? "bg-amber-400" : "bg-[var(--down)]"
        }`}
      />
      {labels[status] || "Offline"}
    </span>
  );
}
