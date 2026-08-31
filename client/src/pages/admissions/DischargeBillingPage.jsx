import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DischargeBillPrintLayout from "./DischargeBillPrintLayout";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function DischargeBillingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  const isAdmin = user.role === "ADMIN";

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [dischargeDate, setDischargeDate] = useState(todayString());
  const [daysAdmitted, setDaysAdmitted] = useState(1);
  const [doctorFee, setDoctorFee] = useState(0);

  const [allProcedures, setAllProcedures] = useState([]);
  const [procedureSearch, setProcedureSearch] = useState("");
  const [procedureDropdownOpen, setProcedureDropdownOpen] = useState(false);
  const blurTimeout = useRef(null);
  const [procedureRows, setProcedureRows] = useState([]);
  const [customRows, setCustomRows] = useState([]);

  const [allNursingCharges, setAllNursingCharges] = useState([]);
  const [nursingChargeSearch, setNursingChargeSearch] = useState("");
  const [nursingChargeDropdownOpen, setNursingChargeDropdownOpen] = useState(false);
  const nursingBlurTimeout = useRef(null);
  const [nursingChargeRows, setNursingChargeRows] = useState([]);

  const [includedLabIds, setIncludedLabIds] = useState(new Set());
  const [includedPharmacyIds, setIncludedPharmacyIds] = useState(new Set());
  const [showPaidLab, setShowPaidLab] = useState(false);
  const [showPaidPharmacy, setShowPaidPharmacy] = useState(false);
  const [overridePaidLabIds, setOverridePaidLabIds] = useState(new Set());
  const [overridePaidPharmacyIds, setOverridePaidPharmacyIds] = useState(new Set());

  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      authFetch(`/admissions/${id}/discharge-summary`).then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || "Failed to load")));
        return res.json();
      }),
      authFetch("/procedures?active=true").then((res) => res.json()),
      authFetch("/nursing-charges?active=true").then((res) => res.json()),
    ])
      .then(([summaryData, procedures, nursingCharges]) => {
        setSummary(summaryData);
        setDaysAdmitted(summaryData.daysAdmitted);
        setDoctorFee(summaryData.admission.doctor.consultationFee);
        setIncludedLabIds(new Set(summaryData.labInvoices.filter((i) => i.status !== "PAID").map((i) => i.id)));
        setIncludedPharmacyIds(
          new Set(summaryData.pharmacyInvoices.filter((i) => i.status !== "PAID").map((i) => i.id))
        );
        setAllProcedures(procedures);
        setAllNursingCharges(nursingCharges);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleDischargeDateChange(value) {
    setDischargeDate(value);
    if (summary) {
      const admDate = new Date(summary.admission.admissionDate);
      const discDate = new Date(value);
      const days = Math.max(1, Math.ceil((discDate - admDate) / (1000 * 60 * 60 * 24)));
      setDaysAdmitted(days);
    }
  }

  function handleProcedureFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setProcedureDropdownOpen(true);
  }
  function handleProcedureBlur() {
    blurTimeout.current = setTimeout(() => setProcedureDropdownOpen(false), 150);
  }

  function addProcedure(proc) {
    setProcedureRows((prev) => [
      ...prev,
      { procedureId: proc.id, name: proc.name, quantity: 1, unitPrice: proc.defaultPrice, subtotal: proc.defaultPrice },
    ]);
    setProcedureSearch("");
    setProcedureDropdownOpen(false);
  }

  function updateProcedureRow(index, patch) {
    setProcedureRows((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...patch };
      merged.subtotal = Number(merged.quantity || 0) * Number(merged.unitPrice || 0);
      next[index] = merged;
      return next;
    });
  }

  function removeProcedureRow(index) {
    setProcedureRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addCustomCharge() {
    setCustomRows((prev) => [...prev, { description: "", amount: 0 }]);
  }
  function updateCustomRow(index, patch) {
    setCustomRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }
  function removeCustomRow(index) {
    setCustomRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleNursingChargeFocus() {
    if (nursingBlurTimeout.current) clearTimeout(nursingBlurTimeout.current);
    setNursingChargeDropdownOpen(true);
  }
  function handleNursingChargeBlur() {
    nursingBlurTimeout.current = setTimeout(() => setNursingChargeDropdownOpen(false), 150);
  }

  function addNursingCharge(charge) {
    const quantity = charge.type === "DAILY" ? Number(daysAdmitted || 1) : 1;
    setNursingChargeRows((prev) => [
      ...prev,
      {
        nursingChargeId: charge.id,
        name: charge.name,
        type: charge.type,
        quantity,
        unitPrice: charge.defaultPrice,
        subtotal: quantity * charge.defaultPrice,
      },
    ]);
    setNursingChargeSearch("");
    setNursingChargeDropdownOpen(false);
  }

  function addCustomNursingCharge() {
    setNursingChargeRows((prev) => [
      ...prev,
      { nursingChargeId: null, name: "", type: "CUSTOM", quantity: 1, unitPrice: 0, subtotal: 0 },
    ]);
  }

  function updateNursingChargeRow(index, patch) {
    setNursingChargeRows((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...patch };
      merged.subtotal = Number(merged.quantity || 0) * Number(merged.unitPrice || 0);
      next[index] = merged;
      return next;
    });
  }

  function removeNursingChargeRow(index) {
    setNursingChargeRows((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleLabInvoice(invId) {
    setIncludedLabIds((prev) => {
      const next = new Set(prev);
      if (next.has(invId)) next.delete(invId);
      else next.add(invId);
      return next;
    });
  }
  function togglePharmacyInvoice(invId) {
    setIncludedPharmacyIds((prev) => {
      const next = new Set(prev);
      if (next.has(invId)) next.delete(invId);
      else next.add(invId);
      return next;
    });
  }

  function toggleOverridePaidLab(invId) {
    setOverridePaidLabIds((prev) => {
      const next = new Set(prev);
      if (next.has(invId)) {
        next.delete(invId);
        setIncludedLabIds((ids) => {
          const n = new Set(ids);
          n.delete(invId);
          return n;
        });
      } else {
        next.add(invId);
        setIncludedLabIds((ids) => new Set(ids).add(invId));
      }
      return next;
    });
  }
  function toggleOverridePaidPharmacy(invId) {
    setOverridePaidPharmacyIds((prev) => {
      const next = new Set(prev);
      if (next.has(invId)) {
        next.delete(invId);
        setIncludedPharmacyIds((ids) => {
          const n = new Set(ids);
          n.delete(invId);
          return n;
        });
      } else {
        next.add(invId);
        setIncludedPharmacyIds((ids) => new Set(ids).add(invId));
      }
      return next;
    });
  }

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (loadError) return <div className="p-8 text-red-600 text-sm">{loadError}</div>;
  if (!summary) return null;

  const { admission, roomDailyRate, labInvoices, pharmacyInvoices } = summary;
  const { patient } = admission;

  const filteredProcedures = allProcedures.filter((p) =>
    p.name.toLowerCase().includes(procedureSearch.trim().toLowerCase())
  );
  const filteredNursingCharges = allNursingCharges.filter((c) =>
    c.name.toLowerCase().includes(nursingChargeSearch.trim().toLowerCase())
  );

  const unpaidLabInvoices = labInvoices.filter((i) => i.status !== "PAID");
  const paidLabInvoices = labInvoices.filter((i) => i.status === "PAID");
  const unpaidPharmacyInvoices = pharmacyInvoices.filter((i) => i.status !== "PAID");
  const paidPharmacyInvoices = pharmacyInvoices.filter((i) => i.status === "PAID");

  const showLabToggle = isAdmin || paidLabInvoices.length > 0;
  const showPharmacyToggle = isAdmin || paidPharmacyInvoices.length > 0;

  const roomCharges = Number(daysAdmitted || 0) * roomDailyRate;
  const procedureChargesTotal = procedureRows.reduce((sum, p) => sum + Number(p.subtotal || 0), 0);
  const nursingChargesTotal = nursingChargeRows.reduce((sum, n) => sum + Number(n.subtotal || 0), 0);
  const customChargesTotal = customRows.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const includedLabInvoices = labInvoices.filter((i) => includedLabIds.has(i.id));
  const includedPharmacyInvoices = pharmacyInvoices.filter((i) => includedPharmacyIds.has(i.id));
  const labCharges = includedLabInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const pharmacyCharges = includedPharmacyInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const grandTotal =
    roomCharges +
    Number(doctorFee || 0) +
    procedureChargesTotal +
    nursingChargesTotal +
    customChargesTotal +
    labCharges +
    pharmacyCharges;

  async function handleFinalize() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch(`/admissions/${id}/discharge`, {
        method: "POST",
        body: JSON.stringify({
          dischargeDate,
          daysAdmitted: Number(daysAdmitted),
          roomCharges,
          doctorFee: Number(doctorFee),
          procedureCharges: procedureRows,
          nursingCharges: nursingChargeRows,
          customCharges: customRows.filter((c) => c.description.trim()),
          includedLabInvoiceIds: Array.from(includedLabIds),
          includedPharmacyInvoiceIds: Array.from(includedPharmacyIds),
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to finalize discharge");
      navigate(`/admissions/${id}/discharge-record`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8">
      <div className="print:hidden">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Discharge &amp; Billing</h1>
        </header>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 mb-4 max-w-3xl">
            {error}
          </p>
        )}

        <section className="bg-white rounded-lg shadow p-4 mb-6 max-w-3xl">
          <div className="grid grid-cols-6 gap-y-1 text-sm">
            <p className="text-slate-500">Patient</p>
            <p className="text-slate-800 font-medium col-span-5">
              {patient.name} ({patient.patientId})
            </p>
            <p className="text-slate-500">Room / Bed</p>
            <p className="text-slate-800 font-medium col-span-5">
              {admission.room ? `${admission.room.roomNumber} (${admission.room.type})` : "—"}
              {admission.bed ? ` — ${admission.bed.bedNumber}` : ""}
            </p>
            <p className="text-slate-500">Doctor</p>
            <p className="text-slate-800 font-medium col-span-5">{admission.doctor.name}</p>
            <p className="text-slate-500">Admitted On</p>
            <p className="text-slate-800 font-medium col-span-5">
              {new Date(admission.admissionDate).toLocaleString()}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">1. Room Charges</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Admission Date</label>
              <input
                disabled
                value={new Date(admission.admissionDate).toLocaleDateString()}
                className="w-full border border-slate-200 bg-slate-50 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Discharge Date</label>
              <input
                type="date"
                value={dischargeDate}
                onChange={(e) => handleDischargeDateChange(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Days Admitted</label>
              <input
                type="number"
                min="1"
                value={daysAdmitted}
                onChange={(e) => setDaysAdmitted(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Room Type / Rate per Day (PKR)
              </label>
              <input
                disabled
                value={admission.room ? `${admission.room.type} — ${roomDailyRate}` : "No room assigned"}
                className="w-full border border-slate-200 bg-slate-50 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-right text-sm font-semibold text-blue-950 mt-3">
            Room Charges Subtotal: PKR {roomCharges}
          </p>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">2. Doctor Fee</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Doctor</label>
              <input
                disabled
                value={admission.doctor.name}
                className="w-full border border-slate-200 bg-slate-50 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fee (PKR)</label>
              <input
                type="number"
                min="0"
                value={doctorFee}
                onChange={(e) => setDoctorFee(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">3. Nursing Charges</h2>
          <div className="relative mb-3">
            <input
              placeholder="Search nursing charges..."
              value={nursingChargeSearch}
              onChange={(e) => setNursingChargeSearch(e.target.value)}
              onFocus={handleNursingChargeFocus}
              onBlur={handleNursingChargeBlur}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
            {nursingChargeDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded shadow-lg max-h-56 overflow-y-auto">
                {filteredNursingCharges.length === 0 ? (
                  <p className="text-slate-400 text-xs px-3 py-2">No nursing charges match.</p>
                ) : (
                  filteredNursingCharges.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => addNursingCharge(c)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-sm flex justify-between"
                    >
                      <span>
                        {c.name} <span className="text-[10px] text-slate-400">[{c.type}]</span>
                      </span>
                      <span className="text-slate-400">PKR {c.defaultPrice}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {nursingChargeRows.length > 0 && (
            <table className="w-full text-sm mb-3">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1.5 font-medium">Charge</th>
                  <th className="py-1.5 font-medium">Qty</th>
                  <th className="py-1.5 font-medium">Unit Price</th>
                  <th className="py-1.5 font-medium">Subtotal</th>
                  <th className="py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {nursingChargeRows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-800">
                      {row.type === "CUSTOM" ? (
                        <input
                          placeholder="Description"
                          value={row.name}
                          onChange={(e) => updateNursingChargeRow(i, { name: e.target.value })}
                          className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <>
                          {row.name} <span className="text-[10px] text-slate-400">[{row.type}]</span>
                        </>
                      )}
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => updateNursingChargeRow(i, { quantity: e.target.value })}
                        className="w-16 border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min="0"
                        value={row.unitPrice}
                        onChange={(e) => updateNursingChargeRow(i, { unitPrice: e.target.value })}
                        className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 text-slate-800">{row.subtotal}</td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => removeNursingChargeRow(i)}
                        className="text-red-600 hover:text-red-800 font-bold px-2"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <button
            type="button"
            onClick={addCustomNursingCharge}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-1.5 text-sm font-medium"
          >
            + Add Custom Nursing Charge
          </button>

          <p className="text-right text-sm font-semibold text-blue-950 mt-3">
            Nursing Charges Subtotal: PKR {nursingChargesTotal}
          </p>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">4. Procedures</h2>
          <div className="relative mb-3">
            <input
              placeholder="Search procedures..."
              value={procedureSearch}
              onChange={(e) => setProcedureSearch(e.target.value)}
              onFocus={handleProcedureFocus}
              onBlur={handleProcedureBlur}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
            {procedureDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded shadow-lg max-h-56 overflow-y-auto">
                {filteredProcedures.length === 0 ? (
                  <p className="text-slate-400 text-xs px-3 py-2">No procedures match.</p>
                ) : (
                  filteredProcedures.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => addProcedure(p)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-sm flex justify-between"
                    >
                      <span>{p.name}</span>
                      <span className="text-slate-400">PKR {p.defaultPrice}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {procedureRows.length > 0 && (
            <table className="w-full text-sm mb-3">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1.5 font-medium">Procedure</th>
                  <th className="py-1.5 font-medium">Qty</th>
                  <th className="py-1.5 font-medium">Unit Price</th>
                  <th className="py-1.5 font-medium">Subtotal</th>
                  <th className="py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {procedureRows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 text-slate-800">{row.name}</td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => updateProcedureRow(i, { quantity: e.target.value })}
                        className="w-16 border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min="0"
                        value={row.unitPrice}
                        onChange={(e) => updateProcedureRow(i, { unitPrice: e.target.value })}
                        className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 text-slate-800">{row.subtotal}</td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => removeProcedureRow(i)}
                        className="text-red-600 hover:text-red-800 font-bold px-2"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {customRows.length > 0 && (
            <table className="w-full text-sm mb-3">
              <tbody>
                {customRows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5">
                      <input
                        placeholder="Description"
                        value={row.description}
                        onChange={(e) => updateCustomRow(i, { description: e.target.value })}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={row.amount}
                        onChange={(e) => updateCustomRow(i, { amount: e.target.value })}
                        className="w-24 border border-slate-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => removeCustomRow(i)}
                        className="text-red-600 hover:text-red-800 font-bold px-2"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <button
            type="button"
            onClick={addCustomCharge}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-1.5 text-sm font-medium"
          >
            + Add Custom Charge
          </button>

          <p className="text-right text-sm font-semibold text-blue-950 mt-3">
            Procedures Subtotal: PKR {procedureChargesTotal + customChargesTotal}
          </p>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">5. Lab Tests (during admission)</h2>
          {unpaidLabInvoices.length === 0 && paidLabInvoices.length === 0 ? (
            <p className="text-slate-500 text-sm">No lab invoices during this admission.</p>
          ) : (
            <>
              {unpaidLabInvoices.length === 0 ? (
                <p className="text-slate-500 text-sm">No unpaid lab invoices during this admission.</p>
              ) : (
                <div className="grid gap-1">
                  {unpaidLabInvoices.map((inv) => (
                    <label
                      key={inv.id}
                      className="flex items-center justify-between px-3 py-2 rounded border border-slate-100 hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={includedLabIds.has(inv.id)}
                          onChange={() => toggleLabInvoice(inv.id)}
                        />
                        <span className="text-sm text-slate-800">
                          {new Date(inv.createdAt).toLocaleDateString()} —{" "}
                          {inv.tests.map((t) => t.testName).join(", ")}
                        </span>
                      </span>
                      <span className="text-sm text-slate-500">PKR {inv.totalAmount}</span>
                    </label>
                  ))}
                </div>
              )}

              {showLabToggle && (
                <button
                  type="button"
                  onClick={() => setShowPaidLab((v) => !v)}
                  className="text-xs text-blue-950 hover:underline mt-2"
                >
                  {showPaidLab ? "Hide paid invoices" : `Show paid invoices (${paidLabInvoices.length} paid)`}
                </button>
              )}

              {showPaidLab && paidLabInvoices.length > 0 && (
                <div className="grid gap-1 mt-2">
                  {paidLabInvoices.map((inv) => {
                    const overridden = overridePaidLabIds.has(inv.id);
                    return (
                      <div
                        key={inv.id}
                        className={`flex items-center justify-between px-3 py-2 rounded border ${
                          overridden ? "border-slate-100" : "border-slate-100 bg-slate-50 opacity-60"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={includedLabIds.has(inv.id)}
                            disabled={!overridden}
                            onChange={() => toggleLabInvoice(inv.id)}
                          />
                          <span className="text-sm text-slate-800">
                            {new Date(inv.createdAt).toLocaleDateString()} —{" "}
                            {inv.tests.map((t) => t.testName).join(", ")}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            PAID
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-sm text-slate-500">PKR {inv.totalAmount}</span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => toggleOverridePaidLab(inv.id)}
                              className="text-xs text-blue-950 hover:underline"
                            >
                              {overridden ? "Exclude" : "Include anyway"}
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <p className="text-right text-sm font-semibold text-blue-950 mt-3">Lab Charges Subtotal: PKR {labCharges}</p>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">6. Pharmacy (during admission)</h2>
          {unpaidPharmacyInvoices.length === 0 && paidPharmacyInvoices.length === 0 ? (
            <p className="text-slate-500 text-sm">No pharmacy invoices during this admission.</p>
          ) : (
            <>
              {unpaidPharmacyInvoices.length === 0 ? (
                <p className="text-slate-500 text-sm">No unpaid pharmacy invoices during this admission.</p>
              ) : (
                <div className="grid gap-1">
                  {unpaidPharmacyInvoices.map((inv) => (
                    <label
                      key={inv.id}
                      className="flex items-center justify-between px-3 py-2 rounded border border-slate-100 hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={includedPharmacyIds.has(inv.id)}
                          onChange={() => togglePharmacyInvoice(inv.id)}
                        />
                        <span className="text-sm text-slate-800">
                          {new Date(inv.createdAt).toLocaleDateString()} —{" "}
                          {inv.items.map((it) => `${it.itemName} x${it.quantity}`).join(", ")}
                        </span>
                      </span>
                      <span className="text-sm text-slate-500">PKR {inv.totalAmount}</span>
                    </label>
                  ))}
                </div>
              )}

              {showPharmacyToggle && (
                <button
                  type="button"
                  onClick={() => setShowPaidPharmacy((v) => !v)}
                  className="text-xs text-blue-950 hover:underline mt-2"
                >
                  {showPaidPharmacy
                    ? "Hide paid invoices"
                    : `Show paid invoices (${paidPharmacyInvoices.length} paid)`}
                </button>
              )}

              {showPaidPharmacy && paidPharmacyInvoices.length > 0 && (
                <div className="grid gap-1 mt-2">
                  {paidPharmacyInvoices.map((inv) => {
                    const overridden = overridePaidPharmacyIds.has(inv.id);
                    return (
                      <div
                        key={inv.id}
                        className={`flex items-center justify-between px-3 py-2 rounded border ${
                          overridden ? "border-slate-100" : "border-slate-100 bg-slate-50 opacity-60"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={includedPharmacyIds.has(inv.id)}
                            disabled={!overridden}
                            onChange={() => togglePharmacyInvoice(inv.id)}
                          />
                          <span className="text-sm text-slate-800">
                            {new Date(inv.createdAt).toLocaleDateString()} —{" "}
                            {inv.items.map((it) => `${it.itemName} x${it.quantity}`).join(", ")}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            PAID
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-sm text-slate-500">PKR {inv.totalAmount}</span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => toggleOverridePaidPharmacy(inv.id)}
                              className="text-xs text-blue-950 hover:underline"
                            >
                              {overridden ? "Exclude" : "Include anyway"}
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <p className="text-right text-sm font-semibold text-blue-950 mt-3">
            Pharmacy Charges Subtotal: PKR {pharmacyCharges}
          </p>
        </section>

        <section className="bg-white rounded-lg shadow p-6 mb-6 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">7. Grand Total</h2>
          <dl className="grid grid-cols-2 gap-y-1 text-sm mb-4">
            <dt className="text-slate-500">Room Charges ({daysAdmitted} days × {roomDailyRate})</dt>
            <dd className="text-right text-slate-800">PKR {roomCharges}</dd>
            <dt className="text-slate-500">Doctor Fee</dt>
            <dd className="text-right text-slate-800">PKR {Number(doctorFee || 0)}</dd>
            <dt className="text-slate-500">Nursing Charges</dt>
            <dd className="text-right text-slate-800">PKR {nursingChargesTotal}</dd>
            <dt className="text-slate-500">Procedures &amp; Services</dt>
            <dd className="text-right text-slate-800">PKR {procedureChargesTotal + customChargesTotal}</dd>
            <dt className="text-slate-500">Lab Charges</dt>
            <dd className="text-right text-slate-800">PKR {labCharges}</dd>
            <dt className="text-slate-500">Pharmacy Charges</dt>
            <dd className="text-right text-slate-800">PKR {pharmacyCharges}</dd>
          </dl>
          <p className="text-right text-2xl font-bold text-blue-950 border-t border-slate-200 pt-3 mb-4">
            Grand Total: PKR {grandTotal}
          </p>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Remarks</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </section>

        <div className="flex gap-3 max-w-3xl">
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-4 py-2 font-medium"
          >
            Print Bill
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={submitting}
            className="bg-emerald-600 text-white rounded px-4 py-2 font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Finalizing..." : "Finalize Discharge"}
          </button>
        </div>
      </div>

      <div className="hidden print:block">
        <DischargeBillPrintLayout
          patient={patient}
          admission={admission}
          dischargeDate={dischargeDate}
          daysAdmitted={daysAdmitted}
          roomDailyRate={roomDailyRate}
          roomCharges={roomCharges}
          doctorFee={Number(doctorFee || 0)}
          procedureRows={procedureRows}
          nursingChargeRows={nursingChargeRows}
          customRows={customRows.filter((c) => c.description.trim())}
          labInvoices={includedLabInvoices}
          pharmacyInvoices={includedPharmacyInvoices}
          grandTotal={grandTotal}
          notes={notes}
          isPaid={false}
        />
      </div>
    </div>
  );
}
