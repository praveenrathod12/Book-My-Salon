using System.ComponentModel.DataAnnotations;

namespace SalonBooking.Api.DTOs;

public class BarberScheduleDto
{
    public int DayOfWeek { get; set; }
    public bool IsOff { get; set; }
    public string? StartTime { get; set; } // "HH:mm"
    public string? EndTime { get; set; }   // "HH:mm"
}

public class BarberLeaveDto
{
    public int Id { get; set; }
    public string LeaveDate { get; set; } = string.Empty; // "yyyy-MM-dd"
    public string? Reason { get; set; }
}

public class BarberDto
{
    public int Id { get; set; }
    public int SalonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public int ExperienceYears { get; set; }
    public bool IsActive { get; set; }
    public bool OffToday { get; set; }
    public List<int> ServiceIds { get; set; } = new();
    public List<string> ServiceNames { get; set; } = new();
    public List<BarberScheduleDto> Schedules { get; set; } = new();
    public List<BarberLeaveDto> Leaves { get; set; } = new();
}

public class BarberUpsertRequest
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(20)]
    public string? PhoneNumber { get; set; }
    [Range(0, 60)]
    public int ExperienceYears { get; set; }
    public List<int> ServiceIds { get; set; } = new();
}

public class BarberStatusRequest
{
    public bool IsActive { get; set; }
}

public class BarberScheduleUpdateRequest
{
    public List<BarberScheduleDto> Schedules { get; set; } = new();
}

public class BarberLeaveRequest
{
    [Required]
    public string LeaveDate { get; set; } = string.Empty; // "yyyy-MM-dd"
    [MaxLength(250)]
    public string? Reason { get; set; }
}
