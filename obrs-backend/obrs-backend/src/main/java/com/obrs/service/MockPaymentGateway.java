package com.obrs.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Development stand-in for a real provider. Any token succeeds except tokens
 * starting with "fail" (to test the decline path). Replace with a real
 * implementation of {@link PaymentGateway} for production.
 */
@Component
public class MockPaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(MockPaymentGateway.class);

    @Override
    public PaymentResult charge(String idempotencyKey, BigDecimal amount, String paymentToken) {
        if (paymentToken.startsWith("fail")) {
            return new PaymentResult(false, null, "Card declined");
        }
        String ref = "PAY-" + UUID.randomUUID().toString().substring(0, 18).toUpperCase();
        log.info("Mock charge {} for {} -> {}", idempotencyKey, amount, ref);
        return new PaymentResult(true, ref, null);
    }

    @Override
    public void refund(String paymentReference, BigDecimal amount) {
        log.info("Mock refund {} of {}", paymentReference, amount);
    }
}
