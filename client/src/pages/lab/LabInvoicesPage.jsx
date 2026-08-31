import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PAGE_SIZE = 10;

const STATUS_STYLES = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
};

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

export default function LabInvoicesPage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    authFetch(`/lab/invoices?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load lab invoices");
        return res.json();
      })
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status, dateFrom, dateTo, page]);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Lab Invoices</h1>
        <p className="text-slate-500 text-sm">Full history of lab invoices.</p>
      </header>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          placeholder="Search by patient name, ID or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
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
          <p className="text-slate-500 text-sm p-4">No lab invoices found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Invoice #</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Patient ID</th>
                <th className="px-4 py-2 font-medium">Tests</th>
                <th className="px-4 py-2 font-medium">Total (PKR)</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.data.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/lab/invoices/${inv.id}`)}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-2 text-slate-800 font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(inv.createdAt)}</td>
                  <td className="px-4 py-2 text-slate-800">{inv.patient.name}</td>
                  <td className="px-4 py-2 text-slate-600">{inv.patient.patientId}</td>
                  <td className="px-4 py-2 text-slate-600">{inv.tests.length}</td>
                  <td className="px-4 py-2 text-slate-600">PKR {inv.totalAmount}</td>
                  <td className="px-4 py-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.status]}`}>
                      {inv.status}
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
              Page {result.page} of {result.totalPages} ({result.total} invoices)
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
