namespace SalonBooking.Api.Entities;

// One row per day of week for a salon.
public class SalonBusinessHour
{
    public int Id { get; set; }

    public int SalonId { get; set; }
    public Salon? Salon { get; set; }

    // 0 = Sunday ... 6 = Saturday (matches System.DayOfWeek)
    public DayOfWeek DayOfWeek { get; set; }

    public bool IsClosed { get; set; }

    // Stored as TimeSpan (time of day). Null when closed.
    public TimeSpan? OpenTime { get; set; }
    public TimeSpan? CloseTime { get; set; }
}
