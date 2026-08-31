import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";

function formatShortDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch("/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>;
  if (!data) return null;

  const revenueChartData = data.revenueWeek.map((d) => ({ ...d, label: formatShortDate(d.date) }));
  const visitsChartData = data.visitsMonth.map((d) => ({ ...d, label: formatShortDate(d.date) }));

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Welcome, {user.name}</h1>
        <p className="text-slate-500 text-sm">Al-Shifa Diagnostic Centre — Administrator Dashboard</p>
      </header>

      {/* Row 1 — today's summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Today's OPD Patients" value={data.today.opdCount} />
        <StatCard label="Today's New Admissions" value={data.today.newAdmissions} />
        <StatCard label="Today's Revenue (PKR)" value={data.today.revenue.toLocaleString()} />
        <StatCard label="Currently Admitted" value={data.today.currentlyAdmitted} />
      </div>

      {/* Row 2 — hospital status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Beds (Total / Occupied / Available)"
          value={`${data.beds.total} / ${data.beds.occupied} / ${data.beds.available}`}
          accent="text-blue-950"
        />
        <StatCard
          label="Bed Occupancy"
          value={`${data.beds.occupancyPercent}%`}
          accent={data.beds.occupancyPercent >= 85 ? "text-red-600" : "text-blue-950"}
        />
        <StatCard
          label="Low Stock Medicines"
          value={data.lowStockCount}
          accent={data.lowStockCount > 0 ? "text-amber-600" : "text-blue-950"}
          onClick={() => navigate("/pharmacy/inventory")}
        />
        <StatCard label="Pending Lab Results" value={data.pendingLabResultsCount} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Doctors Today" value={data.activeDoctorsToday} />
      </div>

      {/* Row 3 — charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <section className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Revenue This Week (PKR)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="lab" name="Lab" stackId="rev" fill="#1e3a8a" />
              <Bar dataKey="pharmacy" name="Pharmacy" stackId="rev" fill="#0891b2" />
              <Bar dataKey="opd" name="OPD" stackId="rev" fill="#0f172a" />
              <Bar dataKey="admission" name="Admissions" stackId="rev" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Patient Visits This Month</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={visitsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="opd" name="OPD Visits" stroke="#1e3a8a" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="admissions"
                name="Admissions"
                stroke="#0891b2"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Row 4 — mini tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Today's OPD Queue</h2>
            <button
              type="button"
              onClick={() => navigate("/opd/today")}
              className="text-xs text-blue-950 hover:underline font-medium"
            >
              View Full Queue
            </button>
          </div>
          {data.opdQueue.length === 0 ? (
            <p className="text-slate-500 text-sm p-4">No patients waiting.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Token</th>
                  <th className="px-4 py-2 font-medium">Patient</th>
                  <th className="px-4 py-2 font-medium">Doctor</th>
                  <th className="px-4 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.opdQueue.slice(0, 8).map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-2 text-slate-800 font-medium">{v.tokenLabel}</td>
                    <td className="px-4 py-2 text-slate-800">{v.patientName}</td>
                    <td className="px-4 py-2 text-slate-600">{v.doctorName}</td>
                    <td className="px-4 py-2 text-slate-600">{formatTime(v.visitDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Recent Admissions</h2>
            <button
              type="button"
              onClick={() => navigate("/patients/active")}
              className="text-xs text-blue-950 hover:underline font-medium"
            >
              View All
            </button>
          </div>
          {data.recentAdmissions.length === 0 ? (
            <p className="text-slate-500 text-sm p-4">No patients currently admitted.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Patient</th>
                  <th className="px-4 py-2 font-medium">Room</th>
                  <th className="px-4 py-2 font-medium">Doctor</th>
                  <th className="px-4 py-2 font-medium">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentAdmissions.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 text-slate-800 font-medium">{a.patientName}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {a.room}
                      {a.bed ? ` — ${a.bed}` : ""}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{a.doctorName}</td>
                    <td className="px-4 py-2 text-slate-600">{a.daysAdmitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
