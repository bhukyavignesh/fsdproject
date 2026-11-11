export const CITIES = [
  'Bengaluru', 'Chennai', 'Hyderabad', 'Mumbai', 'Pune', 'Goa',
  'Delhi', 'Jaipur', 'Manali', 'Kolkata', 'Ahmedabad', 'Kochi',
];

export const SEAT_STATUS = {
  AVAILABLE: 'available',
  SELECTED: 'selected',
  BOOKED: 'booked',
  FEMALE: 'female',
};

export const MAX_SEATS_PER_BOOKING = 6;
export const SEAT_LOCK_MINUTES = 10;
export const GST_RATE = 0.05;

export const DEPARTURE_SLOTS = [
  { id: 'early', label: 'Before 6 AM', from: 0, to: 360, icon: 'Moon' },
  { id: 'morning', label: '6 AM – 12 PM', from: 360, to: 720, icon: 'Sunrise' },
  { id: 'afternoon', label: '12 PM – 6 PM', from: 720, to: 1080, icon: 'Sun' },
  { id: 'night', label: 'After 6 PM', from: 1080, to: 1440, icon: 'Sunset' },
];

export const AMENITIES = ['WiFi', 'Charging Point', 'Water Bottle', 'Blanket', 'Reading Light', 'Live Tracking', 'Snacks'];

export const OPERATORS = [
  'Orange Travels', 'VRL Travels', 'SRS Travels', 'IntrCity SmartBus',
  'Zingbus', 'KPN Travels', 'Neeta Tours', 'Jabbar Travels', 'Paulo Travels', 'NueGo Electric',
];

export const BUS_TYPES = [
  { name: 'AC Sleeper (2+1)', ac: true, kind: 'sleeper' },
  { name: 'Volvo Multi-Axle AC Seater (2+2)', ac: true, kind: 'seater' },
  { name: 'Non-AC Sleeper (2+1)', ac: false, kind: 'sleeper' },
  { name: 'Non-AC Seater (2+2)', ac: false, kind: 'seater' },
  { name: 'Scania AC Multi-Axle Sleeper', ac: true, kind: 'sleeper' },
  { name: 'Electric AC Seater (2+2)', ac: true, kind: 'seater' },
];

export const PROMO_CODES = {
  FIRST100: { type: 'flat', value: 100, minFare: 500, label: '₹100 off on your first booking' },
  SAVE10: { type: 'percent', value: 10, cap: 250, minFare: 0, label: '10% off, up to ₹250' },
  WEEKEND15: { type: 'percent', value: 15, cap: 400, minFare: 1000, label: '15% off on fares above ₹1,000' },
};

export const OFFERS = [
  { code: 'FIRST100', title: 'Flat ₹100 off', subtitle: 'On your first bus booking', tone: 'from-brand-600 to-orange-500' },
  { code: 'SAVE10', title: 'Save 10% everyday', subtitle: 'Up to ₹250 on any route', tone: 'from-indigo-600 to-violet-500' },
  { code: 'WEEKEND15', title: 'Weekend getaway', subtitle: '15% off on fares above ₹1,000', tone: 'from-emerald-600 to-teal-500' },
  { code: 'SAVE10', title: 'Women travel safe', subtitle: 'Reserved seats + live tracking', tone: 'from-pink-600 to-rose-500' },
];

export const POPULAR_ROUTES = [
  { from: 'Bengaluru', to: 'Chennai', fareFrom: 549, buses: 214 },
  { from: 'Mumbai', to: 'Pune', fareFrom: 299, buses: 342 },
  { from: 'Hyderabad', to: 'Bengaluru', fareFrom: 799, buses: 186 },
  { from: 'Delhi', to: 'Jaipur', fareFrom: 449, buses: 158 },
  { from: 'Delhi', to: 'Manali', fareFrom: 1099, buses: 64 },
  { from: 'Mumbai', to: 'Goa', fareFrom: 899, buses: 121 },
];
