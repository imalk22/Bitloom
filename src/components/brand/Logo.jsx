import { Link } from "react-router-dom";

export default function Logo({ tone = "dark", className = "" }) {
  const color = tone === "light" ? "text-[var(--accent)]" : "text-[var(--accent)]";
  return (
    <Link to="/" className={`inline-flex items-center gap-2 font-bold tracking-tight ${color} ${className}`}>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] bg-[var(--accent)] text-[11px] font-bold text-white">
        N
      </span>
      <span className="text-[15px] text-inherit">Bitloom</span>
    </Link>
  );
}
