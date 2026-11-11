package com.obrs.service;

import com.obrs.repository.BookingRepository;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * 10-character PNRs from an unambiguous alphabet (no 0/O, 1/I/L), generated
 * with SecureRandom so they cannot be guessed or enumerated. ~2^48 combinations;
 * the DB unique index is the final guarantee.
 */
@Component
public class PnrGenerator {

    private static final char[] ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();
    private static final int LENGTH = 10;
    private final SecureRandom random = new SecureRandom();
    private final BookingRepository bookingRepository;

    public PnrGenerator(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    public String next() {
        for (int attempt = 0; attempt < 5; attempt++) {
            String candidate = random();
            if (!bookingRepository.existsByPnrNumber(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not generate a unique PNR");
    }

    private String random() {
        char[] out = new char[LENGTH];
        for (int i = 0; i < LENGTH; i++) {
            out[i] = ALPHABET[random.nextInt(ALPHABET.length)];
        }
        return new String(out);
    }
}
