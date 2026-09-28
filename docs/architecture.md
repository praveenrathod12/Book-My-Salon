# Architecture

## High-level

```
┌─────────────────────┐        HTTP / JSON        ┌──────────────────────┐
│   Angular frontend  │  ───────────────────────► │  ASP.NET Core Web API │
│  (Vercel / static)  │  ◄─────────────────────── │      (controllers)    │
└─────────────────────┘                           └───────────┬──────────┘
        │                                                      │
        │ demo mode: local mock data (no backend)              │ service layer
        ▼                                                      ▼
   localStorage                                        Entity Framework Core
                                                              │
                                                              ▼
                                                          SQL Server
```

The frontend is **fully decoupled** from the backend. It can run in two modes,
selected at build time via `environment.dataMode`:

- **`api`** — all data comes from the ASP.NET Core API (full-stack).
- **`demo`** — all data comes from an in-browser mock store (public demo, no backend).

Both modes are served by the *same* UI code. The UI depends only on the
abstract `DataService`; a provider swaps in `ApiDataService` or
`DemoDataService` depending on the environment.

## Backend layering

```
Controllers  ──►  Services (interfaces)  ──►  AppDbContext (EF Core)  ──►  SQL Server
    │                    │
 thin, no           business logic,
 business           validation, auth
 logic              ownership checks
```

- **Controllers** — parse requests, extract the current user from the JWT, delegate to services, return DTOs. No business logic.
- **Services** — all business rules: availability calculation, double-booking prevention, ownership enforcement, validation.
- **DTOs** — request/response shapes; entities are never returned directly.
- **Middleware** — `ExceptionMiddleware` maps typed exceptions to consistent JSON error responses.

## Core feature: dynamic availability

`AvailabilityService` computes real slots (not hardcoded) from:

1. Salon business hours for the day.
2. Each capable barber's weekly schedule.
3. Barber active status.
4. Barber date-specific leave.
5. Barber service capability (`BarberService`).
6. Existing non-cancelled appointments (overlap check).
7. Service duration (a slot must fit end-to-end).

Slots are generated on a 30-minute grid; `availableBarbers` counts how many
barbers are free for each slot. A slot is `Fully Booked` when that count is 0.

## Double-booking prevention

`AppointmentBookingService.CreateAsync` (and reschedule) run inside a
**Serializable** database transaction. Availability is re-checked immediately
before insert, so two concurrent requests for the last free barber cannot both
succeed — the loser receives **409 Conflict** with a clear message. The
frontend re-fetches availability when it sees that conflict.

## Authentication & authorization

- JWT access tokens (HMAC-SHA256) + refresh tokens. Passwords hashed with BCrypt.
- Role claim (`CUSTOMER` / `SALON_OWNER`) drives `[Authorize(Roles = ...)]`.
- **Resource ownership** is enforced server-side: an owner can only touch their
  own salon/barbers/services/appointments; a customer only their own bookings.

## Frontend structure

```
src/app/
├── core/         guards, interceptors, services, models, data (abstraction + impls)
├── shared/       reusable components (spinner, empty-state, status-badge) and pipes
├── features/     landing, auth, salons, bookings, salon-owner, profile
├── layout/       navbar, footer, toast-host
└── app.routes.ts lazy-loaded, role-guarded routes
```
