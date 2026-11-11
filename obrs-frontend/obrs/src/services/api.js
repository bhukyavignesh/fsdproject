/**
 * Mock API layer. Every function returns a Promise with the same shape a real
 * REST/GraphQL backend would, so swapping to `fetch('/api/...')` is a one-file change.
 */
import { seededRandom, hashString } from '../utils/random';
import {
  OPERATORS, BUS_TYPES, AMENITIES, SEAT_STATUS, PROMO_CODES, SEAT_LOCK_MINUTES,
} from '../data/constants';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const STOP_NAMES = {
  default: ['Central Bus Stand', 'Railway Station', 'Airport Road', 'Ring Road Junction', 'Tech Park Gate', 'Old City Circle'],
  Bengaluru: ['Majestic', 'Silk Board', 'Electronic City', 'Hebbal', 'Marathahalli', 'Madiwala'],
  Chennai: ['Koyambedu', 'Guindy', 'Tambaram', 'Porur', 'Vadapalani', 'Ashok Pillar'],
  Mumbai: ['Dadar East', 'Sion', 'Borivali', 'Andheri East', 'Vashi', 'Thane'],
  Pune: ['Swargate', 'Shivajinagar', 'Hinjewadi', 'Wakad', 'Katraj', 'Kharadi'],
  Hyderabad: ['Ameerpet', 'Kukatpally', 'LB Nagar', 'Miyapur', 'Lakdikapul', 'Gachibowli'],
  Delhi: ['Kashmere Gate ISBT', 'Anand Vihar', 'Majnu Ka Tilla', 'Dhaula Kuan', 'Akshardham', 'Sarai Kale Khan'],
};

function stopsFor(city, rand, baseTime, offsets) {
  const names = STOP_NAMES[city] ?? STOP_NAMES.default;
  const count = 3 + Math.floor(rand() * 3);
  return names.slice(0, count).map((name, i) => ({
    id: `${city}-${i}`,
    name,
    time: baseTime + offsets * i,
    address: `${name}, near main gate, ${city}`,
  }));
}

/** Build a deck grid. `null` cells are aisles. */
function buildDeck({ id, name, rows, pattern, kind, prefix, fare, rand, occupancy }) {
  let n = 1;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid.push(
      pattern.map((col) => {
        if (col === null) return null;
        const roll = rand();
        let status = SEAT_STATUS.AVAILABLE;
        if (roll < occupancy) status = SEAT_STATUS.BOOKED;
        else if (roll < occupancy + 0.08) status = SEAT_STATUS.FEMALE;
        const seat = { id: `${prefix}${n}`, label: `${prefix}${n}`, type: kind, fare, status, deck: id };
        n += 1;
        return seat;
      }),
    );
  }
  return { id, name, grid };
}

export function buildSeatLayout(bus) {
  const rand = seededRandom(`${bus.id}-seats`);
  const occupancy = 0.2 + rand() * 0.4;
  if (bus.kind === 'seater') {
    return {
      decks: [buildDeck({
        id: 'lower', name: 'Seater', rows: 10, pattern: ['A', 'B', null, 'C', 'D'],
        kind: 'seater', prefix: '', fare: bus.baseFare, rand, occupancy,
      })],
    };
  }
  return {
    decks: [
      buildDeck({ id: 'lower', name: 'Lower Deck', rows: 6, pattern: ['A', null, 'B', 'C'], kind: 'sleeper', prefix: 'L', fare: bus.baseFare + 100, rand, occupancy }),
      buildDeck({ id: 'upper', name: 'Upper Deck', rows: 6, pattern: ['A', null, 'B', 'C'], kind: 'sleeper', prefix: 'U', fare: bus.baseFare, rand, occupancy }),
    ],
  };
}

function makeBus(index, from, to, date) {
  const id = `${index}__${from}__${to}__${date}`;
  const rand = seededRandom(id);
  const routeLen = 240 + (hashString(`${[from, to].sort().join('-')}`) % 660); // 4h–15h
  const type = BUS_TYPES[Math.floor(rand() * BUS_TYPES.length)];
  const departure = Math.floor(rand() * 96) * 15; // 15-min slots
  const duration = routeLen + Math.floor(rand() * 8) * 15 - 45;
  const base = Math.round((routeLen * (type.ac ? 1.6 : 1.1) * (type.kind === 'sleeper' ? 1.25 : 1)) / 10) * 10;
  const amenities = AMENITIES.filter(() => rand() > 0.45);
  const bus = {
    id,
    operator: OPERATORS[Math.floor(rand() * OPERATORS.length)],
    busType: type.name,
    ac: type.ac,
    kind: type.kind,
    rating: Math.round((3.4 + rand() * 1.6) * 10) / 10,
    ratingCount: 80 + Math.floor(rand() * 4000),
    from, to, date,
    departure,
    arrival: departure + duration,
    duration,
    baseFare: base,
    amenities,
    liveTracking: amenities.includes('Live Tracking'),
    boardingPoints: stopsFor(from, rand, departure, 15),
    droppingPoints: stopsFor(to, rand, departure + duration - 45, 15),
  };
  const layout = buildSeatLayout(bus);
  const seats = layout.decks.flatMap((d) => d.grid.flat().filter(Boolean));
  bus.totalSeats = seats.length;
  bus.availableSeats = seats.filter((s) => s.status !== SEAT_STATUS.BOOKED).length;
  bus.minFare = Math.min(...seats.map((s) => s.fare));
  return bus;
}

export async function searchBuses({ from, to, date }) {
  await delay(550);
  if (!from || !to || from === to) return [];
  const count = 8 + (hashString(`${from}${to}${date}`) % 7);
  return Array.from({ length: count }, (_, i) => makeBus(i, from, to, date));
}

export async function getBusById(busId) {
  await delay(200);
  const [i, from, to, date] = busId.split('__');
  return makeBus(Number(i), from, to, date);
}

export async function getSeatLayout(bus) {
  await delay(350);
  return buildSeatLayout(bus);
}

/** Server-side temporary seat hold. A real backend would return 409 for contested seats. */
export async function lockSeats(busId, seatIds) {
  await delay(400);
  return {
    lockId: `LK${hashString(busId + seatIds.join()).toString(36).toUpperCase()}`,
    expiresAt: Date.now() + SEAT_LOCK_MINUTES * 60 * 1000,
  };
}

export async function releaseSeats() {
  await delay(100);
  return { ok: true };
}

export async function validatePromo(code, fare) {
  await delay(500);
  const promo = PROMO_CODES[code.trim().toUpperCase()];
  if (!promo) return { valid: false, message: 'This code is invalid or has expired.' };
  if (fare < promo.minFare) return { valid: false, message: `Valid on fares above ₹${promo.minFare}.` };
  const discount = promo.type === 'flat'
    ? promo.value
    : Math.min(Math.round((fare * promo.value) / 100), promo.cap);
  return { valid: true, code: code.trim().toUpperCase(), discount, message: promo.label };
}

export async function createBooking(payload) {
  await delay(1400);
  const pnr = `RR${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
  return { ...payload, pnr, status: 'CONFIRMED', bookedAt: new Date().toISOString() };
}
