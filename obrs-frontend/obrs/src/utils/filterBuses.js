import { DEPARTURE_SLOTS } from '../data/constants';

export function applyFilters(buses, f) {
  return buses.filter((b) => {
    if ((f.ac || f.nonAc) && !((f.ac && b.ac) || (f.nonAc && !b.ac))) return false;
    if ((f.sleeper || f.seater) && !((f.sleeper && b.kind === 'sleeper') || (f.seater && b.kind === 'seater'))) return false;
    if (f.departureSlots.length) {
      const ok = f.departureSlots.some((id) => {
        const s = DEPARTURE_SLOTS.find((x) => x.id === id);
        return b.departure >= s.from && b.departure < s.to;
      });
      if (!ok) return false;
    }
    if (b.minFare < f.price[0] || b.minFare > f.price[1]) return false;
    if (f.amenities.length && !f.amenities.every((a) => b.amenities.includes(a))) return false;
    if (f.operators.length && !f.operators.includes(b.operator)) return false;
    if (f.boardingPoints.length && !b.boardingPoints.some((p) => f.boardingPoints.includes(p.name))) return false;
    if (f.droppingPoints.length && !b.droppingPoints.some((p) => f.droppingPoints.includes(p.name))) return false;
    if (f.minRating && b.rating < f.minRating) return false;
    return true;
  });
}

const SORTERS = {
  departure: (a, b) => a.departure - b.departure,
  price: (a, b) => a.minFare - b.minFare,
  rating: (a, b) => b.rating - a.rating,
  duration: (a, b) => a.duration - b.duration,
  seats: (a, b) => b.availableSeats - a.availableSeats,
};

export const sortBuses = (buses, key) => [...buses].sort(SORTERS[key] ?? SORTERS.departure);

export function countActiveFilters(f, bounds) {
  let n = 0;
  ['ac', 'nonAc', 'sleeper', 'seater'].forEach((k) => { if (f[k]) n += 1; });
  n += f.departureSlots.length + f.amenities.length + f.operators.length + f.boardingPoints.length + f.droppingPoints.length;
  if (f.minRating) n += 1;
  if (bounds && (f.price[0] > bounds[0] || f.price[1] < bounds[1])) n += 1;
  return n;
}
