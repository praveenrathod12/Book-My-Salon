using System.ComponentModel.DataAnnotations;

namespace SalonBooking.Api.DTOs;

public class AppointmentDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int SalonId { get; set; }
    public string SalonName { get; set; } = string.Empty;
    public int BarberId { get; set; }
    public string BarberName { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string AppointmentDate { get; set; } = string.Empty; // "yyyy-MM-dd"
    public string StartTime { get; set; } = string.Empty;       // "HH:mm"
    public string EndTime { get; set; } = string.Empty;         // "HH:mm"
    public string Status { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? CancellationReason { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}

public class CreateAppointmentRequest
{
    [Required]
    public int SalonId { get; set; }
    [Required]
    public int ServiceId { get; set; }
    // Optional: customer may pick a specific barber. If null, backend picks any available.
    public int? BarberId { get; set; }
    [Required]
    public string AppointmentDate { get; set; } = string.Empty; // "yyyy-MM-dd"
    [Required]
    public string StartTime { get; set; } = string.Empty;       // "HH:mm"
}

public class RescheduleRequest
{
    [Required]
    public string AppointmentDate { get; set; } = string.Empty;
    [Required]
    public string StartTime { get; set; } = string.Empty;
    public int? BarberId { get; set; }
}

public class CancelRequest
{
    [MaxLength(500)]
    public string? Reason { get; set; }
}

public class OwnerDashboardDto
{
    public int TodayAppointments { get; set; }
    public int UpcomingAppointments { get; set; }
    public int CompletedAppointments { get; set; }
    public int CancelledAppointments { get; set; }
    public int ActiveBarbers { get; set; }
    public int TotalServices { get; set; }
    public int TotalAppointments { get; set; }
}
