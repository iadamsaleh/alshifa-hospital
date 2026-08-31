import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { calculateAge } from "../../utils/age";
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from "../../constants/hospital";

const STATUS_STYLES = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
};

export default function LabInvoiceViewPage() {
  const { id } = useParams();
  const { user, authFetch } = useAuth();
  const canMarkPaid = user.role === "ADMIN" || user.role === "LAB_ASSISTANT";

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch(`/lab/invoices/${id}`);
      if (!res.ok) throw new Error("Failed to load invoice");
      setInvoice(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleMarkPaid() {
    setMarking(true);
    try {
      const res = await authFetch(`/lab/invoices/${id}/pay`, { method: "PATCH" });
      if (res.ok) await load();
    } finally {
      setMarking(false);
    }
  }

  async function handleDownloadPdf() {
    if (!window.electronAPI?.exportPdf) {
      setExportMessage("PDF export is only available in the desktop app.");
      return;
    }
    setExporting(true);
    setExportMessage(null);
    try {
      const result = await window.electronAPI.exportPdf(`${invoice.invoiceNumber}.pdf`);
      setExportMessage(result?.success ? `Saved to ${result.filePath}` : null);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>;
  if (!invoice) return null;

  const { patient } = invoice;
  const createdAt = new Date(invoice.createdAt);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link to="/lab/invoices" className="text-sm text-blue-950 hover:underline">
          ← Back to Lab Invoices
        </Link>
        <div className="flex items-center gap-2">
          {exportMessage && <span className="text-xs text-slate-500">{exportMessage}</span>}
          {canMarkPaid && invoice.status !== "PAID" && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={marking}
              className="bg-emerald-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {marking ? "Marking..." : "Mark as Paid"}
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exporting}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Download as PDF"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-blue-950 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-900"
          >
            Print
          </button>
        </div>
      </div>

      <div className="print-area max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-blue-950">{HOSPITAL_NAME}</h1>
            <p className="text-xs text-slate-500">{HOSPITAL_ADDRESS}</p>
            <p className="text-xs text-slate-500">{HOSPITAL_PHONE}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800">Lab Invoice</p>
            <p className="text-xs text-slate-500">{invoice.invoiceNumber}</p>
            <p className="text-xs text-slate-500">{createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}</p>
            <span
              className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[invoice.status]}`}
            >
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-1 text-sm mb-6">
          <p className="text-slate-500">Patient Name</p>
          <p className="text-slate-800 font-medium text-right">{patient.name}</p>
          <p className="text-slate-500">Patient ID</p>
          <p className="text-slate-800 font-medium text-right">{patient.patientId}</p>
          <p className="text-slate-500">Gender</p>
          <p className="text-slate-800 font-medium text-right">{patient.gender}</p>
          <p className="text-slate-500">Age</p>
          <p className="text-slate-800 font-medium text-right">{calculateAge(patient.dateOfBirth)} yrs</p>
        </div>

        <table className="w-full text-sm mb-4">
          <thead className="text-left text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-2 font-medium">Test</th>
              <th className="py-2 font-medium">Code</th>
              <th className="py-2 font-medium text-right">Price (PKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.tests.map((t) => (
              <tr key={t.testId}>
                <td className="py-2 text-slate-800">{t.testName}</td>
                <td className="py-2 text-slate-500">{t.testCode}</td>
                <td className="py-2 text-right text-slate-800">{t.price}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end border-t border-slate-200 pt-4">
          <p className="text-lg font-semibold text-blue-950">Total: PKR {invoice.totalAmount}</p>
        </div>
      </div>
    </div>
  );
}
