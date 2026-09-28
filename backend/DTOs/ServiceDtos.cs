using System.ComponentModel.DataAnnotations;

namespace SalonBooking.Api.DTOs;

public class ServiceDto
{
    public int Id { get; set; }
    public int SalonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int DurationInMinutes { get; set; }
    public bool IsActive { get; set; }
}

public class ServiceUpsertRequest
{
    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(500)]
    public string? Description { get; set; }
    [Range(0, 1000000)]
    public decimal Price { get; set; }
    [Range(5, 600)]
    public int DurationInMinutes { get; set; }
    // Only used when creating (owner picks which salon; usually their own).
    public int? SalonId { get; set; }
}

public class ServiceStatusRequest
{
    public bool IsActive { get; set; }
}
