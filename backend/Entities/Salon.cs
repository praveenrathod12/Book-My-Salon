using System.ComponentModel.DataAnnotations;

namespace SalonBooking.Api.Entities;

public class Salon
{
    public int Id { get; set; }

    public int OwnerId { get; set; }
    public User? Owner { get; set; }

    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(250)]
    public string? Address { get; set; }

    [MaxLength(80)]
    public string? City { get; set; }

    [MaxLength(80)]
    public string? State { get; set; }

    [MaxLength(20)]
    public string? PostalCode { get; set; }

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public double Rating { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Barber> Barbers { get; set; } = new List<Barber>();
    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<SalonBusinessHour> BusinessHours { get; set; } = new List<SalonBusinessHour>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
