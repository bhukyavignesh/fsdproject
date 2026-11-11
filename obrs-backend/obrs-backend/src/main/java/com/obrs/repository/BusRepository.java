package com.obrs.repository;

import com.obrs.model.Bus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BusRepository extends JpaRepository<Bus, Long> {
    List<Bus> findByOperatorIdOrderByBusName(Long operatorId);
    /** Ownership-scoped lookup: prevents an operator from touching another operator's bus. */
    Optional<Bus> findByIdAndOperatorId(Long id, Long operatorId);
    boolean existsByRegistrationNumberIgnoreCase(String registrationNumber);
}
