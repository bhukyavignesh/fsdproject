# RouteRed — Online Bus Reservation System (Frontend)

React 18 · Vite · React Router v6 · Tailwind CSS · Lucide React · Context API + useReducer

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build (BrowserRouter; configure SPA fallback on your host)
```

## Architecture

```
src/
├── App.jsx                     # Router: routes, lazy-loaded pages, ProtectedRoute
├── context/                    # Global state (Context + useReducer)
│   ├── AuthContext.jsx         #   user session (localStorage), traveller/operator role
│   ├── SearchContext.jsx       #   query + filters + sort
│   ├── BookingContext.jsx      #   bus, seats, stops, seat lock, promo, confirmed tickets
│   ├── PreferencesContext.jsx  #   currency (INR/USD) + language (EN/HI)
│   └── AppProviders.jsx
├── services/api.js             # Mock backend. Same async signatures as a real API.
├── hooks/                      # useCountdown, useLiveSeatUpdates, usePersistentReducer
├── components/
│   ├── layout/                 # Header, Footer, Layout, ProtectedRoute
│   ├── search/SearchWidget     # origin/destination + swap, dates, return trip
│   ├── buses/                  # FilterSidebar, PriceRangeSlider, BusCard, SearchSummaryBar
│   ├── seats/                  # SeatMap, Seat, SeatLegend, FareSummary, SeatSelectionPanel
│   ├── checkout/               # LockTimer, PassengerForm, PromoCode, PaymentAccordion
│   ├── ticket/ETicket          # printable ticket, QR, map snippet
│   └── ui/                     # Toast, Modal, Spinner, RatingBadge, QrCode
├── pages/                      # Home, SearchResults, SeatSelection, Checkout, Confirmation,
│                               # Dashboard, OperatorPortal, Login, NotFound
└── utils/                      # fare calc, filtering/sorting, formatting, seeded RNG
```

### Why Context + useReducer (not Redux)
There are three independent slices with low update frequency. Each reducer is pure
and maps 1:1 to a Redux Toolkit slice if the app grows (e.g. RTK Query for caching).

### Key behaviours
- **URL is the source of truth for searches.** `/buses?from=…&to=…&date=…` is shareable.
- **Seat lock.** `holdSeats()` calls `api.lockSeats` and stores `expiresAt` in sessionStorage,
  so a refresh on `/checkout` keeps the timer. On expiry a non-dismissible modal releases the seats.
- **Live seat status.** `useLiveSeatUpdates` simulates other users booking seats. To use a real
  backend, replace its interval with a WebSocket/SSE subscription.
- **Female-only seats** can be selected, but the passenger form locks gender to Female and
  validation enforces it.
- **Promo codes:** `FIRST100`, `SAVE10`, `WEEKEND15`.
- **Operator portal** requires logging in with the "Bus operator" role.

### Connecting a real backend
Replace the function bodies in `src/services/api.js` with `fetch` calls. Components only
depend on the returned shapes (bus, layout `{ decks: [{ id, name, grid: Seat|null[][] }] }`,
lock `{ lockId, expiresAt }`, booking `{ pnr, … }`).

### Deploying
`BrowserRouter` needs an SPA fallback (all paths → `index.html`). For static hosts without
rewrites, `npm run build:preview` builds with `HashRouter` and relative asset paths.
