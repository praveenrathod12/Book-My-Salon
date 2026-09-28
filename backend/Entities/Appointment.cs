using System.ComponentModel.DataAnnotations;

namespace SalonBooking.Api.Entities;

public class Appointment
{
    public int Id { get; set; }

    public int CustomerId { get; set; }
    public User? Customer { get; set; }

    public int SalonId { get; set; }
    public Salon? Salon { get; set; }

    public int BarberId { get; set; }
    public Barber? Barber { get; set; }

    public int ServiceId { get; set; }
    public Service? Service { get; set; }

    public DateOnly AppointmentDate { get; set; }

    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.CONFIRMED;

    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string? CancellationReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
