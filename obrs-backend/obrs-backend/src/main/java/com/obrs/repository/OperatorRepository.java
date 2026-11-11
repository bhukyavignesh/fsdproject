package com.obrs.repository;

import com.obrs.model.Operator;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OperatorRepository extends JpaRepository<Operator, Long> {
    boolean existsByNameIgnoreCase(String name);
}
