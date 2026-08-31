import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const PAGE_SIZE = 10;

const STATUS_STYLES = {
  WAITING: "bg-amber-100 text-amber-800",
  WITH_DOCTOR: "bg-blue-100 text-blue-800",
  COMPLETE: "bg-emerald-100 text-emerald-800",
};

const STATUS_LABELS = {
  WAITING: "Waiting",
  WITH_DOCTOR: "With Doctor",
  COMPLETE: "Complete",
};

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

export default function OpdHistoryPage() {
  const { authFetch } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [doctors, setDoctors] = useState([]);
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch("/doctors?status=all")
      .then((res) => res.json())
      .then(setDoctors)
      .catch(() => setDoctors([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (doctorId) params.set("doctorId", doctorId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    authFetch(`/opd?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load OPD history");
        return res.json();
      })
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, doctorId, dateFrom, dateTo, page]);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">OPD History</h1>
        <p className="text-slate-500 text-sm">Full history of outpatient walk-in visits.</p>
      </header>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          placeholder="Search by patient name or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <select
          value={doctorId}
          onChange={(e) => {
            setDoctorId(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        >
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <span className="self-center text-slate-400 text-sm">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        {error && <p className="text-red-600 text-sm p-4">{error}</p>}
        {loading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : result.data.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No OPD visits found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Patient ID</th>
                <th className="px-4 py-2 font-medium">Doctor</th>
                <th className="px-4 py-2 font-medium">Chief Complaint</th>
                <th className="px-4 py-2 font-medium">Fee</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.data.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2 text-slate-600">{formatDate(v.visitDate)}</td>
                  <td className="px-4 py-2 text-slate-800 font-medium">{v.patient.name}</td>
                  <td className="px-4 py-2 text-slate-600">{v.patient.patientId}</td>
                  <td className="px-4 py-2 text-slate-600">{v.doctor.name}</td>
                  <td className="px-4 py-2 text-slate-600">{v.chiefComplaint || "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{v.doctorFee}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[v.status]}`}>
                      {STATUS_LABELS[v.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && result.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <p className="text-slate-500">
              Page {result.page} of {result.totalPages} ({result.total} visits)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 rounded border border-slate-300 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= result.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-slate-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
