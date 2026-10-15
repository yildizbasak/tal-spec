package com.yalindor.tal_backend.service;

import com.yalindor.tal_backend.model.HealthStatus;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Gathers the application health information.
 * Keeps business logic out of the controller layer.
 */
@Service
public class HealthService {

	private final Environment environment;

	public HealthService(Environment environment) {
		this.environment = environment;
	}

	public HealthStatus getStatus() {
		String name = environment.getProperty("spring.application.name", "tal-backend");
		return new HealthStatus("UP", name, Instant.now());
	}
}
