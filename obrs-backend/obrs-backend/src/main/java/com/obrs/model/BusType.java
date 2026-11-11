package com.obrs.model;

/** Bus categories. Each type has a default seat layout (see SeatLayoutService). */
public enum BusType {
    AC_SEATER(true, false),
    NON_AC_SEATER(false, false),
    AC_SLEEPER(true, true),
    NON_AC_SLEEPER(false, true),
    AC_SEMI_SLEEPER(true, false);

    private final boolean airConditioned;
    private final boolean sleeper;

    BusType(boolean airConditioned, boolean sleeper) {
        this.airConditioned = airConditioned;
        this.sleeper = sleeper;
    }

    public boolean isAirConditioned() { return airConditioned; }
    public boolean isSleeper() { return sleeper; }
}
