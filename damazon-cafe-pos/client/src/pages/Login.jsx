import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Coffee, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/pos");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canopy-950 px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(63,125,82,0.5), transparent 40%), radial-gradient(circle at 80% 0%, rgba(208,132,42,0.35), transparent 45%), radial-gradient(circle at 50% 100%, rgba(63,125,82,0.4), transparent 50%)",
        }}
      />
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-canopy-800 text-3xl shadow-pop ring-4 ring-canopy-700/50">
            🦜
          </div>
          <h1 className="font-display text-2xl font-semibold text-white">D'Amazon Cafe</h1>
          <p className="mt-1 text-sm text-canopy-300">Taste the Wild. Savor the Moment.</p>
        </div>

        <form onSubmit={submit} className="rounded-xl2 bg-white p-6 shadow-pop dark:bg-canopy-900">
          <h2 className="mb-5 font-display text-lg font-semibold text-canopy-900 dark:text-canopy-50">
            Staff Sign In
          </h2>

          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-canopy-500 dark:text-canopy-400">
            Username
          </label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-4 w-full rounded-xl border border-canopy-200 bg-cream px-4 py-3 text-canopy-900 outline-none ring-canopy-500 focus:ring-2 dark:border-canopy-700 dark:bg-canopy-800 dark:text-canopy-50"
            placeholder="e.g. cashier1"
          />

          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-canopy-500 dark:text-canopy-400">
            Password
          </label>
          <div className="relative mb-2">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-canopy-200 bg-cream px-4 py-3 pr-11 text-canopy-900 outline-none ring-canopy-500 focus:ring-2 dark:border-canopy-700 dark:bg-canopy-800 dark:text-canopy-50"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-canopy-400 hover:text-canopy-600"
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-canopy-700 py-3 font-semibold text-white shadow-card transition hover:bg-canopy-600 disabled:opacity-60"
          >
            <Coffee size={18} />
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="mt-5 border-t border-canopy-100 pt-4 text-center text-xs text-canopy-400 dark:border-canopy-800">
            Demo accounts — click to fill
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            {[
              ["admin", "admin123", "Admin"],
              ["manager", "manager123", "Manager"],
              ["cashier1", "cashier123", "Cashier"],
            ].map(([u, p, label]) => (
              <button
                type="button"
                key={u}
                onClick={() => quickFill(u, p)}
                className="rounded-lg border border-canopy-200 py-1.5 font-medium text-canopy-600 hover:bg-canopy-50 dark:border-canopy-700 dark:text-canopy-300 dark:hover:bg-canopy-800"
              >
                {label}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
