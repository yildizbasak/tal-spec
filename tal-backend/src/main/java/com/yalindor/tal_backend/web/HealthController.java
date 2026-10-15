package com.yalindor.tal_backend.web;

import com.yalindor.tal_backend.model.HealthStatus;
import com.yalindor.tal_backend.service.HealthService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lightweight health check endpoint (no actuator dependency required).
 */
@RestController
public class HealthController {

	private final HealthService healthService;

	public HealthController(HealthService healthService) {
		this.healthService = healthService;
	}

	@GetMapping("/health")
	public HealthStatus health() {
		return healthService.getStatus();
	}
}
