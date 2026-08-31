import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/StatCard";
import RevenuePrintLayout from "./RevenuePrintLayout";
import { startOfMonthLocal, todayLocal } from "../../utils/date";

export default function RevenueReport() {
  const { authFetch } = useAuth();
  const [dateFrom, setDateFrom] = useState(startOfMonthLocal());
  const [dateTo, setDateTo] = useState(todayLocal());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ dateFrom, dateTo });
    authFetch(`/reports/revenue?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load revenue report");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  async function handleExportPdf() {
    if (!window.electronAPI?.exportPdf) {
      setExportMessage("PDF export is only available in the desktop app.");
      return;
    }
    setExporting(true);
    setExportMessage(null);
    try {
      const result = await window.electronAPI.exportPdf(`revenue-report-${dateFrom}-to-${dateTo}.pdf`);
      setExportMessage(result?.success ? `Saved to ${result.filePath}` : null);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-6 print:hidden">
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
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exporting || !data}
          className="bg-blue-950 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-900 disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export to PDF"}
        </button>
        {exportMessage && <span className="text-xs text-slate-500">{exportMessage}</span>}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 mb-4 print:hidden">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm print:hidden">Loading...</p>
      ) : data ? (
        <>
          <div className="print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <StatCard label="Total Revenue (PKR)" value={data.totals.total.toLocaleString()} />
              <StatCard label="Lab Revenue (PKR)" value={data.totals.lab.toLocaleString()} />
              <StatCard label="Pharmacy Revenue (PKR)" value={data.totals.pharmacy.toLocaleString()} />
              <StatCard label="OPD Revenue (PKR)" value={data.totals.opd.toLocaleString()} />
              <StatCard label="Admission/Room Revenue (PKR)" value={data.totals.admission.toLocaleString()} />
            </div>

            <section className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700 border-b border-slate-100">
                Daily Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium text-right">Lab</th>
                      <th className="px-4 py-2 font-medium text-right">Pharmacy</th>
                      <th className="px-4 py-2 font-medium text-right">OPD</th>
                      <th className="px-4 py-2 font-medium text-right">Admissions</th>
                      <th className="px-4 py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.byDay.map((d) => (
                      <tr key={d.date}>
                        <td className="px-4 py-2 text-slate-800">{new Date(d.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{d.lab.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{d.pharmacy.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{d.opd.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{d.admission.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-slate-800 font-medium">
                          {d.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="hidden print:block">
            <RevenuePrintLayout dateFrom={dateFrom} dateTo={dateTo} data={data} />
          </div>
        </>
      ) : null}
    </div>
  );
}
