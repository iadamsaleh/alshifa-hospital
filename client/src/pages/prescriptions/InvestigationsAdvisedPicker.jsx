import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function InvestigationsAdvisedPicker({ selected, onChange }) {
  const { authFetch } = useAuth();
  const [allTests, setAllTests] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    authFetch("/lab/tests")
      .then((r) => r.json())
      .then(setAllTests)
      .catch(() => setAllTests([]));
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

  const selectedIds = new Set(selected.filter((s) => s.testId).map((s) => s.testId));

  const filtered = allTests.filter(
    (t) =>
      !selectedIds.has(t.id) &&
      (t.testName.toLowerCase().includes(search.toLowerCase()) ||
        t.testCode.toLowerCase().includes(search.toLowerCase()) ||
        (t.category || "").toLowerCase().includes(search.toLowerCase()))
  );

  function addTest(test) {
    onChange([...selected, { testId: test.id, testName: test.testName, testCode: test.testCode, price: test.price }]);
    setSearch("");
  }

  function addCustom() {
    const trimmed = customText.trim();
    if (!trimmed) return;
    // Custom investigations (not in catalog) stored without testId
    const alreadyAdded = selected.some((s) => !s.testId && s.testName === trimmed);
    if (alreadyAdded) return;
    onChange([...selected, { testId: null, testName: trimmed, testCode: null, price: 0 }]);
    setCustomText("");
  }

  function remove(index) {
    onChange(selected.filter((_, i) => i !== index));
  }

  function handleCustomKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  }

  return (
    <div>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {s.testName}
              {s.testCode && <span className="text-amber-500">({s.testCode})</span>}
              {s.price > 0 && <span className="text-amber-600">Rs.{s.price}</span>}
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-amber-400 hover:text-amber-700 leading-none ml-0.5"
                aria-label={`Remove ${s.testName}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Searchable dropdown */}
      <div ref={containerRef} className="relative mb-3">
        <input
          type="text"
          placeholder="Search lab tests to advise..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
        {open && (search || filtered.length > 0) && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-slate-400 text-sm">No matching tests</p>
            ) : (
              filtered.slice(0, 50).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addTest(t);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm flex justify-between items-center"
                >
                  <span>
                    <span className="font-medium text-slate-800">{t.testName}</span>
                    <span className="text-slate-400 ml-2 text-xs">{t.testCode}</span>
                    {t.category && <span className="text-slate-400 ml-1 text-xs">— {t.category}</span>}
                  </span>
                  <span className="text-slate-500 text-xs shrink-0 ml-2">Rs.{t.price}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Custom investigation input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add custom investigation not in list..."
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={handleCustomKeyDown}
          className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addCustom}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded px-3 py-2 text-sm font-medium"
        >
          Add
        </button>
      </div>
    </div>
  );
}
