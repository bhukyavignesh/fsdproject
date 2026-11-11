-- OBRS schema (MySQL 8+)

CREATE TABLE operators (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(120) NOT NULL UNIQUE,
    contact_email   VARCHAR(160) NOT NULL,
    phone           VARCHAR(20)  NOT NULL,
    rating          DECIMAL(2,1) NOT NULL DEFAULT 0,
    created_at      DATETIME(6) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE users (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                    VARCHAR(100) NOT NULL,
    email                   VARCHAR(160) NOT NULL UNIQUE,
    phone                   VARCHAR(20)  NOT NULL UNIQUE,
    password_hash           VARCHAR(100) NOT NULL,
    role                    VARCHAR(20)  NOT NULL,
    operator_id             BIGINT,
    enabled                 BIT(1) NOT NULL DEFAULT 1,
    failed_login_attempts   INT NOT NULL DEFAULT 0,
    locked_until            DATETIME(6),
    token_version           INT NOT NULL DEFAULT 0,
    created_at              DATETIME(6) NOT NULL,
    updated_at              DATETIME(6) NOT NULL,
    CONSTRAINT fk_users_operator FOREIGN KEY (operator_id) REFERENCES operators(id)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  DATETIME(6) NOT NULL,
    revoked     BIT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME(6) NOT NULL,
    INDEX idx_refresh_tokens_user (user_id),
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE routes (
    id                          BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_city                 VARCHAR(80) NOT NULL,
    destination_city            VARCHAR(80) NOT NULL,
    distance_km                 INT NOT NULL,
    estimated_duration_minutes  INT NOT NULL,
    CONSTRAINT uk_route UNIQUE (source_city, destination_city)
) ENGINE=InnoDB;

CREATE TABLE buses (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    operator_id          BIGINT NOT NULL,
    bus_name             VARCHAR(120) NOT NULL,
    registration_number  VARCHAR(20)  NOT NULL UNIQUE,
    bus_type             VARCHAR(30)  NOT NULL,
    total_seats          INT NOT NULL,
    layout_config        VARCHAR(2000) NOT NULL,
    active               BIT(1) NOT NULL DEFAULT 1,
    created_at           DATETIME(6) NOT NULL,
    CONSTRAINT fk_buses_operator FOREIGN KEY (operator_id) REFERENCES operators(id)
) ENGINE=InnoDB;

CREATE TABLE schedules (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    bus_id          BIGINT NOT NULL,
    route_id        BIGINT NOT NULL,
    departure_time  DATETIME(6) NOT NULL,
    arrival_time    DATETIME(6) NOT NULL,
    base_fare       DECIMAL(10,2) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      DATETIME(6) NOT NULL,
    INDEX idx_schedules_route_departure (route_id, departure_time),
    INDEX idx_schedules_bus_departure (bus_id, departure_time),
    CONSTRAINT fk_schedules_bus FOREIGN KEY (bus_id) REFERENCES buses(id),
    CONSTRAINT fk_schedules_route FOREIGN KEY (route_id) REFERENCES routes(id),
    CONSTRAINT ck_schedule_times CHECK (arrival_time > departure_time)
) ENGINE=InnoDB;

CREATE TABLE bookings (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    pnr_number         VARCHAR(12) UNIQUE,
    user_id            BIGINT NOT NULL,
    schedule_id        BIGINT NOT NULL,
    base_amount        DECIMAL(10,2) NOT NULL,
    tax_amount         DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount       DECIMAL(10,2) NOT NULL,
    refund_amount      DECIMAL(10,2),
    booking_status     VARCHAR(20) NOT NULL,
    contact_email      VARCHAR(160),
    contact_phone      VARCHAR(20),
    payment_reference  VARCHAR(80),
    lock_expires_at    DATETIME(6),
    created_at         DATETIME(6) NOT NULL,
    confirmed_at       DATETIME(6),
    cancelled_at       DATETIME(6),
    INDEX idx_bookings_user (user_id, created_at),
    INDEX idx_bookings_pending_expiry (booking_status, lock_expires_at),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_bookings_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id)
) ENGINE=InnoDB;

-- active_flag = 1 while LOCKED/BOOKED, NULL once RELEASED (NULLs never collide in a UNIQUE index).
CREATE TABLE booked_seats (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id        BIGINT NOT NULL,
    schedule_id       BIGINT NOT NULL,
    seat_number       VARCHAR(8) NOT NULL,
    fare              DECIMAL(10,2) NOT NULL,
    passenger_name    VARCHAR(100),
    passenger_age     INT,
    passenger_gender  VARCHAR(10),
    seat_status       VARCHAR(10) NOT NULL,
    active_flag       BIT(1),
    created_at        DATETIME(6) NOT NULL,
    INDEX idx_booked_seats_booking (booking_id),
    CONSTRAINT uk_seat_claim UNIQUE (schedule_id, seat_number, active_flag),
    CONSTRAINT fk_booked_seats_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_booked_seats_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id)
) ENGINE=InnoDB;
