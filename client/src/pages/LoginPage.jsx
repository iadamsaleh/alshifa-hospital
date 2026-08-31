import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_ROUTE_BY_ROLE } from "../roles";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(email, password);
      const redirectTo = location.state?.from?.pathname || DEFAULT_ROUTE_BY_ROLE[user.role] || "/";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-950 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-blue-950 text-white px-8 py-6 text-center border-b border-white/10">
          <h1 className="text-xl font-semibold">Al-Shifa Diagnostic Centre</h1>
          <p className="text-blue-200 text-sm mt-1">Hospital Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 grid gap-4">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-950 text-white rounded px-3 py-2 font-medium hover:bg-blue-900 transition disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
