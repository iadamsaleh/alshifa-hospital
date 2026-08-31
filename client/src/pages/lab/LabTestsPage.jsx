import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import LabTestFormModal from "./LabTestFormModal";

function groupByCategory(tests) {
  const groups = {};
  for (const test of tests) {
    const key = test.category || "Uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(test);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function LabTestsPage() {
  const { authFetch } = useAuth();

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalTest, setModalTest] = useState(undefined); // undefined = closed, null = add, object = edit

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch("/lab/tests");
      if (!res.ok) throw new Error("Failed to load lab tests");
      setTests(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(test) {
    if (!window.confirm(`Delete "${test.testName}"? This cannot be undone.`)) return;
    const res = await authFetch(`/lab/tests/${test.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  function handleSaved() {
    setModalTest(undefined);
    load();
  }

  const grouped = groupByCategory(tests);

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Lab Tests</h1>
          <p className="text-slate-500 text-sm">Manage the lab test catalogue.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalTest(null)}
          className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900"
        >
          + Add New Test
        </button>
      </header>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : tests.length === 0 ? (
        <p className="text-slate-500 text-sm">No lab tests yet.</p>
      ) : (
        <div className="grid gap-6">
          {grouped.map(([category, items]) => (
            <section key={category} className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700 border-b border-slate-100">
                {category}
              </h2>
              <table className="w-full text-sm">
                <thead className="text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Test Name</th>
                    <th className="px-4 py-2 font-medium">Test Code</th>
                    <th className="px-4 py-2 font-medium">Price (PKR)</th>
                    <th className="px-4 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2 text-slate-800 font-medium">{t.testName}</td>
                      <td className="px-4 py-2 text-slate-600">{t.testCode}</td>
                      <td className="px-4 py-2 text-slate-600">PKR {t.price}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setModalTest(t)}
                            className="text-blue-950 hover:underline text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            className="text-red-600 hover:underline text-xs font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}

      {modalTest !== undefined && (
        <LabTestFormModal test={modalTest} onClose={() => setModalTest(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}
