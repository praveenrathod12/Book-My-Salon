using System.ComponentModel.DataAnnotations;

namespace SalonBooking.Api.DTOs;

public class BusinessHourDto
{
    public int DayOfWeek { get; set; }
    public bool IsClosed { get; set; }
    public string? OpenTime { get; set; }   // "HH:mm"
    public string? CloseTime { get; set; }  // "HH:mm"
}

public class SalonDto
{
    public int Id { get; set; }
    public int OwnerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? PostalCode { get; set; }
    public string? PhoneNumber { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double Rating { get; set; }
    public bool IsActive { get; set; }
    public decimal? StartingPrice { get; set; }
    public int ServiceCount { get; set; }
    public int ActiveBarberCount { get; set; }
    public List<BusinessHourDto> BusinessHours { get; set; } = new();
}

public class SalonUpsertRequest
{
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
}

public class BusinessHoursUpdateRequest
{
    public List<BusinessHourDto> Hours { get; set; } = new();
}
