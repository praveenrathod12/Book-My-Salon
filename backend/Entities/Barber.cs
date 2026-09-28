using System.ComponentModel.DataAnnotations;

namespace SalonBooking.Api.Entities;

public class Barber
{
    public int Id { get; set; }

    public int SalonId { get; set; }
    public Salon? Salon { get; set; }

    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    public int ExperienceYears { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<BarberService> BarberServices { get; set; } = new List<BarberService>();
    public ICollection<BarberSchedule> Schedules { get; set; } = new List<BarberSchedule>();
    public ICollection<BarberLeave> Leaves { get; set; } = new List<BarberLeave>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
