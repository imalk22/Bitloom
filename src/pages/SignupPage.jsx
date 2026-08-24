import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { auth, googleProvider, loadUserProfile } from "../firebase";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

function fbErr(err) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use")) return "That email is already registered.";
  if (code.includes("weak-password")) return "Use a stronger password (6+ characters).";
  return err?.message || "Sign up failed.";
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      await loadUserProfile(cred.user.uid);
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
      const cred = await signInWithPopup(auth, googleProvider);
      await loadUserProfile(cred.user.uid);
      navigate("/trade/BTCUSDT");
    } catch (err) {
      setError(fbErr(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[8px] border border-[var(--mkt-border)] bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-[var(--mkt-text)]">Create account</h1>
      <p className="mt-1 text-sm text-[var(--mkt-muted)]">Start with the Bitloom terminal in minutes.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input tone="light" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input tone="light" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          tone="light"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          hint="At least 6 characters"
        />
        {error && <p className="text-sm text-[var(--down)]">{error}</p>}
        <Button type="submit" variant="light" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
      <Button variant="lightGhost" className="mt-3 w-full" onClick={google} disabled={loading}>
        Continue with Google
      </Button>
      <p className="mt-4 text-center text-sm text-[var(--mkt-muted)]">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-[var(--accent)] hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
