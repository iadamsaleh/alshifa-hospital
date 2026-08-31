import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function DiagnosisCombobox({ selected, onChange }) {
  const { authFetch } = useAuth();
  const [allDiagnoses, setAllDiagnoses] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    authFetch("/diagnoses")
      .then((r) => r.json())
      .then((data) => setAllDiagnoses(data.diagnoses || []))
      .catch(() => setAllDiagnoses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSet = new Set(selected);

  const filtered = allDiagnoses.filter(
    (d) => !selectedSet.has(d.name) && d.name.toLowerCase().includes(search.toLowerCase())
  );

  function add(name) {
    if (!name.trim() || selectedSet.has(name.trim())) return;
    onChange([...selected, name.trim()]);
    setSearch("");
    setOpen(false);
  }

  function remove(name) {
    onChange(selected.filter((s) => s !== name));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      // If there's an exact match in filtered list, pick it; otherwise add as typed
      if (filtered.length > 0 && filtered[0].name.toLowerCase() === search.trim().toLowerCase()) {
        add(filtered[0].name);
      } else if (search.trim()) {
        add(search.trim());
      }
    }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                className="text-blue-400 hover:text-blue-700 leading-none"
                aria-label={`Remove ${name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div ref={containerRef} className="relative">
        <input
          type="text"
          placeholder="Type to search or add a diagnosis..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
        {open && (search.length > 0 || filtered.length > 0) && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-52 overflow-y-auto">
            {filtered.length === 0 && search.trim() ? (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(search.trim()); }}
                className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
              >
                Add &ldquo;{search.trim()}&rdquo;
              </button>
            ) : (
              filtered.slice(0, 50).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); add(d.name); }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex justify-between"
                >
                  <span className="text-slate-800">{d.name}</span>
                  <span className="text-slate-400 text-xs">{d.category}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
