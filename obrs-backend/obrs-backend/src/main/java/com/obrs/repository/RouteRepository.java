package com.obrs.repository;

import com.obrs.model.Route;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RouteRepository extends JpaRepository<Route, Long> {
    Optional<Route> findBySourceCityIgnoreCaseAndDestinationCityIgnoreCase(String source, String destination);
}
