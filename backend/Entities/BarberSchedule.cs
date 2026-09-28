namespace SalonBooking.Api.Entities;

// Weekly recurring working schedule for a barber (one row per working day).
public class BarberSchedule
{
    public int Id { get; set; }

    public int BarberId { get; set; }
    public Barber? Barber { get; set; }

    public DayOfWeek DayOfWeek { get; set; }

    public bool IsOff { get; set; }

    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
}
