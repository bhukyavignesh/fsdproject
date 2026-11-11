-- OBRS schema (PostgreSQL)

CREATE TABLE operators (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL UNIQUE,
    contact_email   VARCHAR(160) NOT NULL,
    phone           VARCHAR(20)  NOT NULL,
    rating          NUMERIC(2,1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE users (
    id                      BIGSERIAL PRIMARY KEY,
    name                    VARCHAR(100) NOT NULL,
    email                   VARCHAR(160) NOT NULL UNIQUE,
    phone                   VARCHAR(20)  NOT NULL UNIQUE,
    password_hash           VARCHAR(100) NOT NULL,
    role                    VARCHAR(20)  NOT NULL,
    operator_id             BIGINT REFERENCES operators(id),
    enabled                 BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts   INTEGER NOT NULL DEFAULT 0,
    locked_until            TIMESTAMP WITH TIME ZONE,
    token_version           INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE refresh_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE routes (
    id                          BIGSERIAL PRIMARY KEY,
    source_city                 VARCHAR(80) NOT NULL,
    destination_city            VARCHAR(80) NOT NULL,
    distance_km                 INTEGER NOT NULL,
    estimated_duration_minutes  INTEGER NOT NULL,
    CONSTRAINT uk_route UNIQUE (source_city, destination_city)
);

CREATE TABLE buses (
    id                   BIGSERIAL PRIMARY KEY,
    operator_id          BIGINT NOT NULL REFERENCES operators(id),
    bus_name             VARCHAR(120) NOT NULL,
    registration_number  VARCHAR(20)  NOT NULL UNIQUE,
    bus_type             VARCHAR(30)  NOT NULL,
    total_seats          INTEGER NOT NULL,
    layout_config        VARCHAR(2000) NOT NULL,
    active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE schedules (
    id              BIGSERIAL PRIMARY KEY,
    bus_id          BIGINT NOT NULL REFERENCES buses(id),
    route_id        BIGINT NOT NULL REFERENCES routes(id),
    departure_time  TIMESTAMP NOT NULL,
    arrival_time    TIMESTAMP NOT NULL,
    base_fare       NUMERIC(10,2) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_schedule_times CHECK (arrival_time > departure_time)
);
CREATE INDEX idx_schedules_route_departure ON schedules(route_id, departure_time);
CREATE INDEX idx_schedules_bus_departure ON schedules(bus_id, departure_time);

CREATE TABLE bookings (
    id                 BIGSERIAL PRIMARY KEY,
    pnr_number         VARCHAR(12) UNIQUE,
    user_id            BIGINT NOT NULL REFERENCES users(id),
    schedule_id        BIGINT NOT NULL REFERENCES schedules(id),
    base_amount        NUMERIC(10,2) NOT NULL,
    tax_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount       NUMERIC(10,2) NOT NULL,
    refund_amount      NUMERIC(10,2),
    booking_status     VARCHAR(20) NOT NULL,
    contact_email      VARCHAR(160),
    contact_phone      VARCHAR(20),
    payment_reference  VARCHAR(80),
    lock_expires_at    TIMESTAMP WITH TIME ZONE,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at       TIMESTAMP WITH TIME ZONE,
    cancelled_at       TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_bookings_user ON bookings(user_id, created_at);
CREATE INDEX idx_bookings_pending_expiry ON bookings(booking_status, lock_expires_at);

-- active_flag is TRUE while a seat is LOCKED/BOOKED and NULL once RELEASED.
-- NULLs never collide in a UNIQUE index, so this constraint allows at most ONE
-- live claim per (schedule, seat) while keeping released rows for history.
CREATE TABLE booked_seats (
    id                BIGSERIAL PRIMARY KEY,
    booking_id        BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    schedule_id       BIGINT NOT NULL REFERENCES schedules(id),
    seat_number       VARCHAR(8) NOT NULL,
    fare              NUMERIC(10,2) NOT NULL,
    passenger_name    VARCHAR(100),
    passenger_age     INTEGER,
    passenger_gender  VARCHAR(10),
    seat_status       VARCHAR(10) NOT NULL,
    active_flag       BOOLEAN,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_seat_claim UNIQUE (schedule_id, seat_number, active_flag),
    CONSTRAINT ck_active_flag CHECK (active_flag IS NULL OR active_flag = TRUE)
);
CREATE INDEX idx_booked_seats_booking ON booked_seats(booking_id);
