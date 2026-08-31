import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-blue-950 mt-1">{value}</p>
    </div>
  );
}

export default function StockReportPage() {
  const { authFetch } = useAuth();

  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      authFetch("/pharmacy/reports/summary").then((res) => {
        if (!res.ok) throw new Error("Failed to load stock report");
        return res.json();
      }),
      authFetch("/pharmacy/items").then((res) => res.json()),
    ])
      .then(([summaryData, itemsData]) => {
        setSummary(summaryData);
        setItems(itemsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="p-8 text-slate-500 text-sm">Loading...</div>;
  if (error) return <div className="p-8 text-red-600 text-sm">{error}</div>;
  if (!summary) return null;

  const now = new Date();
  const sortedByStock = [...items].sort((a, b) => a.stockQuantity - b.stockQuantity);
  const expiredItems = items.filter((i) => i.expiryDate && new Date(i.expiryDate) <= now);

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Stock Report</h1>
        <p className="text-slate-500 text-sm">Inventory value, stock levels and expiry overview.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Inventory Value (PKR)" value={summary.totalInventoryValue} />
        <StatCard label="Items Low on Stock" value={summary.lowStockCount} />
        <StatCard label="Items Expiring Soon (30 days)" value={summary.expiringSoonCount} />
      </div>

      <section className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <h2 className="px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700 border-b border-slate-100">
          Full Inventory (lowest stock first)
        </h2>
        {items.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No items in inventory.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Stock</th>
                <th className="px-4 py-2 font-medium">Price/Unit (PKR)</th>
                <th className="px-4 py-2 font-medium">Expiry Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedByStock.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-slate-800 font-medium">{item.name}</td>
                  <td className="px-4 py-2 text-slate-600">{item.category || "—"}</td>
                  <td
                    className={`px-4 py-2 ${item.stockQuantity < 10 ? "text-red-600 font-semibold" : "text-slate-600"}`}
                  >
                    {item.stockQuantity}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{item.pricePerUnit}</td>
                  <td className="px-4 py-2 text-slate-600">{formatDate(item.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="px-4 py-3 bg-red-50 text-sm font-semibold text-red-800 border-b border-red-100">
          Expired Items
        </h2>
        {expiredItems.length === 0 ? (
          <p className="text-slate-500 text-sm p-4">No expired items.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Stock</th>
                <th className="px-4 py-2 font-medium">Expired On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expiredItems.map((item) => (
                <tr key={item.id} className="bg-red-50">
                  <td className="px-4 py-2 text-slate-800 font-medium">{item.name}</td>
                  <td className="px-4 py-2 text-slate-600">{item.category || "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{item.stockQuantity}</td>
                  <td className="px-4 py-2 text-red-700 font-medium">{formatDate(item.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
