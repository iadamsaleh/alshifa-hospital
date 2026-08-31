import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { calculateAge } from "../../utils/age";
import { serializeComments } from "../../utils/prescriptionComments";
import Modal from "../../components/Modal";
import MedicineCombobox from "./MedicineCombobox";
import AbnormalFindingsPicker from "./AbnormalFindingsPicker";
import InvestigationsAdvisedPicker from "./InvestigationsAdvisedPicker";
import DiagnosisCombobox from "./DiagnosisCombobox";
import PrescriptionPrintLayout from "./PrescriptionPrintLayout";
import { DOSE_OPTIONS as DOSE_OPTIONS_BILINGUAL, FREQUENCY_OPTIONS as FREQUENCY_OPTIONS_BILINGUAL, INSTRUCTIONS_OPTIONS as INSTRUCTIONS_OPTIONS_BILINGUAL, normalizeFrequency } from "./bilingualOptions";
import { whatsAppPrescriptionUrl, openWhatsApp } from "../../utils/whatsapp";

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
      className="absolute bottom-12 left-0 z-30 w-72 bg-white border border-slate-200 rounded-lg shadow-xl p-3 text-sm"
    >
      <p className="font-semibold text-slate-800 mb-1">PDF downloaded</p>
      <p className="text-slate-600 text-xs">
        WhatsApp Web has opened with a pre-filled message. Please attach the downloaded PDF manually in the chat.
      </p>
      <button type="button" onClick={onClose} className="mt-2 text-xs text-blue-700 hover:underline">
        Got it
      </button>
    </div>
  );
}

const DURATION_UNITS = ["Days", "Weeks", "Months"];
const DOSAGE_FIELDS = ["dose", "frequency", "instructions", "duration", "durationUnit"];

const DOSE_MULTIPLIERS = {
  "1 Tablet": 1,
  "2 Tablets": 2,
  "Half Tablet": 0.5,
  "1 Teaspoon": 1,
  "2 Teaspoons": 2,
  "1 Injection": 1,
};
const FREQUENCY_MULTIPLIERS = {
  "Morning once": 1,
  "Evening once": 1,
  "Twice a day": 2,
  "Thrice a day": 3,
  "Four times a day": 4,
  "Every 8 hours": 3,
  "Every 12 hours": 2,
  "As needed": 1,
};
const DURATION_DAY_MULTIPLIERS = { Days: 1, Weeks: 7, Months: 30 };

function calcTotalQuantity(dose, frequency, duration, durationUnit) {
  const doseM = DOSE_MULTIPLIERS[dose];
  const freqM = FREQUENCY_MULTIPLIERS[frequency];
  const days = Number(duration) * (DURATION_DAY_MULTIPLIERS[durationUnit] || 1);
  if (!doseM || !freqM || !days) return "";
  return Math.ceil(doseM * freqM * days);
}

function emptyRow() {
  const dose = DOSE_OPTIONS_BILINGUAL[0].en;
  const frequency = FREQUENCY_OPTIONS_BILINGUAL[0].en;
  const duration = 7;
  const durationUnit = "Days";
  return {
    name: "",
    dose,
    frequency,
    duration,
    durationUnit,
    totalQuantity: calcTotalQuantity(dose, frequency, duration, durationUnit),
    instructions: "",
    defaulted: { dose: false, frequency: false, instructions: false, duration: false, durationUnit: false },
  };
}

function DefaultBadge() {
  return (
    <span className="ml-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">
      default
    </span>
  );
}

