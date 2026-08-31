export default function PlaceholderPage({ title, description, note }) {
  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
        {description && <p className="text-slate-500 text-sm">{description}</p>}
      </header>
      <div className="bg-white rounded-lg shadow p-6 text-slate-500 text-sm">{note}</div>
    </div>
  );
}
