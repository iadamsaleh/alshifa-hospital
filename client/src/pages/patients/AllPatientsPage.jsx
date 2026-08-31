import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PAGE_SIZE = 10;

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export default function AllPatientsPage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

    authFetch(`/patients?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load patients");
        return res.json();
      })
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page]);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">All Patients</h1>
        <p className="text-slate-500 text-sm">Every patient registered at Al-Shifa Diagnostic Centre.</p>
      </header>

      <div className="mb-4">
        <input
          placeholder="Search by Patient ID, name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-slate-300 rounded px-3 py-2"
        />
      </div>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        {error && <p className="text-red-600 text-sm p-4">{error}</p>}

        {loading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : result.data.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No patients found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Patient ID</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Gender</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Last Visit</th>
                <th className="px-4 py-2 font-medium">Total Visits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.data.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-2 text-slate-800 font-medium">{p.patientId}</td>
                  <td className="px-4 py-2 text-slate-800">{p.name}</td>
                  <td className="px-4 py-2 text-slate-600">{p.gender}</td>
                  <td className="px-4 py-2 text-slate-600">{p.phone}</td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(p.lastVisitDate)}</td>
                  <td className="px-4 py-2 text-slate-600">{p.totalVisits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && result.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <p className="text-slate-500">
              Page {result.page} of {result.totalPages} ({result.total} patients)
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
