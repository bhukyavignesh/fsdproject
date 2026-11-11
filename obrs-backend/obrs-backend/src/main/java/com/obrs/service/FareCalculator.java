package com.obrs.service;

import com.obrs.config.AppProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;

/** All money is computed server-side with BigDecimal; client-sent prices are never trusted. */
@Component
public class FareCalculator {

    public record Fare(BigDecimal base, BigDecimal tax, BigDecimal total) { }

    private final BigDecimal taxRate;

    public FareCalculator(AppProperties props) {
        this.taxRate = props.booking().taxRate();
    }

    public Fare calculate(Collection<BigDecimal> seatFares) {
        BigDecimal base = seatFares.stream().reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal tax = base.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
        return new Fare(base, tax, base.add(tax));
    }
}
