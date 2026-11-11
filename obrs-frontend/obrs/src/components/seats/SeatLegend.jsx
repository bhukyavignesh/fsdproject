const ITEMS = [
  { label: 'Available', cls: 'border-emerald-500 bg-emerald-50' },
  { label: 'Selected', cls: 'border-blue-600 bg-blue-600' },
  { label: 'Booked', cls: 'border-slate-300 bg-slate-200' },
  { label: 'Female only', cls: 'border-pink-500 bg-pink-50' },
];

export default function SeatLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-700" aria-label="Seat legend">
      {ITEMS.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className={`h-4 w-4 rounded border-2 ${i.cls}`} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
