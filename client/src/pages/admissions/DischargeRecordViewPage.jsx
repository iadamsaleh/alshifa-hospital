import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DischargeBillPrintLayout from "./DischargeBillPrintLayout";

export default function DischargeRecordViewPage() {
  const { id } = useParams();
  const { user, authFetch } = useAuth();
  const canMarkPaid = user.role === "ADMIN" || user.role === "RECEPTIONIST";

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch(`/admissions/${id}/discharge-record`);
      if (!res.ok) throw new Error("Failed to load discharge record");
      setRecord(await res.json());
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
      const res = await authFetch(`/admissions/${id}/discharge-record/pay`, { method: "PATCH" });
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
      const result = await window.electronAPI.exportPdf(`discharge-bill-${record.patient.patientId}.pdf`);
      setExportMessage(result?.success ? `Saved to ${result.filePath}` : null);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>;
  if (!record) return null;

  const roomDailyRate = record.daysAdmitted > 0 ? record.roomCharges / record.daysAdmitted : 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 print:hidden max-w-3xl mx-auto">
        <Link to={`/patients/${record.patient.id}`} className="text-sm text-blue-950 hover:underline">
          ← Back to Patient Profile
        </Link>
        <div className="flex items-center gap-2">
          {exportMessage && <span className="text-xs text-slate-500">{exportMessage}</span>}
          {canMarkPaid && !record.isPaid && (
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

      <DischargeBillPrintLayout
        patient={record.patient}
        admission={record.admission}
        dischargeDate={record.dischargeDate}
        daysAdmitted={record.daysAdmitted}
        roomDailyRate={roomDailyRate}
        roomCharges={record.roomCharges}
        doctorFee={record.doctorFee}
        procedureRows={record.procedureCharges}
        nursingChargeRows={record.nursingCharges}
        customRows={record.customCharges}
        labInvoices={record.labInvoices}
        pharmacyInvoices={record.pharmacyInvoices}
        grandTotal={record.totalBill}
        notes={record.notes}
        isPaid={record.isPaid}
      />
    </div>
  );
}
