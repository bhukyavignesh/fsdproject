import { Star } from 'lucide-react';

export default function RatingBadge({ rating, count }) {
  const tone = rating >= 4.2 ? 'bg-emerald-600' : rating >= 3.6 ? 'bg-amber-500' : 'bg-orange-500';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold text-white ${tone}`}>
        <Star className="h-3 w-3 fill-current" aria-hidden />
        {rating.toFixed(1)}
      </span>
      {count != null && <span>{count.toLocaleString('en-IN')} ratings</span>}
    </span>
  );
}
