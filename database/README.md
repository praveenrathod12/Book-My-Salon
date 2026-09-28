# Database

The application uses **SQL Server** with **Entity Framework Core** (code-first migrations). There is no hand-written SQL schema — the schema is generated from the EF Core entities in `backend/Entities` and applied through migrations in `backend/Migrations`.

## Schema overview

| Table                | Purpose                                                        |
| -------------------- | ------------------------------------------------------------- |
| `Users`              | Customers and salon owners (role-based). Email is unique.     |
| `Salons`            | One per owner. Holds address, contact and rating.             |
| `Barbers`            | Belong to a salon. `IsActive` controls availability.          |
| `Services`           | Belong to a salon. Price + duration.                          |
| `BarberServices`     | Many-to-many between barbers and services.                    |
| `SalonBusinessHours` | One row per day of week per salon (open/close/closed).        |
| `BarberSchedules`    | Weekly recurring working hours per barber (one row per day).  |
| `BarberLeaves`       | Date-specific unavailability per barber.                      |
| `Appointments`       | Bookings linking customer, salon, barber and service.         |

## Relationships

```
User (owner) 1───* Salon 1───* Barber
                     │            │
                     │            ├──* BarberService *──┐
                     │            ├──* BarberSchedule   │
                     │            └──* BarberLeave       │
                     │                                   │
                     ├───* Service *─────────────────────┘
                     ├───* SalonBusinessHour
                     └───* Appointment *───1 User (customer)
```

## Creating / updating the database

From the `backend` folder:

```bash
# Install the EF Core CLI once (if not already installed)
dotnet tool install --global dotnet-ef

# Apply all migrations (creates the database if it does not exist)
dotnet ef database update
```

The API also runs `Database.Migrate()` and seeds demo data automatically on
startup (controlled by `Database:AutoMigrate` in `appsettings.json`).

## Adding a new migration

```bash
dotnet ef migrations add <MigrationName>
dotnet ef database update
```

## Seed data

`backend/Data/DbSeeder.cs` seeds:

- A demo customer (`customer@demo.com`) and two salon owners (`owner@demo.com`, `priya@demo.com`) — all with password `Demo@123`.
- Five salons (Style Studio, Urban Cuts, The Grooming Lounge, Classic Hair Studio, Gentleman's Hub).
- Multiple services and barbers per salon, barber-service links, business hours, barber schedules, one sample leave and sample appointments.

Seeding runs only when the `Users` table is empty, so it is safe to start the API repeatedly.
