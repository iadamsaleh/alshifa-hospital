import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/StatCard";

const GENDER_COLORS = { Male: "#1e3a8a", Female: "#be185d" };
const FALLBACK_COLORS = ["#1e3a8a", "#be185d", "#0891b2", "#94a3b8"];

export default function PatientStatsReport() {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch("/reports/patients")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load patient statistics");
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

  const genderData = Object.entries(data.genderBreakdown).map(([name, value]) => ({ name, value }));
  const ageData = Object.entries(data.ageGroups).map(([group, count]) => ({ group, count }));

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Patients Registered" value={data.totalPatients} />
        <StatCard label="New This Month" value={data.newThisMonth} />
        <StatCard label="New Last Month" value={data.newLastMonth} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <section className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Gender Breakdown</h2>
          {genderData.length === 0 ? (
            <p className="text-slate-500 text-sm">No patient data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {genderData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={GENDER_COLORS[entry.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Age Group Breakdown</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="group" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Patients" fill="#1e3a8a" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700 border-b border-slate-100">
          Most Visited Patients (Top 10)
        </h2>
        {data.topVisited.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No visit data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Patient ID</th>
                <th className="px-4 py-2 font-medium text-right">Visit Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.topVisited.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{p.name}</td>
                  <td className="px-4 py-2 text-slate-600">{p.patientId}</td>
                  <td className="px-4 py-2 text-right text-slate-800">{p.visitCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
