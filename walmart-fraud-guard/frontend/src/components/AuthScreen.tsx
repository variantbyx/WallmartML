import { useState } from "react";
import axios from "axios";
import { useAuthStore } from "../store/authStore";
import type { User } from "../types";

type AuthMode = "signin" | "access";

type JwtPayload = {
  sub?: string;
  role?: "analyst" | "admin";
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(
      base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function AuthScreen() {
  const login = useAuthStore((state) => state.login);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [username, setUsername] = useState("analyst1");
  const [password, setPassword] = useState("analyst_password");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitLogin = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await axios.post("/api/v1/auth/login", {
        username,
        password,
      });

      const payload = decodeJwtPayload(response.data.access_token);
      const user: User = {
        user_id: payload?.sub || username,
        role:
          payload?.role || (username.startsWith("admin") ? "admin" : "analyst"),
      };

      login(user, response.data.access_token, response.data.refresh_token);
      setMessage(
        `Signed in as ${user.role === "admin" ? "Admin" : "Analyst"}.`,
      );
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        "Invalid credentials. Try analyst1 / analyst_password or admin1 / admin_password.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = (demoUser: string, demoPassword: string) => {
    setUsername(demoUser);
    setPassword(demoPassword);
    setMessage(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.18),_transparent_25%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_22%),linear-gradient(180deg,_#050816_0%,_#0a1020_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl lg:p-12">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-red-200">
              Fraud Operations Console
            </p>
            <h1 className="max-w-2xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              Walmart Fraud Guard
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Live risk scoring, analyst review workflow, drift monitoring, and
              model governance in one control room.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-slate-300">Model status</div>
                <div className="mt-2 text-2xl font-bold text-emerald-300">
                  Governed
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-slate-300">Monitoring</div>
                <div className="mt-2 text-2xl font-bold text-amber-300">
                  24/7
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-slate-300">Response</div>
                <div className="mt-2 text-2xl font-bold text-sky-300">
                  Real-time
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => loadDemo("analyst1", "analyst_password")}
                className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-left transition hover:bg-white/15"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                  Quick start
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Load analyst demo
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Use the built-in review account.
                </div>
              </button>
              <button
                type="button"
                onClick={() => loadDemo("admin1", "admin_password")}
                className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-left transition hover:bg-white/15"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-slate-300">
                  Quick start
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Load admin demo
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Use the privileged governance account.
                </div>
              </button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200/10 bg-white p-6 text-slate-900 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="flex rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 rounded-xl px-4 py-3 transition ${mode === "signin" ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("access")}
                className={`flex-1 rounded-xl px-4 py-3 transition ${mode === "access" ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
              >
                Register access
              </button>
            </div>

            {mode === "signin" ? (
              <div className="mt-6 space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Sign in to the console
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Use the demo analyst or admin account. The backend mock
                    credentials are enabled in this environment.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Username
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                      placeholder="analyst1"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                      placeholder="analyst_password"
                    />
                  </label>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {message ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={submitLogin}
                  disabled={loading}
                  className="w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => loadDemo("analyst1", "analyst_password")}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
                  >
                    Use analyst demo
                  </button>
                  <button
                    type="button"
                    onClick={() => loadDemo("admin1", "admin_password")}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
                  >
                    Use admin demo
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Request access
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Self-service registration is not enabled in this demo.
                    Accounts are provisioned by an admin.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  For now, use the demo analyst or admin login above. If you
                  want a real sign-up flow, the backend needs a registration
                  endpoint and user store.
                </div>

                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="w-full rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
