import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { calculateAge } from "../../utils/age";
import { serializeComments, parseComments } from "../../utils/prescriptionComments";
import MedicineCombobox from "./MedicineCombobox";
import DiagnosisCombobox from "./DiagnosisCombobox";
import PrescriptionPrintLayout from "./PrescriptionPrintLayout";
import { DOSE_OPTIONS as DOSE_OPTIONS_BILINGUAL, FREQUENCY_OPTIONS as FREQUENCY_OPTIONS_BILINGUAL, INSTRUCTIONS_OPTIONS as INSTRUCTIONS_OPTIONS_BILINGUAL, normalizeFrequency } from "./bilingualOptions";

const DURATION_UNITS = ["Days", "Weeks", "Months"];
const DOSE_MULTIPLIERS = { "1 Tablet": 1, "2 Tablets": 2, "Half Tablet": 0.5, "1 Teaspoon": 1, "2 Teaspoons": 2, "1 Injection": 1 };
const FREQUENCY_MULTIPLIERS = { "Morning once": 1, "Evening once": 1, "Twice a day": 2, "Thrice a day": 3, "Four times a day": 4, "Every 8 hours": 3, "Every 12 hours": 2, "As needed": 1 };
const DURATION_DAY_MULTIPLIERS = { Days: 1, Weeks: 7, Months: 30 };

function calcTotalQuantity(dose, frequency, duration, durationUnit) {
  const doseM = DOSE_MULTIPLIERS[dose];
  const freqM = FREQUENCY_MULTIPLIERS[frequency];
  const days = Number(duration) * (DURATION_DAY_MULTIPLIERS[durationUnit] || 1);
  if (!doseM || !freqM || !days) return "";
  return Math.ceil(doseM * freqM * days);
}

function arrowFor(param) {
  if (param.inputType !== "numeric") return "⚠";
  if (param.normalRangeMax != null && Number(param.value) > param.normalRangeMax) return "↑";
  if (param.normalRangeMin != null && Number(param.value) < param.normalRangeMin) return "↓";
  return "⚠";
}

function formatFinding(param) {
  const range =
    param.normalRangeText ||
    (param.normalRangeMin != null && param.normalRangeMax != null
      ? `${param.normalRangeMin}–${param.normalRangeMax}`
      : null);
  const unitPart = param.unit ? ` ${param.unit}` : "";
  const rangePart = range ? ` (Normal: ${range})` : "";
  return `${param.testName} — ${param.parameterName}: ${param.value}${unitPart}${rangePart}`;
}

