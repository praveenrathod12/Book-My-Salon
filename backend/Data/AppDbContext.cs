using Microsoft.EntityFrameworkCore;
using SalonBooking.Api.Entities;

namespace SalonBooking.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Salon> Salons => Set<Salon>();
    public DbSet<Barber> Barbers => Set<Barber>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<BarberService> BarberServices => Set<BarberService>();
    public DbSet<SalonBusinessHour> SalonBusinessHours => Set<SalonBusinessHour>();
    public DbSet<BarberSchedule> BarberSchedules => Set<BarberSchedule>();
    public DbSet<BarberLeave> BarberLeaves => Set<BarberLeave>();
    public DbSet<Appointment> Appointments => Set<Appointment>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        });

        b.Entity<Salon>(e =>
        {
            e.HasOne(s => s.Owner)
                .WithMany(u => u.Salons)
                .HasForeignKey(s => s.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<Barber>(e =>
        {
            e.HasOne(x => x.Salon)
                .WithMany(s => s.Barbers)
                .HasForeignKey(x => x.SalonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Service>(e =>
        {
            e.Property(s => s.Price).HasColumnType("decimal(10,2)");
            e.HasOne(x => x.Salon)
                .WithMany(s => s.Services)
                .HasForeignKey(x => x.SalonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<BarberService>(e =>
        {
            e.HasIndex(bs => new { bs.BarberId, bs.ServiceId }).IsUnique();
            e.HasOne(bs => bs.Barber)
                .WithMany(bar => bar.BarberServices)
                .HasForeignKey(bs => bs.BarberId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(bs => bs.Service)
                .WithMany(s => s.BarberServices)
                .HasForeignKey(bs => bs.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<SalonBusinessHour>(e =>
        {
            e.HasIndex(x => new { x.SalonId, x.DayOfWeek }).IsUnique();
            e.HasOne(x => x.Salon)
                .WithMany(s => s.BusinessHours)
                .HasForeignKey(x => x.SalonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<BarberSchedule>(e =>
        {
            e.HasIndex(x => new { x.BarberId, x.DayOfWeek }).IsUnique();
            e.HasOne(x => x.Barber)
                .WithMany(bar => bar.Schedules)
                .HasForeignKey(x => x.BarberId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<BarberLeave>(e =>
        {
            e.HasIndex(x => new { x.BarberId, x.LeaveDate }).IsUnique();
            e.HasOne(x => x.Barber)
                .WithMany(bar => bar.Leaves)
                .HasForeignKey(x => x.BarberId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Appointment>(e =>
        {
            e.Property(a => a.Amount).HasColumnType("decimal(10,2)");
            e.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);

            e.HasOne(a => a.Customer)
                .WithMany(u => u.Appointments)
                .HasForeignKey(a => a.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(a => a.Salon)
                .WithMany(s => s.Appointments)
                .HasForeignKey(a => a.SalonId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(a => a.Barber)
                .WithMany(bar => bar.Appointments)
                .HasForeignKey(a => a.BarberId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(a => a.Service)
                .WithMany(s => s.Appointments)
                .HasForeignKey(a => a.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            // Speeds up availability & conflict checks.
            e.HasIndex(a => new { a.BarberId, a.AppointmentDate });
            e.HasIndex(a => new { a.SalonId, a.AppointmentDate });
        });
    }
}
