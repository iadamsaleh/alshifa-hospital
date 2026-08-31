import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import PharmacyItemFormModal from "./PharmacyItemFormModal";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function rowClass(item) {
  const now = new Date();
  if (item.expiryDate && new Date(item.expiryDate) <= now) return "bg-red-50";
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (item.expiryDate && new Date(item.expiryDate) <= in30Days) return "bg-amber-50";
  return "";
}

export default function PharmacyInventoryPage() {
  const { authFetch } = useAuth();

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalItem, setModalItem] = useState(undefined); // undefined = closed, null = add, object = edit

  async function load() {
    setLoading(true);
    try {
      const params = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const res = await authFetch(`/pharmacy/items${params}`);
      if (!res.ok) throw new Error("Failed to load inventory");
      setItems(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    const res = await authFetch(`/pharmacy/items/${item.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  function handleSaved() {
    setModalItem(undefined);
    load();
  }

  const lowStockItems = items.filter((i) => i.stockQuantity < 10);

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Pharmacy Inventory</h1>
          <p className="text-slate-500 text-sm">Manage medicines and supplies.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalItem(null)}
          className="bg-blue-950 text-white rounded px-4 py-2 font-medium hover:bg-blue-900"
        >
          + Add New Item
        </button>
      </header>

      {lowStockItems.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded px-4 py-3">
          <strong>Low stock alert:</strong> {lowStockItems.length} item{lowStockItems.length === 1 ? "" : "s"} below
          10 units — {lowStockItems.map((i) => i.name).join(", ")}
        </div>
      )}

      <div className="mb-4">
        <input
          placeholder="Search by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-slate-300 rounded px-3 py-2"
        />
      </div>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        {error && <p className="text-red-600 text-sm p-4">{error}</p>}
        {loading ? (
          <p className="text-slate-500 text-sm p-4">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No items found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">Price/Unit (PKR)</th>
                <th className="px-4 py-2 font-medium">Stock</th>
                <th className="px-4 py-2 font-medium">Expiry Date</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className={rowClass(item)}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{item.name}</td>
                  <td className="px-4 py-2 text-slate-600">{item.category || "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{item.unit}</td>
                  <td className="px-4 py-2 text-slate-600">{item.pricePerUnit}</td>
                  <td className={`px-4 py-2 ${item.stockQuantity < 10 ? "text-red-600 font-semibold" : "text-slate-600"}`}>
                    {item.stockQuantity}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(item.expiryDate)}</td>
                  <td className="px-4 py-2 text-slate-600">{item.supplier || "—"}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setModalItem(item)}
                        className="text-blue-950 hover:underline text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
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
        )}
      </section>

      {modalItem !== undefined && (
        <PharmacyItemFormModal item={modalItem} onClose={() => setModalItem(undefined)} onSaved={handleSaved} />
      )}
    </div>
  );
}
