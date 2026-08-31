export default function StatCard({ label, value, onClick, accent }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`bg-white rounded-lg shadow p-5 text-left w-full ${
        onClick ? "hover:shadow-md transition cursor-pointer" : ""
      }`}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent || "text-blue-950"}`}>{value}</p>
    </Tag>
  );
}
