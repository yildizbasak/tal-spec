package com.mixhizor.tal_backend.controllers;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
public class HealthCheck {

    @GetMapping("/health")
    public String health() {
        return "OK";
    }

}
