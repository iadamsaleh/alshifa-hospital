import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/StatCard";

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export default function PharmacyReport() {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetch("/reports/pharmacy")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load pharmacy report");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-slate-500 text-sm">Loading...</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Inventory Value (PKR)" value={data.totalInventoryValue.toLocaleString()} />
        <StatCard
          label="Low Stock Items"
          value={data.lowStock.length}
          accent={data.lowStock.length > 0 ? "text-amber-600" : "text-blue-950"}
        />
        <StatCard
          label="Expired / Expiring Soon"
          value={data.expired.length + data.expiringSoon.length}
          accent={data.expired.length > 0 ? "text-red-600" : "text-blue-950"}
        />
      </div>

      <section className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Top 10 Selling Medicines</h2>
        {data.topSelling.length === 0 ? (
          <p className="text-slate-500 text-sm">No pharmacy sales yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, data.topSelling.length * 36)}>
            <BarChart data={data.topSelling} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" allowDecimals={false} />
              <YAxis type="category" dataKey="itemName" tick={{ fontSize: 11 }} stroke="#64748b" width={180} />
              <Tooltip />
              <Bar dataKey="quantity" name="Units Sold" fill="#0891b2" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="px-4 py-3 bg-amber-50 text-sm font-semibold text-amber-800 border-b border-amber-100">
            Low Stock Items
          </h2>
          {data.lowStock.length === 0 ? (
            <p className="text-slate-500 text-sm p-4">No items low on stock.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lowStock.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-slate-800 font-medium">{item.name}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold">{item.stockQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="px-4 py-3 bg-red-50 text-sm font-semibold text-red-800 border-b border-red-100">
            Expired / Expiring Soon
          </h2>
          {data.expired.length === 0 && data.expiringSoon.length === 0 ? (
            <p className="text-slate-500 text-sm p-4">No expired or expiring items.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Expiry Date</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.expired.map((item) => (
                  <tr key={`exp-${item.id}`} className="bg-red-50">
                    <td className="px-4 py-2 text-slate-800 font-medium">{item.name}</td>
                    <td className="px-4 py-2 text-red-700 font-medium">{formatDate(item.expiryDate)}</td>
                    <td className="px-4 py-2 text-red-700 text-xs font-semibold">Expired</td>
                  </tr>
                ))}
                {data.expiringSoon.map((item) => (
                  <tr key={`soon-${item.id}`}>
                    <td className="px-4 py-2 text-slate-800 font-medium">{item.name}</td>
                    <td className="px-4 py-2 text-amber-700 font-medium">{formatDate(item.expiryDate)}</td>
                    <td className="px-4 py-2 text-amber-700 text-xs font-semibold">Expiring Soon</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
