namespace SalonBooking.Api.DTOs;

public class SlotDto
{
    public string Time { get; set; } = string.Empty;      // "HH:mm" start time
    public string EndTime { get; set; } = string.Empty;   // "HH:mm"
    public bool Available { get; set; }
    public int AvailableBarbers { get; set; }
}

public class DayAvailabilityDto
{
    public string Date { get; set; } = string.Empty;  // "yyyy-MM-dd"
    public string DayName { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
    public List<SlotDto> Slots { get; set; } = new();
}

public class AvailabilityResponse
{
    public int SalonId { get; set; }
    public int ServiceId { get; set; }
    public int DurationInMinutes { get; set; }
    public List<DayAvailabilityDto> Days { get; set; } = new();
}
