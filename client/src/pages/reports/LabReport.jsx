import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/StatCard";

export default function LabReport() {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch("/reports/lab")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load lab report");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-slate-500 text-sm">Loading...</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Pending Results"
          value={data.pendingCount}
          accent={data.pendingCount > 0 ? "text-amber-600" : "text-blue-950"}
        />
        <StatCard label="Completed Results" value={data.completedCount} />
        <StatCard label="Lab Revenue This Month (PKR)" value={data.revenueThisMonth.toLocaleString()} />
      </div>

      <section className="bg-white rounded-lg shadow p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Most Common Tests Ordered (Top 10)</h2>
        {data.topTests.length === 0 ? (
          <p className="text-slate-500 text-sm">No lab invoices yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, data.topTests.length * 36)}>
            <BarChart data={data.topTests} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
              <YAxis type="category" dataKey="testName" tick={{ fontSize: 11 }} stroke="#64748b" width={180} />
              <Tooltip />
              <Bar dataKey="count" name="Times Ordered" fill="#1e3a8a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}
