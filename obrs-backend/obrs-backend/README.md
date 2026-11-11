# OBRS Backend — Spring Boot REST API

Online Bus Reservation System backend: JWT auth with Passenger / Operator / Admin roles,
bus search, concurrency-safe seat locking, booking with PNR generation, cancellations
and an operator portal.

**Stack:** Java 17 · Spring Boot 3.3 · Spring Security · Spring Data JPA / Hibernate ·
PostgreSQL or MySQL · Flyway · JJWT 0.12 · Maven · springdoc (Swagger UI)

---

## 1. Run it

### Prerequisites
- JDK 17+ (`java -version`)
- Maven 3.9+ (`mvn -v`), or generate a wrapper once with `mvn -N wrapper:wrapper` and use `./mvnw`
- Docker (easiest way to get PostgreSQL/MySQL), or a local database

### Option A — Docker Compose (database + API)
```bash
docker compose up --build
# API on http://localhost:8080, Swagger UI on http://localhost:8080/swagger-ui.html
```

### Option B — run from your IDE / Maven against PostgreSQL
```bash
docker compose up -d postgres                         # or use your own PostgreSQL 14+
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Option C — MySQL 8
```bash
docker compose --profile mysql up -d mysql
mvn spring-boot:run -Dspring-boot.run.profiles=dev,mysql
```

Flyway creates the schema automatically (`db/migration/postgresql` or `db/migration/mysql`
is picked from the JDBC URL). The **dev** profile seeds demo data on an empty database:

| Role | Login | Password |
|---|---|---|
| Admin | `admin@obrs.local` | `Admin@12345` |
| Operator | `operator@obrs.local` | `Operator@123` |
| Passenger | `demo@obrs.local` (or `9876543210`) | `Demo@1234` |

It also seeds 4 routes (Bengaluru⇄Chennai, Bengaluru→Hyderabad, Mumbai→Pune), 4 buses and
7 days of schedules.

### Run the tests
```bash
mvn verify
```
Tests use an in-memory H2 database (PostgreSQL mode). They include a real multi-threaded test
where 12 users race for the same seat and exactly one must win.

### Production
```bash
mvn -DskipTests package
export SPRING_PROFILES_ACTIVE=prod
export DB_URL=jdbc:postgresql://db-host:5432/obrs DB_USERNAME=obrs DB_PASSWORD='***'
export JWT_SECRET="$(openssl rand -base64 48)"
export CORS_ALLOWED_ORIGINS=https://your-frontend.example
java -jar target/obrs-backend-1.0.0.jar
```
The app refuses to start without `JWT_SECRET` (or with one shorter than 256 bits).
Run it behind HTTPS (load balancer / reverse proxy).

---

## 2. Configuration (`src/main/resources/application.properties`)

| Property | Env var | Default | Purpose |
|---|---|---|---|
| `spring.datasource.url` | `DB_URL` | `jdbc:postgresql://localhost:5432/obrs` | JDBC URL |
| `spring.datasource.username/password` | `DB_USERNAME` / `DB_PASSWORD` | dev values | DB credentials |
| `app.jwt.secret` | `JWT_SECRET` | none (dev profile has a fallback) | Base64 HMAC key ≥ 32 bytes |
| `app.jwt.access-token-ttl` | `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `app.jwt.refresh-token-ttl` | `JWT_REFRESH_TTL` | `7d` | Refresh token lifetime |
| `app.security.max-failed-logins` | | `5` | Failed logins before lockout |
| `app.security.lockout-duration` | | `15m` | Lockout length |
| `app.security.auth-rate-limit-per-minute` | | `10` | Per-IP limit on `/api/auth/*` POSTs |
| `app.security.cors-allowed-origins` | `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated frontend origins |
| `app.booking.seat-lock-duration` | | `10m` | Seat hold time |
| `app.booking.max-seats-per-booking` | | `6` | |
| `app.booking.tax-rate` | | `0.05` | GST |
| `app.booking.zone-id` | | `Asia/Kolkata` | Zone for schedule times / "today" |

Profiles: `dev` (seed data + Swagger), `mysql` (MySQL URL), `prod` (no defaults, no docs,
trusts `X-Forwarded-*` from your proxy), `test` (H2).

---

## 3. Project structure

```
com.obrs
├── ObrsApplication.java
├── config/        AppProperties, SecurityConfig, OpenApiConfig, ClockConfig
├── model/         User, Operator, Route, Bus, Schedule, Booking, BookedSeat, RefreshToken + enums
├── repository/    Spring Data JPA repositories (custom JPQL search & lock queries)
├── dto/           auth/, search/, booking/, operator/, admin/, ApiError
├── security/      JwtService, JwtAuthenticationFilter, CustomUserDetails(+Service),
│                  RateLimitFilter, RestAuthenticationEntryPoint, RestAccessDeniedHandler, TokenHasher
├── service/       AuthService, ScheduleSearchService, BookingService, OperatorService, AdminService,
│                  SeatLayoutService, FareCalculator, PnrGenerator, PaymentGateway(+Mock), SeatLockCleanupJob
├── controller/    AuthController, SearchController, BookingController, OperatorController, AdminController
├── exception/     ApiException, ErrorCode, GlobalExceptionHandler
└── bootstrap/     DataSeeder (dev only)
```

### Entity model
```
Operator 1─* Bus 1─* Schedule *─1 Route
User *─0..1 Operator (operator staff)
User 1─* Booking *─1 Schedule
Booking 1─* BookedSeat *─1 Schedule
User 1─* RefreshToken
```
Field notes vs. the original spec:
- `Route.estimatedDuration` is stored as `estimatedDurationMinutes` (an integer), which works the same on MySQL and PostgreSQL.
- `Bus.layoutConfig` is JSON (decks, rows, columns, aisle columns). `totalSeats` is derived from it.
- `BookingStatus` adds `EXPIRED`, for locks that ran out. `SeatStatus` adds `RELEASED`, so freed seats keep their history.
- `BookedSeat` also stores `scheduleId`, `fare` and `activeFlag`. These columns let the database enforce "one live claim per seat".

---

## 4. API reference

All errors use one shape:
```json
{"timestamp":"…","status":409,"code":"SEATS_UNAVAILABLE","message":"Seat(s) 5 are no longer available","path":"/api/bookings/lock","details":{"unavailableSeats":["5"]}}
```

### Auth `/api/auth`
| Method | Path | Auth | Body → Response |
|---|---|---|---|
| POST | `/register` | public | `{name,email,phone,password}` → **201** `AuthResponse` (always PASSENGER) |
| POST | `/login` | public | `{identifier (email or phone), password}` → `AuthResponse` |
| POST | `/refresh` | public | `{refreshToken}` → new `AuthResponse` (old token revoked) |
| POST | `/logout` | bearer | `{refreshToken}` → 204 |
| POST | `/logout-all` | bearer | → 204, every session revoked |
| POST | `/change-password` | bearer | `{currentPassword,newPassword}` → `AuthResponse` |
| GET | `/me` | bearer | → `UserResponse` |

`AuthResponse = {accessToken, tokenType:"Bearer", expiresIn, refreshToken, user}`.
Send `Authorization: Bearer <accessToken>` on protected calls. When you get a 401 with
`code: TOKEN_EXPIRED`, call `/refresh`.

### Search `/api/buses` (public)
| GET | Params / Response |
|---|---|
| `/search` | `source`, `destination`, `date=YYYY-MM-DD`, optional `busType`, `maxFare` → `[ScheduleSearchResponse]` with `availableSeats` |
| `/schedules/{id}/seats` | → `{decks:[{name, grid:[[SeatView or null]]}]}`; seat `status` = `AVAILABLE`/`LOCKED`/`BOOKED` |
| `/routes` | → all routes |

### Bookings `/api/bookings` (logged-in user; every lookup is limited to that user's own bookings)
| Method | Path | Notes |
|---|---|---|
| POST | `/lock` | `{scheduleId, seatNumbers:["L1","L2"]}` → **201** `{bookingId, lockExpiresAt, estimatedFare…}` |
| DELETE | `/{bookingId}/lock` | release early → 204 |
| POST | `/{bookingId}/confirm` | `{passengers:[{seatNumber,name,age,gender}], contactEmail, contactPhone, paymentToken}` → `BookingResponse` with **PNR** |
| GET | `/{bookingId}` · `/pnr/{pnr}` · `/my?page=0&size=20` | reads |
| POST | `/pnr/{pnr}/cancel` | refund: 75% if > 24 h before departure, 50% if 6–24 h, not allowed under 6 h |

### Operator `/api/operator` (role OPERATOR, only the operator's own data)
`POST/GET /buses` · `POST /schedules` · `GET /schedules?from=&to=` · `GET /schedules/{id}/manifest` · `POST /schedules/{id}/cancel` (full refunds)

### Admin `/api/admin` (role ADMIN)
`POST/GET /routes` · `POST/GET /operators` (creates company + operator login) · `PATCH /users/{id}/status` `{enabled}`

A full click-through sequence is in `api-requests.http`. Swagger UI is at `/swagger-ui.html` with the dev profile.

---

## 5. Concurrency: how double booking is prevented

```
lockSeats(scheduleId, seats)                    @Transactional
 ├─ SELECT … FROM schedules WHERE id=? FOR UPDATE   ← requests for the SAME bus queue here
 ├─ validate seats against the bus layout
 ├─ release this user's previous hold on the bus + any expired holds
 ├─ SELECT active claims for the requested seats   ← sees every committed claim
 ├─ none taken? INSERT booking + booked_seats (LOCKED, active_flag=TRUE)
 └─ COMMIT (releases the row lock)
```

1. **Pessimistic lock.** `ScheduleRepository.findByIdForUpdate` uses `PESSIMISTIC_WRITE` with a 5 s timeout. Check-then-insert is atomic per schedule, and different buses never block each other. On timeout the API returns `503 SERVICE_BUSY` instead of hanging.
2. **Database guarantee.** `UNIQUE(schedule_id, seat_number, active_flag)`: `active_flag` is TRUE while a seat is locked or booked and NULL once released. NULLs never collide in a unique index on either database, so at most one live claim can exist per seat. Released rows stay for history. If this constraint ever fires, the API returns `409 SEATS_UNAVAILABLE`.
3. **Payment outside locks.** `confirmBooking` runs in three steps:
   - a short transaction validates the booking and attaches passenger details;
   - the payment gateway is called with no database lock held;
   - a second short transaction confirms the booking and assigns the PNR.

   If the hold expired while the payment was processing, the charge is refunded automatically. Re-submitting a confirmation returns the same PNR without charging again.
4. **Lock first, then read.** Every change takes the schedule lock before it reads the booking's status, so the cleanup job can't change that status underneath it.
5. **Expiry.** Expired holds are released whenever anyone locks seats on that bus, and also by `SeatLockCleanupJob` every minute. Correctness never depends on the job.

`BookingConcurrencyTest` proves it: 12 threads lock seats 5 and 6 at the same instant, and exactly one succeeds.

---

## 6. Security checklist

| Area | What's implemented |
|---|---|
| Passwords | BCrypt cost 12. Policy: 8–72 characters with upper case, lower case, a digit and a symbol. Never logged or returned. |
| Tokens | HS256 JWT signed with a key of at least 256 bits. Access tokens last 15 minutes, carry no personal data, and include a `tv` (token version) claim. |
| Revocation | The token version is checked against the database on every request. Logout-all, a password change or disabling an account invalidates outstanding access tokens immediately. |
| Refresh tokens | 256-bit random values, stored only as SHA-256 hashes, single-use and rotated. Replaying an old one revokes all of that user's sessions (theft detection). |
| Brute force | Account lockout after 5 failures (15 minutes) plus a per-IP limit of 10 per minute on auth endpoints. Logins for unknown users run a dummy hash check, so response timing doesn't reveal whether an account exists. |
| Authorization | URL rules plus `@PreAuthorize` on controllers. Registration can't choose a role. Operator queries are limited to the operator's own data. Booking lookups are limited to the owner and return 404 rather than 403, so IDs can't be probed. |
| Input | Bean Validation on every DTO and query parameter. Prices are computed on the server; fares sent by the client are never trusted. |
| Errors | Uniform JSON with no stack traces, SQL or class names. Unexpected errors return an incident ID that matches the server log entry. |
| HTTP | Stateless with no session. HSTS, `X-Frame-Options: DENY`, a strict CSP on `/api/**`, `Referrer-Policy: no-referrer`, a Permissions-Policy and `Cache-Control: no-store`. CORS allows an explicit list of origins only. |
| Payments | Only a gateway token reaches the API; card data never does. Gateway charges use idempotency keys. |
| Secrets | Read from environment variables only. `prod` has no defaults. Swagger and seed data are off outside `dev`. |
| Container | Multi-stage build running on a JRE image as a non-root user. |

### Before going live
- Replace `MockPaymentGateway` with a real `PaymentGateway` (Razorpay, Stripe, …) and verify webhook signatures.
- With multiple instances, move rate limiting to Redis or the API gateway, and add ShedLock to the scheduled job.
- Add email/phone verification and password reset (OTP) if you need them. The React frontend already has those screens.
- Consider enabling `spring.jpa.hibernate.ddl-auto=validate` once you've confirmed the mappings against your database.

---

## 7. Connecting the React frontend
- Set `CORS_ALLOWED_ORIGINS` to the frontend origin, for example `http://localhost:5173`.
- Keep the access token in memory. Store the refresh token, and on any 401 with `TOKEN_EXPIRED` call `/api/auth/refresh` and retry.
- Map the flow:
  - "Select seats" → `POST /api/bookings/lock`; use the returned `lockExpiresAt` for the 10-minute timer.
  - Checkout → `POST /api/bookings/{id}/confirm`.
  - The seat map comes from `GET /api/buses/schedules/{id}/seats`.
