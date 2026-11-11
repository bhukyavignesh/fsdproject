package com.obrs.service;

import java.math.BigDecimal;

/**
 * Abstraction over a payment provider (Razorpay, Stripe, PayU...). The API only
 * ever receives a one-time token from the provider's client SDK, never card data,
 * which keeps this service out of PCI-DSS card-data scope.
 */
public interface PaymentGateway {

    record PaymentResult(boolean success, String reference, String failureReason) { }

    /** @param idempotencyKey ensures retries never double-charge */
    PaymentResult charge(String idempotencyKey, BigDecimal amount, String paymentToken);

    void refund(String paymentReference, BigDecimal amount);
}
