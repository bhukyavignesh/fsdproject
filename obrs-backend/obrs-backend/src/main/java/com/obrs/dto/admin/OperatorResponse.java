package com.obrs.dto.admin;

import com.obrs.model.Operator;

import java.math.BigDecimal;

public record OperatorResponse(Long id, String name, String contactEmail, String phone, BigDecimal rating) {
    public static OperatorResponse from(Operator o) {
        return new OperatorResponse(o.getId(), o.getName(), o.getContactEmail(), o.getPhone(), o.getRating());
    }
}
