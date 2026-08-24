import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

function fbErr(err) {
  const code = err?.code || "";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Invalid email or password.";
  }
  if (code.includes("too-many-requests")) return "Too many attempts. Try again later.";
  return err?.message || "Sign in failed.";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate("/trade/BTCUSDT");
    } catch (err) {
      setError(fbErr(err));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/trade/BTCUSDT");
    } catch (err) {
      setError(fbErr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[8px] border border-[var(--mkt-border)] bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-[var(--mkt-text)]">Log in</h1>
      <p className="mt-1 text-sm text-[var(--mkt-muted)]">Access your Bitloom terminal and portfolio.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input tone="light" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          tone="light"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-[var(--down)]">{error}</p>}
        <Button type="submit" variant="light" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Log in"}
        </Button>
      </form>
      <Button variant="lightGhost" className="mt-3 w-full" onClick={google} disabled={loading}>
        Continue with Google
      </Button>
      <p className="mt-4 text-center text-sm text-[var(--mkt-muted)]">
        No account?{" "}
        <Link to="/signup" className="font-medium text-[var(--accent)] hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
