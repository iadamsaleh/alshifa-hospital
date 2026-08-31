import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { startOfMonthLocal, todayLocal } from "../../utils/date";

export default function DoctorReport() {
  const { authFetch } = useAuth();
  const [dateFrom, setDateFrom] = useState(startOfMonthLocal());
  const [dateTo, setDateTo] = useState(todayLocal());
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ dateFrom, dateTo });
    authFetch(`/reports/doctors?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load doctor report");
        return res.json();
      })
      .then((data) => setDoctors(data.doctors))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{error}</p>
      )}

      <section className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : doctors.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No doctors found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Doctor</th>
                <th className="px-4 py-2 font-medium">Specialization</th>
                <th className="px-4 py-2 font-medium text-right">OPD Patients</th>
                <th className="px-4 py-2 font-medium text-right">Admissions Handled</th>
                <th className="px-4 py-2 font-medium text-right">Total Fees (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctors.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{d.name}</td>
                  <td className="px-4 py-2 text-slate-600">{d.specialization}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{d.opdCount}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{d.admissionsCount}</td>
                  <td className="px-4 py-2 text-right text-slate-800 font-medium">
                    {d.totalFees.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