export default function ReviewPrescriptionPage() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [prescription, setPrescription] = useState(null);
  const [medicineList, setMedicineList] = useState([]);
  const [labResults, setLabResults] = useState(null); // null = not loaded, [] = empty
  const [loadingResults, setLoadingResults] = useState(false);

  const [rows, setRows] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [advice, setAdvice] = useState("");
  const [diagnoses, setDiagnoses] = useState([]);
  const [selectedFindings, setSelectedFindings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [printData, setPrintData] = useState(null); // set when we want to print

  const loadLabResults = useCallback(
    async (opdVisitId) => {
      setLoadingResults(true);
      try {
        const res = await authFetch(`/lab/results/opd/${opdVisitId}`);
        if (!res.ok) throw new Error();
        setLabResults(await res.json());
      } catch {
        setLabResults([]);
      } finally {
        setLoadingResults(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    Promise.all([
      authFetch(`/prescription/${id}`).then((r) => {
        if (!r.ok) throw new Error("Prescription not found");
        return r.json();
      }),
      authFetch("/prescription/medicines").then((r) => r.json()),
    ])
      .then(([rx, meds]) => {
        setPrescription(rx);
        setMedicineList(meds);
        const { notes, advice: adv } = parseComments(rx.comments);
        setClinicalNotes(notes);
        setAdvice(adv);
        setDiagnoses(Array.isArray(rx.diagnoses) ? rx.diagnoses : []);
        setRows(
          (rx.medicines || []).map((m) => ({
            ...m,
            frequency: normalizeFrequency(m.frequency),
            defaulted: { dose: false, frequency: false, instructions: false, duration: false, durationUnit: false },
          }))
        );
        // pre-load lab results
        loadLabResults(rx.opdVisitId);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateRow(index, patch) {
    setRows((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...patch };
      if ("dose" in patch || "frequency" in patch || "duration" in patch || "durationUnit" in patch) {
        merged.totalQuantity = calcTotalQuantity(merged.dose, merged.frequency, merged.duration, merged.durationUnit);
      }
      next[index] = merged;
      return next;
    });
  }

  function addRow() {
    const dose = DOSE_OPTIONS_BILINGUAL[0].en;
    const frequency = FREQUENCY_OPTIONS_BILINGUAL[0].en;
    const duration = 7;
    const durationUnit = "Days";
    setRows((prev) => [
      ...prev,
      {
        name: "",
        dose,
        frequency,
        duration,
        durationUnit,
        totalQuantity: calcTotalQuantity(dose, frequency, duration, durationUnit),
        instructions: "",
        defaulted: { dose: false, frequency: false, instructions: false, duration: false, durationUnit: false },
      },
    ]);
  }

  function removeRow(index) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function toggleFinding(label) {
    setSelectedFindings((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  }

  // All abnormal parameters from loaded results
  const allAbnormals = [];
  if (labResults) {
    for (const result of labResults) {
      for (const param of result.results || []) {
        if (param.isAbnormal) {
          allAbnormals.push({ key: `${result.id}-${param.parameterName}`, param });
        }
      }
    }
  }

  async function save(markComplete) {
    const validRows = rows.filter((r) => r.name?.trim());
    if (validRows.length === 0) {
      setSaveError("Add at least one medicine.");
      return null;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const endpoint = markComplete ? `/prescription/${id}/complete` : `/prescription/${id}`;
      const res = await authFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify({
          medicines: validRows,
          investigations: selectedFindings,
          diagnoses,
          comments: serializeComments(clinicalNotes, advice),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      return data;
    } catch (err) {
      setSaveError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveOnly() {
    const saved = await save(false);
    if (saved) {
      setPrescription(saved);
      setSaveError(null);
    }
  }

  async function handleCompleteAndPrint() {
    const saved = await save(true);
    if (saved) {
      setPrintData(saved);
      setTimeout(() => window.print(), 50);
    }
  }

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (loadError) return <div className="p-8 text-red-600 text-sm">{loadError}</div>;
  if (!prescription) return null;

  const { patient, doctor } = prescription;
  const validRows = rows.filter((r) => r.name?.trim());
  const printSource = printData || prescription;

  return (
    <div className="p-8">
      <div className="print:hidden">
        <header className="mb-6 flex items-center justify-between max-w-5xl">
          <div>
            <button
              type="button"
              onClick={() => navigate("/prescriptions/pending")}
              className="text-sm text-blue-950 hover:underline mb-1 block"
            >
              ← Back to Pending Prescriptions
            </button>
            <h1 className="text-2xl font-semibold text-slate-800">Review &amp; Complete Prescription</h1>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            PENDING INVESTIGATIONS
          </span>
        </header>

        {saveError && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 mb-4 max-w-3xl">
            {saveError}
          </p>
        )}

        {/* Patient info */}
        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
          <div className="grid grid-cols-5 gap-y-1 text-sm">
            <p className="text-slate-500">Patient</p>
            <p className="text-slate-800 font-medium col-span-4">
              {patient.name} ({patient.patientId})
            </p>
            <p className="text-slate-500">Age / Gender</p>
            <p className="text-slate-800 font-medium col-span-4">
              {calculateAge(patient.dateOfBirth)} yrs / {patient.gender}
            </p>
            <p className="text-slate-500">Doctor</p>
            <p className="text-slate-800 font-medium col-span-4">
              {doctor.name} ({doctor.specialization})
            </p>
            <p className="text-slate-500">OPD Date</p>
            <p className="text-slate-800 font-medium col-span-4">
              {new Date(prescription.opdVisit.visitDate).toLocaleDateString()}
            </p>
          </div>
        </section>

        {/* Clinical notes */}
        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Clinical Notes / Symptoms</h2>
          <textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            rows={3}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </section>

        {/* Diagnosis */}
        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Diagnosis</h2>
          <DiagnosisCombobox selected={diagnoses} onChange={setDiagnoses} />
        </section>

        {/* Medicines */}
        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-5xl overflow-x-auto">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Medicines</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-2 py-1.5 font-medium">Medicine</th>
                <th className="px-2 py-1.5 font-medium">Dose</th>
                <th className="px-2 py-1.5 font-medium">Frequency</th>
                <th className="px-2 py-1.5 font-medium">Duration</th>
                <th className="px-2 py-1.5 font-medium">Total Qty</th>
                <th className="px-2 py-1.5 font-medium">Instructions</th>
                <th className="px-2 py-1.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 w-56">
                    <MedicineCombobox
                      value={row.name}
                      onChange={(name) => updateRow(i, { name })}
                      medicines={medicineList}
                      onAddCustom={async (name) => {
                        const res = await authFetch("/prescription/medicines", {
                          method: "POST",
                          body: JSON.stringify({ name }),
                        });
                        if (res.ok) {
                          const created = await res.json();
                          const withSource = { ...created, source: "custom" };
                          setMedicineList((prev) => [...prev, withSource]);
                          return withSource;
                        }
                        return null;
                      }}
                      onSelectMedicine={() => {}}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.dose}
                      onChange={(e) => updateRow(i, { dose: e.target.value })}
                      className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                      {DOSE_OPTIONS_BILINGUAL.map((d) => (
                        <option key={d.en} value={d.en}>{d.en}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.frequency}
                      onChange={(e) => updateRow(i, { frequency: e.target.value })}
                      className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                      {FREQUENCY_OPTIONS_BILINGUAL.map((f) => (
                        <option key={f.en} value={f.en}>{f.en}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={row.duration}
                        onChange={(e) => updateRow(i, { duration: e.target.value })}
                        className="w-14 border border-slate-300 rounded px-2 py-1.5 text-sm"
                      />
                      <select
                        value={row.durationUnit}
                        onChange={(e) => updateRow(i, { durationUnit: e.target.value })}
                        className="border border-slate-300 rounded px-1 py-1.5 text-sm"
                      >
                        {DURATION_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min="0"
                      value={row.totalQuantity}
                      onChange={(e) => updateRow(i, { totalQuantity: e.target.value })}
                      className="w-16 border border-slate-300 rounded px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.instructions}
                      onChange={(e) => updateRow(i, { instructions: e.target.value })}
                      className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                      <option value="">—</option>
                      {INSTRUCTIONS_OPTIONS_BILINGUAL.map((opt) => (
                        <option key={opt.en} value={opt.en}>{opt.en}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                      className="text-red-600 hover:text-red-800 disabled:opacity-30 font-bold px-2"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={addRow}
            className="mt-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-1.5 text-sm font-medium"
          >
            + Add Medicine
          </button>
        </section>

        {/* Lab Investigation Results */}
        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800">Investigation Results</h2>
            <button
              type="button"
              onClick={() => loadLabResults(prescription.opdVisitId)}
              disabled={loadingResults}
              className="text-xs text-blue-700 hover:underline disabled:opacity-50"
            >
              {loadingResults ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loadingResults ? (
            <p className="text-slate-500 text-sm">Loading results...</p>
          ) : labResults === null || labResults.length === 0 ? (
            <p className="text-slate-500 text-sm">Lab results not yet available.</p>
          ) : allAbnormals.length === 0 ? (
            <p className="text-slate-500 text-sm">All results within normal range.</p>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-slate-500 mb-2">
                Select abnormal findings to include on the printed prescription:
              </p>
              {allAbnormals.map(({ key, param }) => {
                const label = formatFinding(param);
                const arrow = arrowFor(param);
                const checked = selectedFindings.includes(label);
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer ${
                      checked ? "border-red-300 bg-red-50" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleFinding(label)} />
                    <span className="text-sm text-slate-800">
                      {label} <span className="text-red-600 font-bold">{arrow}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        {/* Advice */}
        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Advice &amp; Restrictions</h2>
          <textarea
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            rows={3}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </section>

        <div className="flex gap-3 max-w-3xl">
          <button
            type="button"
            onClick={handleCompleteAndPrint}
            disabled={saving}
            className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Mark as Complete & Print"}
          </button>
          <button
            type="button"
            onClick={handleSaveOnly}
            disabled={saving}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Come Back Later"}
          </button>
        </div>
      </div>

      {/* Print layout */}
      <div className="hidden print:block">
        <PrescriptionPrintLayout
          patient={patient}
          doctor={doctor}
          medicines={validRows}
          investigations={selectedFindings}
          diagnoses={diagnoses}
          comments={serializeComments(clinicalNotes, advice)}
          date={printSource.createdAt}
          status={printSource.status}
        />
      </div>
    </div>
  );
}
