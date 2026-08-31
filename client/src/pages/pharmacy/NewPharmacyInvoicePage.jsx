import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PatientSearchForm from "../../components/PatientSearchForm";

const EMPTY_PATIENT = {
  existingPatientId: null,
  patientId: null,
  name: "",
  gender: "Male",
  dateOfBirth: "",
  phone: "",
  address: "",
  bloodGroup: "",
};

function groupByCategory(items) {
  const groups = {};
  for (const item of items) {
    const key = item.category || "Uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function NewPharmacyInvoicePage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [patientData, setPatientData] = useState(EMPTY_PATIENT);
  const [activeAdmission, setActiveAdmission] = useState(null);

  const [allItems, setAllItems] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [selected, setSelected] = useState({}); // { [itemId]: { price, quantity } }

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authFetch("/pharmacy/items")
      .then((res) => res.json())
      .then(setAllItems)
      .catch(() => setAllItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!patientData.existingPatientId) {
      setActiveAdmission(null);
      return;
    }
    authFetch("/admissions/active")
      .then((res) => res.json())
      .then((admissions) => {
        const match = admissions.find((a) => a.patientId === patientData.existingPatientId);
        setActiveAdmission(match || null);
      })
      .catch(() => setActiveAdmission(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientData.existingPatientId]);

  function toggleItem(item) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.id] !== undefined) {
        delete next[item.id];
      } else {
        next[item.id] = { price: item.pricePerUnit, quantity: 1 };
      }
      return next;
    });
  }

  function updateSelection(itemId, patch) {
    setSelected((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  }

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q)
    );
  }, [allItems, itemSearch]);

  const grouped = groupByCategory(filteredItems);
  const total = Object.values(selected).reduce((sum, s) => sum + Number(s.price || 0) * Number(s.quantity || 0), 0);
  const selectedCount = Object.keys(selected).length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (selectedCount === 0) {
      setError("Select at least one item.");
      return;
    }

    const hasPatientInfo = patientData.existingPatientId || (patientData.name.trim() && patientData.phone.trim());
    if (!hasPatientInfo && (patientData.name.trim() || patientData.phone.trim())) {
      setError("Patient name and phone are both required to attach a patient — or leave both blank for a walk-in sale.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let patientId;
      if (patientData.existingPatientId) {
        patientId = patientData.existingPatientId;
      } else if (hasPatientInfo) {
        const res = await authFetch("/patients", {
          method: "POST",
          body: JSON.stringify({
            name: patientData.name,
            gender: patientData.gender,
            dateOfBirth: patientData.dateOfBirth,
            phone: patientData.phone,
            address: patientData.address,
            bloodGroup: patientData.bloodGroup,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to register patient");
        patientId = data.id;
      }

      const res = await authFetch("/pharmacy/invoices", {
        method: "POST",
        body: JSON.stringify({
          patientId: patientId || undefined,
          admissionId: activeAdmission?.id || undefined,
          items: Object.entries(selected).map(([itemId, s]) => ({
            itemId: Number(itemId),
            price: Number(s.price),
            quantity: Number(s.quantity),
          })),
        }),
      });
      const invoice = await res.json();
      if (!res.ok) throw new Error(invoice.error || "Failed to create pharmacy invoice");

      navigate(`/pharmacy/invoices/${invoice.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">New Pharmacy Invoice</h1>
        <p className="text-slate-500 text-sm">
          Sell medicines to a patient, or leave the patient blank for a walk-in sale.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-6 max-w-3xl">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Patient Info (optional)</h2>
          <p className="text-slate-500 text-sm mb-4">
            Search by name, patient ID or phone to attach a patient, or leave blank for a walk-in sale.
          </p>
          <PatientSearchForm value={patientData} onChange={setPatientData} />
          {activeAdmission && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 mt-3">
              Linked to current admission — Room {activeAdmission.room?.roomNumber || "—"}
              {activeAdmission.bed ? ` (${activeAdmission.bed.bedNumber})` : ""}, {activeAdmission.tokenLabel}
            </p>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Select Medicines</h2>
            <input
              placeholder="Search medicines..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm"
            />
          </div>

          {grouped.length === 0 ? (
            <p className="text-slate-500 text-sm">No medicines match your search.</p>
          ) : (
            <div className="grid gap-4 max-h-96 overflow-y-auto pr-1">
              {grouped.map(([category, catItems]) => (
                <div key={category}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{category}</p>
                  <div className="grid gap-1">
                    {catItems.map((item) => {
                      const isChecked = selected[item.id] !== undefined;
                      const outOfStock = item.stockQuantity <= 0;
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded border ${
                            isChecked ? "border-blue-950 bg-blue-50" : "border-slate-100 hover:bg-slate-50"
                          } ${outOfStock ? "opacity-50" : ""}`}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={outOfStock}
                              onChange={() => toggleItem(item)}
                            />
                            <span className="text-sm text-slate-800">
                              {item.name}{" "}
                              <span className="text-xs text-slate-400">
                                (stock: {item.stockQuantity} {item.unit})
                              </span>
                            </span>
                          </span>
                          {isChecked ? (
                            <span className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                max={item.stockQuantity}
                                value={selected[item.id].quantity}
                                onChange={(e) => updateSelection(item.id, { quantity: e.target.value })}
                                className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right"
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={selected[item.id].price}
                                onChange={(e) => updateSelection(item.id, { price: e.target.value })}
                                className="w-20 border border-slate-300 rounded px-2 py-1 text-sm text-right"
                              />
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500">PKR {item.pricePerUnit}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">{selectedCount} item(s) selected</p>
            <p className="text-lg font-semibold text-blue-950">Total: PKR {total}</p>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
