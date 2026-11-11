package com.obrs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.obrs.model.Role;
import com.obrs.model.Schedule;
import com.obrs.model.User;
import com.obrs.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiSecurityAndBookingFlowTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired TestData testData;

    // ---------------------------------------------------------------- auth

    @Test
    void registerLoginRefreshRotationAndReuseDetection() throws Exception {
        String body = """
                {"name":"Gopal Test","email":"gopal.test@example.com","phone":"9811122233","password":"Strong@Pass1"}""";
        JsonNode reg = read(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body), 201);
        assertThat(reg.at("/user/role").asText()).isEqualTo("PASSENGER");

        // duplicate email
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EMAIL_ALREADY_REGISTERED"));

        // login by phone
        JsonNode login = read(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"identifier\":\"9811122233\",\"password\":\"Strong@Pass1\"}"), 200);
        String access = login.get("accessToken").asText();
        String refresh1 = login.get("refreshToken").asText();

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value("gopal.test@example.com"));

        // rotate
        JsonNode rotated = read(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refresh1 + "\"}"), 200);
        String refresh2 = rotated.get("refreshToken").asText();
        assertThat(refresh2).isNotEqualTo(refresh1);

        // replay the old one => theft detection revokes everything
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content("{\"refreshToken\":\"" + refresh1 + "\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content("{\"refreshToken\":\"" + refresh2 + "\"}"))
                .andExpect(status().isUnauthorized());
        // and existing access tokens stop working (token version bumped)
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("TOKEN_REVOKED"));
    }

    @Test
    void weakPasswordAndRoleInjectionAreRejected() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X Y\",\"email\":\"weak@example.com\",\"phone\":\"9811122299\",\"password\":\"password\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.details.fields.password").exists());

        // Extra "role" field is ignored: still a passenger.
        JsonNode reg = read(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Sneaky\",\"email\":\"sneaky@example.com\",\"phone\":\"9811122298\",\"password\":\"Strong@Pass1\",\"role\":\"ADMIN\"}"), 201);
        assertThat(reg.at("/user/role").asText()).isEqualTo("PASSENGER");
    }

    @Test
    void accountLocksAfterRepeatedFailures() throws Exception {
        User u = testData.user(Role.PASSENGER);
        String bad = "{\"identifier\":\"" + u.getEmail() + "\",\"password\":\"Wrong@Pass1\"}";
        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(bad))
                    .andExpect(status().isUnauthorized());
        }
        // even the right password is refused while locked
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"identifier\":\"" + u.getEmail() + "\",\"password\":\"Passw0rd!\"}"))
                .andExpect(status().isLocked()).andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
    }

    @Test
    void roleBasedAccessIsEnforced() throws Exception {
        mvc.perform(post("/api/bookings/lock").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("TOKEN_INVALID"));

        String passenger = tokenFor(testData.user(Role.PASSENGER));
        mvc.perform(get("/api/operator/buses").header("Authorization", "Bearer " + passenger)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/operators").header("Authorization", "Bearer " + passenger)).andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------- booking

    @Test
    void fullBookingFlowAndOwnershipChecks() throws Exception {
        Schedule schedule = testData.schedule();
        String alice = tokenFor(testData.user(Role.PASSENGER));
        String bob = tokenFor(testData.user(Role.PASSENGER));

        // public search finds it
        LocalDate date = schedule.getDepartureTime().toLocalDate();
        mvc.perform(get("/api/buses/search").param("source", schedule.getRoute().getSourceCity())
                        .param("destination", schedule.getRoute().getDestinationCity()).param("date", date.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].scheduleId").value(schedule.getId()))
                .andExpect(jsonPath("$[0].availableSeats").value(40));

        // lock
        JsonNode lock = read(post("/api/bookings/lock").header("Authorization", "Bearer " + alice).contentType(MediaType.APPLICATION_JSON)
                .content("{\"scheduleId\":" + schedule.getId() + ",\"seatNumbers\":[\"1\",\"2\"]}"), 201);
        long bookingId = lock.get("bookingId").asLong();

        // seat map shows them as locked; bob cannot take them
        mvc.perform(get("/api/buses/schedules/" + schedule.getId() + "/seats"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.availableSeats").value(38));
        mvc.perform(post("/api/bookings/lock").header("Authorization", "Bearer " + bob).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scheduleId\":" + schedule.getId() + ",\"seatNumbers\":[\"2\",\"3\"]}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SEATS_UNAVAILABLE"));

        // bob cannot see or confirm alice's booking (404, not 403: no id probing)
        mvc.perform(get("/api/bookings/" + bookingId).header("Authorization", "Bearer " + bob)).andExpect(status().isNotFound());

        String confirm = """
                {"passengers":[{"seatNumber":"1","name":"Alice A","age":30,"gender":"FEMALE"},
                               {"seatNumber":"2","name":"Ravi K","age":34,"gender":"MALE"}],
                 "contactEmail":"alice@example.com","contactPhone":"9811100011","paymentToken":"tok_test_ok"}""";
        mvc.perform(post("/api/bookings/" + bookingId + "/confirm").header("Authorization", "Bearer " + bob)
                .contentType(MediaType.APPLICATION_JSON).content(confirm)).andExpect(status().isNotFound());

        // declined payment keeps the booking pending
        mvc.perform(post("/api/bookings/" + bookingId + "/confirm").header("Authorization", "Bearer " + alice)
                        .contentType(MediaType.APPLICATION_JSON).content(confirm.replace("tok_test_ok", "fail_card")))
                .andExpect(status().isPaymentRequired());

        JsonNode booked = read(post("/api/bookings/" + bookingId + "/confirm").header("Authorization", "Bearer " + alice)
                .contentType(MediaType.APPLICATION_JSON).content(confirm), 200);
        assertThat(booked.get("bookingStatus").asText()).isEqualTo("CONFIRMED");
        String pnr = booked.get("pnrNumber").asText();
        assertThat(pnr).matches("^[2-9A-HJKMNP-Z]{10}$");
        assertThat(booked.get("totalAmount").decimalValue()).isEqualByComparingTo("1050.00"); // 2 x 500 + 5% tax

        // idempotent re-submit returns the same PNR
        JsonNode again = read(post("/api/bookings/" + bookingId + "/confirm").header("Authorization", "Bearer " + alice)
                .contentType(MediaType.APPLICATION_JSON).content(confirm), 200);
        assertThat(again.get("pnrNumber").asText()).isEqualTo(pnr);

        // cancel => seats return to the pool
        mvc.perform(post("/api/bookings/pnr/" + pnr + "/cancel").header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk()).andExpect(jsonPath("$.bookingStatus").value("CANCELLED"))
                .andExpect(jsonPath("$.refundAmount").value(787.5));
        mvc.perform(get("/api/buses/schedules/" + schedule.getId() + "/seats"))
                .andExpect(jsonPath("$.availableSeats").value(40));
    }

    // ------------------------------------------------------------- helpers

    private String tokenFor(User u) throws Exception {
        return read(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"identifier\":\"" + u.getEmail() + "\",\"password\":\"Passw0rd!\"}"), 200).get("accessToken").asText();
    }

    private JsonNode read(org.springframework.test.web.servlet.RequestBuilder req, int expectedStatus) throws Exception {
        ResultActions res = mvc.perform(req).andExpect(status().is(expectedStatus));
        return json.readTree(res.andReturn().getResponse().getContentAsString());
    }
}
