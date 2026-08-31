import { useRef, useState } from "react";

export default function MedicineCombobox({ value, onChange, medicines, onAddCustom, onSelectMedicine }) {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const blurTimeout = useRef(null);

  const trimmed = query.trim();
  const filtered = (
    trimmed.length === 0
      ? medicines
      : medicines.filter((m) => m.name.toLowerCase().includes(trimmed.toLowerCase()))
  ).slice(0, 8);

  const exactMatch = medicines.some((m) => m.name.toLowerCase() === trimmed.toLowerCase());

  function handleFocus() {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setIsOpen(true);
  }

  function handleBlur() {
    blurTimeout.current = setTimeout(() => setIsOpen(false), 150);
  }

  function handleInput(e) {
    const next = e.target.value;
    setQuery(next);
    onChange(next);
  }

  function selectMedicine(medicine) {
    setQuery(medicine.name);
    onChange(medicine.name);
    onSelectMedicine?.(medicine);
    setIsOpen(false);
  }

  async function handleAddCustom() {
    if (!trimmed) return;
    setAdding(true);
    try {
      const created = await onAddCustom(trimmed);
      selectMedicine(created || { name: trimmed, source: "custom" });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search medicine..."
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
      />
      {isOpen && (
        <div className="absolute z-20 mt-1 w-64 bg-white border border-slate-200 rounded shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((m) => (
            <button
              type="button"
              key={`${m.source}-${m.id ?? m.name}`}
              onClick={() => selectMedicine(m)}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-sm"
            >
              {m.name}
              {m.genericName && <span className="text-xs text-slate-400"> ({m.genericName})</span>}
              <span className="text-[10px] text-slate-400 ml-1">[{m.source}]</span>
            </button>
          ))}
          {filtered.length === 0 && trimmed.length === 0 && (
            <p className="text-slate-400 text-xs px-3 py-2">Type to search medicines...</p>
          )}
          {trimmed.length > 0 && !exactMatch && (
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={adding}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-sm text-blue-950 font-medium border-t border-slate-100 disabled:opacity-50"
            >
              {adding ? "Adding..." : `+ Add "${trimmed}" as custom medicine`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
