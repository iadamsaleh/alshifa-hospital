export default function TokenSlip({ result, onReset }) {
  const { patient, doctor, admission } = result;
  const admittedAt = new Date(admission.admissionDate);

  return (
    <div className="p-8">
      <div className="max-w-md mx-auto">
        <div className="print-area bg-white rounded-lg shadow p-8 text-center border border-slate-200">
          <h2 className="text-lg font-semibold text-blue-950">Al-Shifa Diagnostic Centre</h2>
          <p className="text-xs text-slate-500 mb-6">Patient Admission Token</p>

          <p className="text-5xl font-bold text-blue-950 mb-6">{admission.tokenLabel}</p>

          <dl className="text-left text-sm grid grid-cols-2 gap-y-2 border-t border-dashed border-slate-300 pt-4">
            <dt className="text-slate-500">Patient Name</dt>
            <dd className="text-slate-800 font-medium text-right">{patient.name}</dd>

            <dt className="text-slate-500">Patient ID</dt>
            <dd className="text-slate-800 font-medium text-right">{patient.patientId}</dd>

            <dt className="text-slate-500">Doctor</dt>
            <dd className="text-slate-800 font-medium text-right">{doctor.name}</dd>

            <dt className="text-slate-500">Date</dt>
            <dd className="text-slate-800 font-medium text-right">{admittedAt.toLocaleDateString()}</dd>

            <dt className="text-slate-500">Time</dt>
            <dd className="text-slate-800 font-medium text-right">{admittedAt.toLocaleTimeString()}</dd>
          </dl>
        </div>

        <div className="flex justify-center gap-3 mt-6 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900"
          >
            Print Token Slip
          </button>
          <button
            type="button"
            onClick={onReset}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 font-medium"
          >
            New Admission
          </button>
        </div>
      </div>
    </div>
  );
}
