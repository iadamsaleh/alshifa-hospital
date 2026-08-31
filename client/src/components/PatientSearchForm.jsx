import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export default function PatientSearchForm({ value, onChange }) {
  const { authFetch } = useAuth();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const blurTimeout = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setMatches([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await authFetch(`/patients?search=${encodeURIComponent(trimmed)}&pageSize=5`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setMatches(data.data);
      } catch (err) {
        setSearchError(err.message);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function selectMatch(patient) {
    onChange({
      ...value,
      existingPatientId: patient.id,
      patientId: patient.patientId,
      name: patient.name,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth.slice(0, 10),
      phone: patient.phone,
      address: patient.address || "",
      bloodGroup: patient.bloodGroup || "",
    });
    setQuery("");
    setMatches([]);
    setIsOpen(false);
  }

  function registerAsNew() {
    onChange({ ...value, existingPatientId: null, patientId: null });
  }

  function handleFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setIsOpen(true);
  }

  function handleBlur() {
    // Delay closing so a click on a dropdown result registers first.
    blurTimeout.current = setTimeout(() => setIsOpen(false), 150);
  }

  const trimmedQuery = query.trim();
  const showDropdown = isOpen && trimmedQuery.length >= MIN_QUERY_LENGTH;

  return (
    <>
      <div className="relative mb-4">
        <input
          placeholder="Search by name, patient ID or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full border border-slate-300 rounded px-3 py-2"
        />
        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded shadow-lg max-h-64 overflow-y-auto">
            {searching ? (
              <p className="text-slate-500 text-sm px-3 py-2">Searching...</p>
            ) : searchError ? (
              <p className="text-red-600 text-sm px-3 py-2">{searchError}</p>
            ) : matches.length === 0 ? (
              <p className="text-slate-500 text-sm px-3 py-2">No matching patients.</p>
            ) : (
              matches.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => selectMatch(p)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {p.name} <span className="text-xs text-slate-400">({p.patientId})</span>
                  </p>
                  <p className="text-xs text-slate-500">{p.phone}</p>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {value.existingPatientId && (
        <div className="mb-4 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          <p className="text-sm text-emerald-800">
            Using existing patient <strong>{value.patientId}</strong>
          </p>
          <button type="button" onClick={registerAsNew} className="text-xs text-emerald-700 underline">
            Register as new instead
          </button>
        </div>
      )}

      <div className="grid gap-3">
        <input
          required
          placeholder="Full name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            type="date"
            value={value.dateOfBirth}
            onChange={(e) => onChange({ ...value, dateOfBirth: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2"
          />
          <select
            value={value.gender}
            onChange={(e) => onChange({ ...value, gender: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2"
          >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <input
          required
          placeholder="Phone"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          className="border border-slate-300 rounded px-3 py-2"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Blood group (optional)"
            value={value.bloodGroup}
            onChange={(e) => onChange({ ...value, bloodGroup: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2"
          />
          <input
            placeholder="Address (optional)"
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2"
          />
        </div>
      </div>
    </>
  );
}
