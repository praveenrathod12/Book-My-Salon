using System.ComponentModel.DataAnnotations;

namespace SalonBooking.Api.Entities;

// Date-specific unavailability for a barber (e.g. October 5 -> OFF).
public class BarberLeave
{
    public int Id { get; set; }

    public int BarberId { get; set; }
    public Barber? Barber { get; set; }

    public DateOnly LeaveDate { get; set; }

    [MaxLength(250)]
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
