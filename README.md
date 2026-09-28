# SalonHub — Full-Stack Salon Booking Application

A complete salon discovery and appointment-booking platform. Customers find salons, see **live weekly availability**, and book in seconds. Salon owners manage barbers, services, schedules and appointments from a clean dashboard.

Built strictly with **Angular + ASP.NET Core Web API + Entity Framework Core + SQL Server**.

> **Live Demo:** https://book-my-salon-inky.vercel.app/
>
> The live site runs in **demo mode** (local mock data, no backend required). Log in with the demo accounts below to explore both the customer and salon-owner experiences.

---

## Table of contents

- [Project overview](#project-overview)
- [Problem statement](#problem-statement)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Database design](#database-design)
- [API documentation](#api-documentation)
- [Project structure](#project-structure)
- [Backend setup](#backend-setup)
- [Database setup](#database-setup)
- [Frontend setup](#frontend-setup)
- [Environment variables](#environment-variables)
- [Demo accounts](#demo-accounts)
- [Running the application](#running-the-application)
- [Full-stack vs demo mode](#full-stack-vs-demo-mode)
- [Vercel deployment](#vercel-deployment)
- [Backend deployment](#backend-deployment)
- [Future improvements](#future-improvements)

---

## Project overview

Customers often visit a salon without knowing whether it is busy, then wait a
long time even though a nearby salon has free capacity. SalonHub solves this
with a **dynamic availability engine** that shows exactly which time slots are
open across the upcoming week, per service, based on real barber schedules and
existing bookings.

## Problem statement

- No visibility into how busy a salon is before arriving.
- Walk-in waiting even when capacity exists nearby.
- Owners lack a simple tool to manage barbers, services and appointments.

## Features

### Customer

- Register / login / logout, view profile
- Search and browse salons (by name / city)
- View salon details: description, hours, services, prices, barbers
- **View weekly availability** per service (real, computed slots)
- Book an appointment, view confirmation with booking ID
- View bookings (upcoming / history), booking details
- Cancel and reschedule eligible appointments

### Salon owner

- Register / login, create and update salon profile
- Configure business hours (open/close/closed per day)
- Add / edit barbers, activate / deactivate them
- Configure barber weekly schedules and date-specific leave
- Assign services to barbers (barber–service capability)
- Add / edit services, activate / deactivate, set price & duration
- View & manage appointments (complete / no-show / cancel)
- Dashboard with daily schedule and statistics

### Core

- **Dynamic slot availability** from salon hours + barber schedule + active status + leave + service capability + existing bookings + service duration
- **Double-booking prevention** with database transactions and server-side re-checks (`409 Conflict`)
- Role-based authorization + resource-ownership checks
- Global error handling with consistent JSON responses
- Swagger/OpenAPI with JWT support
- Responsive UI (desktop / tablet / mobile)

## Technology stack

| Layer     | Technology                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | Angular 19, TypeScript, RxJS, Angular Router, Reactive Forms, HttpClient, CSS3 |
| Backend   | ASP.NET Core Web API, C#                                          |
| ORM / DB  | Entity Framework Core, SQL Server                                 |
| Auth      | JWT (access + refresh), BCrypt password hashing                  |
| Docs      | Swagger / OpenAPI                                                 |

No other frameworks or infrastructure are used.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for details and diagrams.

```
Angular Frontend  ──HTTP/JSON──►  ASP.NET Core Web API  ──►  EF Core  ──►  SQL Server
```

The Angular app is independently deployable (Vercel) and can run without the
backend in **demo mode** using local mock data.

## Database design

See [`database/README.md`](database/README.md). Entities: `User`, `Salon`,
`Barber`, `Service`, `BarberService`, `SalonBusinessHour`, `BarberSchedule`,
`BarberLeave`, `Appointment`.

## API documentation

Base URL: `/api`. Full interactive docs at `/swagger` when the backend runs in Development.

### Auth
| Method | Route                     | Auth | Description                |
| ------ | ------------------------- | ---- | -------------------------- |
| POST   | `/api/auth/register`      | —    | Register customer or owner |
| POST   | `/api/auth/login`         | —    | Login, returns tokens      |
| POST   | `/api/auth/refresh-token` | —    | Exchange refresh token     |
| GET    | `/api/auth/profile`       | ✔   | Current user profile       |

### Salons
| Method | Route                                   | Auth  | Description             |
| ------ | --------------------------------------- | ----- | ----------------------- |
| GET    | `/api/salons?search=&city=`             | —     | List / search salons    |
| GET    | `/api/salons/{id}`                      | —     | Salon details           |
| GET    | `/api/salons/mine`                      | Owner | The owner's salon        |
| POST   | `/api/salons`                           | Owner | Create salon            |
| PUT    | `/api/salons/{id}`                      | Owner | Update salon            |
| GET    | `/api/salons/{id}/business-hours`       | —     | Business hours          |
| PUT    | `/api/salons/{id}/business-hours`       | Owner | Update business hours   |
| GET    | `/api/salons/{salonId}/services`        | —     | Services for a salon    |
| GET    | `/api/salons/{salonId}/barbers`         | —     | Barbers for a salon     |
| POST   | `/api/salons/{salonId}/barbers`         | Owner | Add barber              |
| GET    | `/api/salons/{salonId}/availability?serviceId=&startDate=&endDate=` | — | **Weekly availability** |

### Services
| Method | Route                        | Auth  |
| ------ | ---------------------------- | ----- |
| POST   | `/api/services`              | Owner |
| PUT    | `/api/services/{id}`         | Owner |
| PATCH  | `/api/services/{id}/status`  | Owner |
| DELETE | `/api/services/{id}`         | Owner |

### Barbers
| Method | Route                             | Auth  |
| ------ | --------------------------------- | ----- |
| GET    | `/api/barbers/{id}`               | —     |
| PUT    | `/api/barbers/{id}`               | Owner |
| PATCH  | `/api/barbers/{id}/status`        | Owner |
| PUT    | `/api/barbers/{id}/schedule`      | Owner |
| POST   | `/api/barbers/{id}/leaves`        | Owner |
| DELETE | `/api/barbers/{id}/leaves/{leaveId}` | Owner |

### Appointments
| Method | Route                              | Auth     | Description                    |
| ------ | ---------------------------------- | -------- | ------------------------------ |
| GET    | `/api/appointments?status=&date=`  | ✔       | Customer's or owner's list      |
| GET    | `/api/appointments/{id}`           | ✔       | Details                        |
| POST   | `/api/appointments`                | Customer | Book (double-booking-safe)     |
| PUT    | `/api/appointments/{id}/reschedule`| Customer | Reschedule                     |
| PATCH  | `/api/appointments/{id}/cancel`    | ✔       | Cancel                         |
| PATCH  | `/api/appointments/{id}/status`    | Owner    | Complete / no-show / cancel    |

### Owner
| Method | Route                   | Auth  |
| ------ | ----------------------- | ----- |
| GET    | `/api/owner/dashboard`  | Owner |
| GET    | `/api/owner/salon`      | Owner |

Error responses use a consistent shape:

```json
{ "success": false, "message": "The selected time slot is no longer available.", "statusCode": 409 }
```

## Project structure

```
Barber-application/
├── frontend/     # Angular application (Vercel-deployable)
├── backend/      # ASP.NET Core Web API + EF Core
├── database/     # Database documentation
├── docs/         # Architecture documentation
└── README.md
```

## Backend setup

Prerequisites: **.NET SDK 8+** (built and tested on .NET 10), **SQL Server** (LocalDB, Express, or full).

```bash
cd backend
dotnet restore
dotnet build
```

Configure the connection string in `backend/appsettings.Development.json`
(`ConnectionStrings:DefaultConnection`). The default targets LocalDB:

```
Server=(localdb)\MSSQLLocalDB;Database=SalonBookingDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True
```

## Database setup

```bash
cd backend
dotnet tool install --global dotnet-ef   # once
dotnet ef database update
```

The API also auto-migrates and seeds on startup (see `Database:AutoMigrate`).
After setup the database contains demo accounts, salons, barbers, services and
sample appointments so it is usable immediately.

## Frontend setup

Prerequisites: **Node 18+** (tested on Node 22).

```bash
cd frontend
npm install
```

## Environment variables

### Backend (`appsettings.json` / environment)

| Key                                | Description                          |
| ---------------------------------- | ------------------------------------ |
| `ConnectionStrings:DefaultConnection` | SQL Server connection string      |
| `Jwt:Secret`                       | JWT signing key (≥ 32 chars)         |
| `Jwt:Issuer` / `Jwt:Audience`      | Token issuer / audience              |
| `Cors:AllowedOrigins`              | Array of allowed frontend origins    |

> Do not commit real secrets. Use user-secrets or environment variables in production.

### Frontend (`src/environments/*`)

| File                          | dataMode | apiUrl                          |
| ----------------------------- | -------- | ------------------------------- |
| `environment.ts`              | `demo`   | (local dev default)             |
| `environment.development.ts`  | `api`    | `http://localhost:5095/api`     |
| `environment.production.ts`   | `api`    | `https://YOUR-BACKEND-URL/api`  |
| `environment.demo.ts`         | `demo`   | (none — mock data)              |

No localhost URLs are hardcoded in services; everything reads `environment.apiUrl`.

## Demo accounts

Shown on the login page and seeded in the backend.

| Role     | Email               | Password   |
| -------- | ------------------- | ---------- |
| Customer | `customer@demo.com` | `Demo@123` |
| Owner    | `owner@demo.com`    | `Demo@123` |

## Running the application

### Full-stack (Angular + API + SQL Server)

```bash
# Terminal 1 — backend
cd backend
dotnet run          # → http://localhost:5095 (Swagger at /swagger)

# Terminal 2 — frontend (API mode)
cd frontend
npm run start:api   # → http://localhost:4200
```

### Demo only (no backend)

```bash
cd frontend
npm run start:demo  # → http://localhost:4200, uses local mock data
```

## Full-stack vs demo mode

The same UI runs against either a real backend or local mock data, chosen by
`environment.dataMode`. Components depend only on an abstract `DataService`;
`ApiDataService` or `DemoDataService` is provided automatically. In full-stack
mode every action hits the API (no simulated responses). In demo mode the
in-browser store fully mirrors the availability and double-booking logic, so the
public site works even when no backend is hosted.

## Vercel deployment

The frontend deploys to Vercel independently. `frontend/vercel.json` is
preconfigured for the **demo** build and SPA routing:

```json
{
  "buildCommand": "npm run build:demo",
  "outputDirectory": "dist/frontend/browser",
  "framework": null,
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Steps:

1. Import the repository into Vercel and set the **Root Directory** to `frontend`.
2. Vercel reads `vercel.json` automatically. Output directory is `dist/frontend/browser`.
3. Deploy. The `rewrites` rule means refreshing routes like `/customer/bookings`, `/salons/1` or `/owner/dashboard` does **not** 404.

To deploy a **full-stack** frontend instead:

1. Set `apiUrl` in `src/environments/environment.production.ts` to your hosted API.
2. Change `buildCommand` in `vercel.json` to `npm run build:prod`.
3. Add your Vercel domain to the backend `Cors:AllowedOrigins`.

## Backend deployment

The API is independently deployable to any host that runs .NET and can reach a
SQL Server instance (Azure App Service, a VM, etc.). Set the connection string,
`Jwt:Secret`, and `Cors:AllowedOrigins` via environment variables/app settings.
Run migrations with `dotnet ef database update` or rely on startup auto-migrate.

## Future improvements

- Salon photos / gallery and customer reviews
- Email / SMS notifications and reminders
- Owner analytics charts and revenue reports
- Map-based nearby search using latitude/longitude
- Multi-salon support per owner in the UI
- Rate limiting and refresh-token rotation hardening

---

_Built with Angular + ASP.NET Core Web API + Entity Framework Core + SQL Server._
