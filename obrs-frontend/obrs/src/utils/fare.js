import { GST_RATE } from '../data/constants';

export function computeFare(seats = [], promo = null) {
  const seatFare = seats.reduce((sum, s) => sum + s.fare, 0);
  const discount = promo?.discount ? Math.min(promo.discount, seatFare) : 0;
  const taxable = seatFare - discount;
  const taxes = Math.round(taxable * GST_RATE);
  const convenience = seats.length ? 15 * seats.length : 0;
  return { seatFare, discount, taxes, convenience, total: taxable + taxes + convenience };
}
