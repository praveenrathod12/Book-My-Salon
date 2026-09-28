using System.ComponentModel.DataAnnotations;

namespace SalonBooking.Api.Entities;

public class Service
{
    public int Id { get; set; }

    public int SalonId { get; set; }
    public Salon? Salon { get; set; }

    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public decimal Price { get; set; }

    public int DurationInMinutes { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<BarberService> BarberServices { get; set; } = new List<BarberService>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
