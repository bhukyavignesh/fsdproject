package com.obrs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Online Bus Reservation System REST API.
 */
@SpringBootApplication
@EnableScheduling
@ConfigurationPropertiesScan
public class ObrsApplication {
    public static void main(String[] args) {
        SpringApplication.run(ObrsApplication.class, args);
    }
}
