using Microsoft.EntityFrameworkCore;
using SalonBooking.Api.Entities;

namespace SalonBooking.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        await db.Database.MigrateAsync();

        if (await db.Users.AnyAsync()) return; // Already seeded.

        var now = DateTime.UtcNow;
        string Hash(string p) => BCrypt.Net.BCrypt.HashPassword(p);

        // ----- Users -----
        var customer = new User
        {
            FirstName = "Demo", LastName = "Customer", Email = "customer@demo.com",
            PhoneNumber = "9000000001", PasswordHash = Hash("Demo@123"),
            Role = UserRole.CUSTOMER, IsActive = true, CreatedAt = now, UpdatedAt = now
        };
        var owner = new User
        {
            FirstName = "Demo", LastName = "Owner", Email = "owner@demo.com",
            PhoneNumber = "9000000002", PasswordHash = Hash("Demo@123"),
            Role = UserRole.SALON_OWNER, IsActive = true, CreatedAt = now, UpdatedAt = now
        };
        var owner2 = new User
        {
            FirstName = "Priya", LastName = "Sharma", Email = "priya@demo.com",
            PhoneNumber = "9000000003", PasswordHash = Hash("Demo@123"),
            Role = UserRole.SALON_OWNER, IsActive = true, CreatedAt = now, UpdatedAt = now
        };
        db.Users.AddRange(customer, owner, owner2);
        await db.SaveChangesAsync();

        // Helper builders
        List<SalonBusinessHour> DefaultHours() =>
            Enumerable.Range(0, 7).Select(day =>
            {
                var dow = (DayOfWeek)day;
                return new SalonBusinessHour
                {
                    DayOfWeek = dow,
                    IsClosed = false,
                    OpenTime = dow == DayOfWeek.Sunday ? new TimeSpan(10, 0, 0) : new TimeSpan(9, 0, 0),
                    CloseTime = dow == DayOfWeek.Saturday ? new TimeSpan(22, 0, 0)
                              : dow == DayOfWeek.Sunday ? new TimeSpan(18, 0, 0)
                              : new TimeSpan(21, 0, 0)
                };
            }).ToList();

        List<BarberSchedule> DefaultSchedule(bool sundayOff = true) =>
            Enumerable.Range(0, 7).Select(day =>
            {
                var dow = (DayOfWeek)day;
                var off = sundayOff && dow == DayOfWeek.Sunday;
                return new BarberSchedule
                {
                    DayOfWeek = dow,
                    IsOff = off,
                    StartTime = off ? null : new TimeSpan(9, 0, 0),
                    EndTime = off ? null : new TimeSpan(18, 0, 0)
                };
            }).ToList();

        var salonSeeds = new[]
        {
            new { Owner = owner, Name = "Style Studio", City = "Bengaluru", State = "Karnataka", Rating = 4.6,
                  Desc = "Modern unisex salon offering premium grooming and styling.", Addr = "12 MG Road", Pin = "560001" },
            new { Owner = owner, Name = "Urban Cuts", City = "Bengaluru", State = "Karnataka", Rating = 4.3,
                  Desc = "Trendy cuts and beard styling for the urban gentleman.", Addr = "45 Indiranagar", Pin = "560038" },
            new { Owner = owner2, Name = "The Grooming Lounge", City = "Mumbai", State = "Maharashtra", Rating = 4.8,
                  Desc = "Luxury grooming lounge with experienced stylists.", Addr = "8 Bandra West", Pin = "400050" },
            new { Owner = owner2, Name = "Classic Hair Studio", City = "Pune", State = "Maharashtra", Rating = 4.1,
                  Desc = "Classic barbershop experience with a friendly touch.", Addr = "23 FC Road", Pin = "411004" },
            new { Owner = owner2, Name = "Gentleman's Hub", City = "Hyderabad", State = "Telangana", Rating = 4.5,
                  Desc = "Full-service grooming hub for the modern man.", Addr = "77 Jubilee Hills", Pin = "500033" }
        };

        var serviceTemplates = new (string Name, string Desc, decimal Price, int Duration)[]
        {
            ("Haircut", "Professional haircut and styling.", 250m, 30),
            ("Beard Trim", "Beard shaping and trimming.", 150m, 30),
            ("Haircut + Beard", "Complete haircut with beard styling.", 350m, 60),
            ("Hair Spa", "Relaxing hair spa treatment.", 600m, 60),
            ("Facial", "Refreshing facial treatment.", 500m, 60),
            ("Shaving", "Clean classic shave.", 120m, 30),
            ("Hair Coloring", "Full hair coloring service.", 900m, 90)
        };

        var barberNames = new[] { "Rahul", "Arjun", "Vikram", "Karan", "Sameer", "Deepak" };
        var rng = new Random(42);

        foreach (var seed in salonSeeds)
        {
            var salon = new Salon
            {
                OwnerId = seed.Owner.Id,
                Name = seed.Name,
                Description = seed.Desc,
                Address = seed.Addr,
                City = seed.City,
                State = seed.State,
                PostalCode = seed.Pin,
                PhoneNumber = "080-4000-" + rng.Next(1000, 9999),
                Rating = seed.Rating,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                BusinessHours = DefaultHours()
            };

            // 4-6 services per salon (subset of templates).
            var serviceCount = rng.Next(4, serviceTemplates.Length + 1);
            var chosenServices = serviceTemplates.OrderBy(_ => rng.Next()).Take(serviceCount).ToList();
            foreach (var st in chosenServices)
            {
                salon.Services.Add(new Service
                {
                    Name = st.Name,
                    Description = st.Desc,
                    Price = st.Price,
                    DurationInMinutes = st.Duration,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }

            // 3-4 barbers per salon.
            var count = rng.Next(3, 5);
            var chosenBarberNames = barberNames.OrderBy(_ => rng.Next()).Take(count).ToList();
            for (int i = 0; i < count; i++)
            {
                var barber = new Barber
                {
                    Name = chosenBarberNames[i],
                    PhoneNumber = "98" + rng.Next(10000000, 99999999),
                    ExperienceYears = rng.Next(1, 12),
                    // Make one barber inactive to demonstrate deactivation.
                    IsActive = !(i == count - 1 && salon.Name == "Urban Cuts"),
                    CreatedAt = now,
                    UpdatedAt = now,
                    Schedules = DefaultSchedule(sundayOff: i % 2 == 0)
                };
                salon.Barbers.Add(barber);
            }

            db.Salons.Add(salon);
            await db.SaveChangesAsync();

            // Link barbers to services (each barber does a random subset, at least Haircut).
            var salonServices = salon.Services.ToList();
            var haircut = salonServices.FirstOrDefault(s => s.Name == "Haircut");
            foreach (var barber in salon.Barbers)
            {
                var subset = salonServices.OrderBy(_ => rng.Next()).Take(rng.Next(2, salonServices.Count + 1)).ToList();
                if (haircut != null && !subset.Contains(haircut)) subset.Add(haircut);
                foreach (var svc in subset.Distinct())
                    db.BarberServices.Add(new BarberService { BarberId = barber.Id, ServiceId = svc.Id });
            }
            await db.SaveChangesAsync();

            // Add a sample leave for the first barber (tomorrow) to demonstrate leave handling.
            var firstBarber = salon.Barbers.First();
            db.BarberLeaves.Add(new BarberLeave
            {
                BarberId = firstBarber.Id,
                LeaveDate = DateOnly.FromDateTime(now).AddDays(2),
                Reason = "Personal leave",
                CreatedAt = now
            });
        }
        await db.SaveChangesAsync();

        // ----- Sample appointments for the demo customer at the first salon -----
        var styleStudio = await db.Salons
            .Include(s => s.Services)
            .Include(s => s.Barbers)
            .FirstAsync(s => s.Name == "Style Studio");

        var svcHaircut = styleStudio.Services.First(s => s.Name == "Haircut");
        var activeBarber = styleStudio.Barbers.First(b => b.IsActive);
        var today = DateOnly.FromDateTime(now);

        db.Appointments.AddRange(
            new Appointment
            {
                CustomerId = customer.Id, SalonId = styleStudio.Id, BarberId = activeBarber.Id,
                ServiceId = svcHaircut.Id, AppointmentDate = today.AddDays(1),
                StartTime = new TimeSpan(17, 0, 0), EndTime = new TimeSpan(17, 30, 0),
                Status = AppointmentStatus.CONFIRMED, Amount = svcHaircut.Price,
                CreatedAt = now, UpdatedAt = now
            },
            new Appointment
            {
                CustomerId = customer.Id, SalonId = styleStudio.Id, BarberId = activeBarber.Id,
                ServiceId = svcHaircut.Id, AppointmentDate = today.AddDays(-7),
                StartTime = new TimeSpan(11, 0, 0), EndTime = new TimeSpan(11, 30, 0),
                Status = AppointmentStatus.COMPLETED, Amount = svcHaircut.Price,
                CreatedAt = now.AddDays(-8), UpdatedAt = now.AddDays(-7)
            });

        await db.SaveChangesAsync();
    }
}
