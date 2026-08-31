export default function DoctorTitleBadge({ title, className = "" }) {
  if (!title) return null;
  return (
    <span
      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 ${className}`}
    >
      {title}
    </span>
  );
}