export default function PrescriptionPage() {
  const { opdVisitId } = useParams();
  const { authFetch } = useAuth();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [medicineList, setMedicineList] = useState([]);

  const [rows, setRows] = useState([emptyRow()]);
  const [investigations, setInvestigations] = useState([]);
  const [advisedInvestigations, setAdvisedInvestigations] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [advice, setAdvice] = useState("");

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(null);
  const [dosagePromptQueue, setDosagePromptQueue] = useState([]);
  const [whatsAppWorking, setWhatsAppWorking] = useState(false);
  const [showWhatsAppTooltip, setShowWhatsAppTooltip] = useState(false);

  useEffect(() => {
    Promise.all([
      authFetch(`/opd/${opdVisitId}`).then((res) => {
        if (!res.ok) throw new Error("Failed to load OPD visit");
        return res.json();
      }),
      authFetch("/prescription/medicines").then((res) => res.json()),
    ])
      .then(([visitData, medicines]) => {
        setVisit(visitData);
        setMedicineList(medicines);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opdVisitId]);

  function updateRow(index, patch) {
    setRows((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...patch };
      const defaulted = { ...merged.defaulted };
      for (const key of DOSAGE_FIELDS) {
        if (key in patch) defaulted[key] = false;
      }
      merged.defaulted = defaulted;
      if ("dose" in patch || "frequency" in patch || "duration" in patch || "durationUnit" in patch) {
        merged.totalQuantity = calcTotalQuantity(merged.dose, merged.frequency, merged.duration, merged.durationUnit);
      }
      next[index] = merged;
      return next;
    });
  }

  function applyMedicineDefaults(index, medicine) {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      const defaulted = { ...row.defaulted };
      if (medicine.defaultDose) {
        row.dose = medicine.defaultDose;
        defaulted.dose = true;
      }
      if (medicine.defaultFrequency) {
        row.frequency = normalizeFrequency(medicine.defaultFrequency);
        defaulted.frequency = true;
      }
      if (medicine.defaultInstructions) {
        row.instructions = medicine.defaultInstructions;
        defaulted.instructions = true;
      }
      if (medicine.defaultDuration) {
        row.duration = medicine.defaultDuration;
        defaulted.duration = true;
      }
      if (medicine.defaultDurationUnit) {
        row.durationUnit = medicine.defaultDurationUnit;
        defaulted.durationUnit = true;
      }
      row.defaulted = defaulted;
      row.totalQuantity = calcTotalQuantity(row.dose, row.frequency, row.duration, row.durationUnit);
      next[index] = row;
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleAddCustomMedicine(name) {
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
  }

  function handleClear() {
    setRows([emptyRow()]);
    setInvestigations([]);
    setAdvisedInvestigations([]);
    setDiagnoses([]);
    setClinicalNotes("");
    setAdvice("");
    setSaved(null);
    setError(null);
    setDosagePromptQueue([]);
    setShowWhatsAppTooltip(false);
  }

  async function handleSendWhatsApp() {
    if (!saved) return;
    setWhatsAppWorking(true);
    try {
      if (window.electronAPI?.exportPdf) {
        await window.electronAPI.exportPdf(`prescription-${patient.patientId}.pdf`);
      }
      await openWhatsApp(whatsAppPrescriptionUrl(patient.phone));
      setShowWhatsAppTooltip(true);
    } finally {
      setWhatsAppWorking(false);
    }
  }

  function finalizePrint() {
    setTimeout(() => window.print(), 50);
  }

  async function handlePrint() {
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      setError("Add at least one medicine before printing.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch("/prescription", {
        method: "POST",
        body: JSON.stringify({
          patientId: visit.patient.id,
          opdVisitId: visit.id,
          doctorId: visit.doctor.id,
          medicines: validRows,
          investigations,
          advisedInvestigations,
          diagnoses,
          comments: serializeComments(clinicalNotes, advice),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save prescription");
      setSaved(data);

      const queue = [];
      for (const row of validRows) {
        const medicine = medicineList.find((m) => m.name === row.name);
        if (!medicine || !medicine.id) continue; // freshly-added custom medicines without defaults yet have nothing to compare
        const differs =
          (medicine.defaultDose || "") !== (row.dose || "") ||
          (medicine.defaultFrequency || "") !== (row.frequency || "") ||
          (medicine.defaultInstructions || "") !== (row.instructions || "") ||
          (medicine.defaultDuration || "") !== String(row.duration || "") ||
          (medicine.defaultDurationUnit || "") !== (row.durationUnit || "");
        if (differs) queue.push({ medicine, row });
      }

      if (queue.length > 0) {
        setDosagePromptQueue(queue);
      } else {
        finalizePrint();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDosagePromptAnswer(yes) {
    const [current, ...rest] = dosagePromptQueue;
    if (yes) {
      await authFetch(`/prescription/medicines/${current.medicine.id}`, {
        method: "PUT",
        body: JSON.stringify({
          source: current.medicine.source,
          defaultDose: current.row.dose,
          defaultFrequency: current.row.frequency,
          defaultInstructions: current.row.instructions,
          defaultDuration: String(current.row.duration),
          defaultDurationUnit: current.row.durationUnit,
        }),
      });
    }
    setDosagePromptQueue(rest);
    if (rest.length === 0) {
      finalizePrint();
    }
  }

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (loadError) return <div className="p-8 text-red-600 text-sm">{loadError}</div>;
  if (!visit) return null;

  const { patient, doctor } = visit;
  const validRows = rows.filter((r) => r.name.trim());

  return (
    <div className="p-8">
      <div className="print:hidden">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Write Prescription</h1>
          <p className="text-slate-500 text-sm">OPD visit {visit.tokenLabel}</p>
        </header>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 mb-4 max-w-3xl">
            {error}
          </p>
        )}

        {saved && saved.labInvoiceId && (
          <div className="bg-amber-50 border border-amber-300 rounded px-4 py-3 mb-4 max-w-3xl">
            <p className="text-amber-800 text-sm font-medium">
              Prescription saved. Lab invoice automatically created. Patient can proceed to reception for payment.
            </p>
          </div>
        )}

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
            <p className="text-slate-500">Date</p>
            <p className="text-slate-800 font-medium col-span-4">{new Date().toLocaleDateString()}</p>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Clinical Notes / Symptoms</h2>
          <textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            rows={4}
            placeholder="e.g. Patient presents with fever, cough, sore throat for 3 days..."
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </section>

        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Diagnosis</h2>
          <DiagnosisCombobox selected={diagnoses} onChange={setDiagnoses} />
        </section>

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
                      onAddCustom={handleAddCustomMedicine}
                      onSelectMedicine={(medicine) => applyMedicineDefaults(i, medicine)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.dose}
                      onChange={(e) => updateRow(i, { dose: e.target.value })}
                      className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                      {DOSE_OPTIONS_BILINGUAL.map((d) => (
                        <option key={d.en} value={d.en}>
                          {d.en} | {d.ur}
                        </option>
                      ))}
                    </select>
                    {row.defaulted.dose && <DefaultBadge />}
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.frequency}
                      onChange={(e) => updateRow(i, { frequency: e.target.value })}
                      className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                    >
                      {FREQUENCY_OPTIONS_BILINGUAL.map((f) => (
                        <option key={f.en} value={f.en}>
                          {f.en} | {f.ur}
                        </option>
                      ))}
                    </select>
                    {row.defaulted.frequency && <DefaultBadge />}
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
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      {(row.defaulted.duration || row.defaulted.durationUnit) && <DefaultBadge />}
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
                        <option key={opt.en} value={opt.en}>
                          {opt.en} | {opt.ur}
                        </option>
                      ))}
                    </select>
                    {row.defaulted.instructions && <DefaultBadge />}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                      className="text-red-600 hover:text-red-800 disabled:opacity-30 font-bold px-2"
                      title="Remove row"
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

        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Investigation Results</h2>
          <AbnormalFindingsPicker patientId={patient.id} selected={investigations} onChange={setInvestigations} />
        </section>

        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl border-l-4 border-amber-400">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Investigations Advised</h2>
          <p className="text-xs text-slate-500 mb-3">
            Internal workflow only — does not print on prescription. Adding tests here auto-creates a lab invoice.
          </p>
          <InvestigationsAdvisedPicker selected={advisedInvestigations} onChange={setAdvisedInvestigations} />
        </section>

        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Advice &amp; Restrictions</h2>
          <textarea
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            rows={4}
            placeholder="e.g. Avoid spicy food, rest for 3 days, follow up after 1 week..."
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </section>

        <div className="flex gap-3 max-w-3xl items-center flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            disabled={submitting}
            className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Print Prescription"}
          </button>
          {saved && (
            <div className="relative">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={whatsAppWorking}
                className="bg-emerald-600 text-white rounded px-4 py-2 font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {whatsAppWorking ? "Opening..." : "Send via WhatsApp"}
              </button>
              {showWhatsAppTooltip && <WhatsAppTooltip onClose={() => setShowWhatsAppTooltip(false)} />}
            </div>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 font-medium"
          >
            Clear Form
          </button>
        </div>
      </div>

      {dosagePromptQueue.length > 0 && (
        <Modal title="Update default dosage?" onClose={() => handleDosagePromptAnswer(false)}>
          <p className="text-sm text-slate-700 mb-4">
            Update default dosage for <strong>{dosagePromptQueue[0].medicine.name}</strong> to match this
            prescription?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleDosagePromptAnswer(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 font-medium"
            >
              No
            </button>
            <button
              type="button"
              onClick={() => handleDosagePromptAnswer(true)}
              className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900"
            >
              Yes
            </button>
          </div>
        </Modal>
      )}

      <div className="hidden print:block">
        <PrescriptionPrintLayout
          patient={patient}
          doctor={doctor}
          medicines={validRows}
          investigations={investigations}
          diagnoses={diagnoses}
          comments={serializeComments(clinicalNotes, advice)}
          date={saved?.createdAt || new Date().toISOString()}
          status={saved?.status}
        />
      </div>
    </div>
  );
}
