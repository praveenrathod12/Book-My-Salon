using SalonBooking.Api.DTOs;
using SalonBooking.Api.Entities;

namespace SalonBooking.Api.Interfaces;

public interface ITokenService
{
    (string accessToken, DateTime expiresAt) CreateAccessToken(User user);
    string CreateRefreshToken();
}

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> RefreshAsync(RefreshTokenRequest request);
    Task<UserDto> GetProfileAsync(int userId);
}

public interface ISalonService
{
    Task<List<SalonDto>> GetAllAsync(string? search, string? city);
    Task<SalonDto> GetByIdAsync(int id);
    Task<SalonDto?> GetMySalonAsync(int ownerId);
    Task<SalonDto> CreateAsync(int ownerId, SalonUpsertRequest request);
    Task<SalonDto> UpdateAsync(int ownerId, int salonId, SalonUpsertRequest request);
    Task<List<BusinessHourDto>> GetBusinessHoursAsync(int salonId);
    Task<List<BusinessHourDto>> UpdateBusinessHoursAsync(int ownerId, int salonId, BusinessHoursUpdateRequest request);
}

public interface IServiceService
{
    Task<List<ServiceDto>> GetBySalonAsync(int salonId, bool includeInactive = false);
    Task<ServiceDto> CreateAsync(int ownerId, ServiceUpsertRequest request);
    Task<ServiceDto> UpdateAsync(int ownerId, int serviceId, ServiceUpsertRequest request);
    Task<ServiceDto> SetStatusAsync(int ownerId, int serviceId, bool isActive);
    Task DeleteAsync(int ownerId, int serviceId);
}

public interface IBarberService
{
    Task<List<BarberDto>> GetBySalonAsync(int salonId, bool includeInactive = false);
    Task<BarberDto> GetByIdAsync(int id);
    Task<BarberDto> CreateAsync(int ownerId, int salonId, BarberUpsertRequest request);
    Task<BarberDto> UpdateAsync(int ownerId, int barberId, BarberUpsertRequest request);
    Task<BarberDto> SetStatusAsync(int ownerId, int barberId, bool isActive);
    Task<BarberDto> UpdateScheduleAsync(int ownerId, int barberId, BarberScheduleUpdateRequest request);
    Task<BarberLeaveDto> AddLeaveAsync(int ownerId, int barberId, BarberLeaveRequest request);
    Task RemoveLeaveAsync(int ownerId, int barberId, int leaveId);
}

public interface IAvailabilityService
{
    Task<AvailabilityResponse> GetAvailabilityAsync(int salonId, int serviceId, DateOnly startDate, DateOnly endDate);
}

public interface IAppointmentService
{
    Task<AppointmentDto> CreateAsync(int customerId, CreateAppointmentRequest request);
    Task<List<AppointmentDto>> GetForCustomerAsync(int customerId, string? status);
    Task<List<AppointmentDto>> GetForOwnerAsync(int ownerId, string? status, string? date);
    Task<AppointmentDto> GetByIdAsync(int userId, UserRole role, int appointmentId);
    Task<AppointmentDto> RescheduleAsync(int customerId, int appointmentId, RescheduleRequest request);
    Task<AppointmentDto> CancelAsync(int userId, UserRole role, int appointmentId, string? reason);
    Task<AppointmentDto> UpdateStatusAsync(int ownerId, int appointmentId, string status);
    Task<OwnerDashboardDto> GetOwnerDashboardAsync(int ownerId);
}
