import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { calculateAge } from "../../utils/age";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function PatientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    authFetch(`/patients/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load patient");
        return res.json();
      })
      .then(setPatient)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    authFetch(`/prescription/patient/${id}`)
      .then((res) => res.json())
      .then(setPrescriptions)
      .catch(() => setPrescriptions([]));

    authFetch(`/lab/results/patient/${id}`)
      .then((res) => res.json())
      .then(setLabResults)
      .catch(() => setLabResults([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>;
  if (!patient) return null;

  return (
    <div className="p-8">
      <Link to="/patients/all" className="text-sm text-blue-950 hover:underline">
        ← Back to All Patients
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          {patient.name} <span className="text-base text-slate-400 font-normal">({patient.patientId})</span>
        </h1>
        <p className="text-slate-500 text-sm">
          {calculateAge(patient.dateOfBirth)} yrs · {patient.gender}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Personal Details</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Phone</dt>
            <dd className="text-slate-800">{patient.phone}</dd>
            <dt className="text-slate-500">Date of Birth</dt>
            <dd className="text-slate-800">{formatDate(patient.dateOfBirth)}</dd>
            <dt className="text-slate-500">Blood Group</dt>
            <dd className="text-slate-800">{patient.bloodGroup || "—"}</dd>
            <dt className="text-slate-500">Address</dt>
            <dd className="text-slate-800">{patient.address || "—"}</dd>
            <dt className="text-slate-500">Registered</dt>
            <dd className="text-slate-800">{formatDate(patient.createdAt)}</dd>
          </dl>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Admission History</h2>
          {patient.admissions.length === 0 ? (
            <p className="text-slate-500 text-sm">No admissions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {patient.admissions.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <p className="font-medium text-slate-800">
                    {a.tokenLabel || `T-${String(a.tokenNumber).padStart(3, "0")}`} · Dr. {a.doctor.name}
                    <span
                      className={`ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        a.status === "ADMITTED" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {a.status}
                    </span>
                  </p>
                  <p className="text-slate-500">
                    {formatDateTime(a.admissionDate)}
                    {a.room ? ` · Room ${a.room.roomNumber}${a.bed ? ` (${a.bed.bedNumber})` : ""}` : ""}
                  </p>
                  {a.status === "DISCHARGED" && (
                    <p className="text-slate-500">
                      Discharged {formatDateTime(a.dischargeDate)} · Bill: {a.totalBill}{" "}
                      <button
                        type="button"
                        onClick={() => navigate(`/admissions/${a.id}/discharge-record`)}
                        className="text-blue-950 hover:underline font-medium"
                      >
                        View Discharge Bill
                      </button>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">OPD Visits</h2>
          {patient.opdVisits.length === 0 ? (
            <p className="text-slate-500 text-sm">No OPD visits yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {patient.opdVisits.map((v) => (
                <li key={v.id} className="py-2 text-sm">
                  <p className="font-medium text-slate-800">
                    {v.tokenLabel || `OPD-${String(v.tokenNumber).padStart(3, "0")}`} · Dr. {v.doctor.name}
                    <span
                      className={`ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        v.status === "COMPLETE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {v.status.replace("_", " ")}
                    </span>
                  </p>
                  <p className="text-slate-500">
                    {formatDateTime(v.visitDate)} · Fee: {v.doctorFee}
                  </p>
                  {v.chiefComplaint && <p className="text-slate-500">Complaint: {v.chiefComplaint}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Prescriptions</h2>
          {prescriptions.length === 0 ? (
            <p className="text-slate-500 text-sm">No prescriptions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {prescriptions.map((p) => (
                <li
                  key={p.id}
                  onClick={() => navigate(`/prescriptions/${p.id}`)}
                  className="py-2 text-sm cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded"
                >
                  <p className="font-medium text-slate-800">
                    {formatDate(p.createdAt)} · Dr. {p.doctorName}
                  </p>
                  <p className="text-slate-500">{p.medicineNames.join(", ") || "No medicines listed"}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Lab Test History</h2>
          {patient.labInvoices.length === 0 ? (
            <p className="text-slate-500 text-sm">No lab invoices yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {patient.labInvoices.map((inv) => (
                <li key={inv.id} className="py-2 text-sm">
                  <p className="font-medium text-slate-800">
                    {formatDate(inv.createdAt)} · {inv.totalAmount}
                  </p>
                  <p className="text-slate-500">{inv.status}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Lab Results</h2>
          {labResults.length === 0 ? (
            <p className="text-slate-500 text-sm">No lab results yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {labResults.map((r) => {
                const testNames = [...new Set(r.results.map((p) => p.testName))].join(", ");
                return (
                  <li key={r.id} className="py-2 text-sm flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">
                        {formatDate(r.createdAt)} · {testNames}
                        <span
                          className={`ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            r.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/lab/results/${r.labInvoiceId}`)}
                      className="text-blue-950 hover:underline text-xs font-medium"
                    >
                      View
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Pharmacy Purchase History</h2>
          {patient.pharmacyInvoices.length === 0 ? (
            <p className="text-slate-500 text-sm">No pharmacy invoices yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {patient.pharmacyInvoices.map((inv) => (
                <li key={inv.id} className="py-2 text-sm">
                  <p className="font-medium text-slate-800">
                    {formatDate(inv.createdAt)} · {inv.totalAmount}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
