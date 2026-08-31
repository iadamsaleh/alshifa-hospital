import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LabReportPrintLayout from "./LabReportPrintLayout";
import { whatsAppLabReportUrl, openWhatsApp } from "../../utils/whatsapp";

function WhatsAppTooltip({ onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-10 z-30 w-72 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-sm"
    >
      <p className="font-semibold text-slate-800 mb-1">PDF downloaded</p>
      <p className="text-slate-600 text-xs">
        WhatsApp Web has opened with a pre-filled message. Please attach the downloaded PDF manually in the chat.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-xs text-blue-700 hover:underline"
      >
        Got it
      </button>
    </div>
  );
}

export default function LabResultViewPage() {
  const { id } = useParams();
  const { authFetch } = useAuth();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);
  const [whatsAppWorking, setWhatsAppWorking] = useState(false);
  const [showWhatsAppTooltip, setShowWhatsAppTooltip] = useState(false);

  useEffect(() => {
    authFetch(`/lab/results/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load lab result");
        return res.json();
      })
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDownloadPdf() {
    if (!window.electronAPI?.exportPdf) {
      setExportMessage("PDF export is only available in the desktop app.");
      return;
    }
    setExporting(true);
    setExportMessage(null);
    try {
      const fileResult = await window.electronAPI.exportPdf(`lab-report-${result.patient.patientId}.pdf`);
      setExportMessage(fileResult?.success ? `Saved to ${fileResult.filePath}` : null);
    } finally {
      setExporting(false);
    }
  }

  async function handleSendWhatsApp() {
    setWhatsAppWorking(true);
    try {
      // First export PDF so the user has the file ready to attach
      if (window.electronAPI?.exportPdf) {
        await window.electronAPI.exportPdf(`lab-report-${result.patient.patientId}.pdf`);
      }
      const url = whatsAppLabReportUrl(result.patient.phone);
      await openWhatsApp(url);
      setShowWhatsAppTooltip(true);
    } finally {
      setWhatsAppWorking(false);
    }
  }

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>;
  if (!result) return null;

  const referringDoctor = result.labInvoice?.admission?.doctor?.name || null;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 print:hidden max-w-3xl mx-auto">
        <Link to={`/patients/${result.patient.id}`} className="text-sm text-blue-950 hover:underline">
          ← Back to Patient Profile
        </Link>
        <div className="flex items-center gap-2 relative">
          {exportMessage && <span className="text-xs text-slate-500">{exportMessage}</span>}

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exporting}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Download PDF"}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={whatsAppWorking}
              className="bg-emerald-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {whatsAppWorking ? "Opening..." : "Send via WhatsApp"}
            </button>
            {showWhatsAppTooltip && (
              <WhatsAppTooltip onClose={() => setShowWhatsAppTooltip(false)} />
            )}
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="bg-blue-950 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-900"
          >
            Print
          </button>
        </div>
      </div>

      <LabReportPrintLayout
        patient={result.patient}
        referringDoctor={referringDoctor}
        date={result.createdAt}
        results={result.results}
        technicianName={result.technician?.name}
      />
    </div>
  );
}
