# tal-backend

TAL (Transmission Abstraction Layer) backend service. Spring Boot + Java 21.

## Tech Stack

- **Spring Boot 4.1.1** / **Java 21**
- **Spring MVC** (`spring-boot-starter-webmvc`)
- **Validation** (`spring-boot-starter-validation`)
- **Lombok**
- **Maven Wrapper** (`./mvnw`)

## Project Structure (layered)

```
src/main/java/com/yalindor/tal_backend/
├── TalBackendApplication.java   # Spring Boot entry point
├── web/                         # REST controllers (HTTP layer)
├── service/                     # business logic
├── model/                       # domain models / DTOs
├── repository/                  # data access
├── config/                      # application configuration
└── exception/                   # exceptions & error handling
```

`src/main/resources/` holds `application.properties` and (future) DB migrations
under `db/migration`.

## Run

```bash
./mvnw spring-boot:run
```

Server starts on `http://localhost:8080`.

## Health Check

```bash
curl http://localhost:8080/health
```

Returns a lightweight JSON status (no actuator dependency required):

```json
{
  "status": "UP",
  "application": "tal-backend",
  "startedAt": "2025-01-01T10:00:00.000Z"
}
```

## Build & Test

```bash
./mvnw clean test
./mvnw clean package
```
