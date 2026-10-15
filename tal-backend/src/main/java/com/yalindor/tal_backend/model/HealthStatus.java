package com.yalindor.tal_backend.model;

import java.time.Instant;

/**
 * Simple health representation returned by the {@code /health} endpoint.
 */
public record HealthStatus(String status, String application, Instant startedAt) {
}
