using Microsoft.EntityFrameworkCore;
using SalonBooking.Api.Data;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Entities;
using SalonBooking.Api.Exceptions;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Services;

public class AppointmentBookingService : IAppointmentService
{
    private readonly AppDbContext _db;

    public AppointmentBookingService(AppDbContext db) => _db = db;

    public async Task<AppointmentDto> CreateAsync(int customerId, CreateAppointmentRequest request)
    {
        var date = TimeUtil.ParseDate(request.AppointmentDate);
        var startTime = TimeUtil.ParseTime(request.StartTime);

        if (date < DateOnly.FromDateTime(DateTime.UtcNow))
            throw new BadRequestException("Cannot book an appointment in the past.");

        var service = await _db.Services
            .FirstOrDefaultAsync(s => s.Id == request.ServiceId && s.SalonId == request.SalonId && s.IsActive)
            ?? throw new NotFoundException("Service not found for this salon.");

        var salon = await _db.Salons.FirstOrDefaultAsync(s => s.Id == request.SalonId && s.IsActive)
                    ?? throw new NotFoundException("Salon not found.");

        var endTime = startTime + TimeSpan.FromMinutes(service.DurationInMinutes);

        // Validate against salon business hours.
        var bh = await _db.SalonBusinessHours
            .FirstOrDefaultAsync(h => h.SalonId == salon.Id && h.DayOfWeek == date.DayOfWeek);
        if (bh is null || bh.IsClosed || bh.OpenTime is null || bh.CloseTime is null)
            throw new ConflictException("The salon is closed on the selected day.");
        if (startTime < bh.OpenTime.Value || endTime > bh.CloseTime.Value)
            throw new ConflictException("The selected time is outside salon working hours.");

        // Re-check availability inside a serializable transaction to prevent double booking.
        await using var tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);

        var chosenBarberId = await PickAvailableBarberAsync(request.SalonId, request.ServiceId, request.BarberId, date, startTime, endTime);
        if (chosenBarberId is null)
            throw new ConflictException("The selected time slot is no longer available.");

        var appointment = new Appointment
        {
            CustomerId = customerId,
            SalonId = request.SalonId,
            BarberId = chosenBarberId.Value,
            ServiceId = request.ServiceId,
            AppointmentDate = date,
            StartTime = startTime,
            EndTime = endTime,
            Status = AppointmentStatus.CONFIRMED,
            Amount = service.Price,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Appointments.Add(appointment);

        try
        {
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException)
        {
            await tx.RollbackAsync();
            throw new ConflictException("The selected time slot is no longer available.");
        }

        return await GetByIdAsync(customerId, UserRole.CUSTOMER, appointment.Id);
    }

    // Returns a barber id that can perform the service and is free for the slot, or null.
    private async Task<int?> PickAvailableBarberAsync(int salonId, int serviceId, int? preferredBarberId,
        DateOnly date, TimeSpan startTime, TimeSpan endTime)
    {
        var capable = await _db.Barbers
            .Where(b => b.SalonId == salonId && b.IsActive
                        && b.BarberServices.Any(bs => bs.ServiceId == serviceId))
            .Include(b => b.Schedules)
            .ToListAsync();

        if (preferredBarberId.HasValue)
            capable = capable.Where(b => b.Id == preferredBarberId.Value).ToList();

        if (capable.Count == 0) return null;

        var barberIds = capable.Select(b => b.Id).ToList();

        var leaveDates = await _db.BarberLeaves
            .Where(l => barberIds.Contains(l.BarberId) && l.LeaveDate == date)
            .Select(l => l.BarberId)
            .ToListAsync();

        var dayAppts = await _db.Appointments
            .Where(a => barberIds.Contains(a.BarberId)
                        && a.AppointmentDate == date
                        && a.Status != AppointmentStatus.CANCELLED)
            .Select(a => new { a.BarberId, a.StartTime, a.EndTime })
            .ToListAsync();

        foreach (var barber in capable)
        {
            if (leaveDates.Contains(barber.Id)) continue;

            var schedule = barber.Schedules.FirstOrDefault(s => s.DayOfWeek == date.DayOfWeek);
            if (schedule is null || schedule.IsOff || schedule.StartTime is null || schedule.EndTime is null)
                continue;
            if (startTime < schedule.StartTime.Value || endTime > schedule.EndTime.Value)
                continue;

            var overlaps = dayAppts.Any(a => a.BarberId == barber.Id && startTime < a.EndTime && a.StartTime < endTime);
            if (!overlaps)
                return barber.Id;
        }

        return null;
    }

    public async Task<List<AppointmentDto>> GetForCustomerAsync(int customerId, string? status)
    {
        var query = BaseQuery().Where(a => a.CustomerId == customerId);
        query = ApplyStatusFilter(query, status);
        var list = await query
            .OrderByDescending(a => a.AppointmentDate)
            .ThenByDescending(a => a.StartTime)
            .ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<List<AppointmentDto>> GetForOwnerAsync(int ownerId, string? status, string? date)
    {
        var salon = await _db.Salons.FirstOrDefaultAsync(s => s.OwnerId == ownerId)
                    ?? throw new NotFoundException("You do not have a salon yet.");

        var query = BaseQuery().Where(a => a.SalonId == salon.Id);
        query = ApplyStatusFilter(query, status);

        if (!string.IsNullOrWhiteSpace(date))
        {
            var d = TimeUtil.ParseDate(date);
            query = query.Where(a => a.AppointmentDate == d);
        }

        var list = await query
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.StartTime)
            .ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<AppointmentDto> GetByIdAsync(int userId, UserRole role, int appointmentId)
    {
        var appt = await BaseQuery().FirstOrDefaultAsync(a => a.Id == appointmentId)
                   ?? throw new NotFoundException("Appointment not found.");

        if (role == UserRole.CUSTOMER && appt.CustomerId != userId)
            throw new ForbiddenException("You can only view your own bookings.");

        if (role == UserRole.SALON_OWNER)
        {
            var ownsSalon = await _db.Salons.AnyAsync(s => s.Id == appt.SalonId && s.OwnerId == userId);
            if (!ownsSalon) throw new ForbiddenException("You can only view appointments at your salon.");
        }

        return ToDto(appt);
    }

    public async Task<AppointmentDto> RescheduleAsync(int customerId, int appointmentId, RescheduleRequest request)
    {
        var appt = await _db.Appointments.Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.Id == appointmentId)
            ?? throw new NotFoundException("Appointment not found.");

        if (appt.CustomerId != customerId)
            throw new ForbiddenException("You can only reschedule your own bookings.");
        if (appt.Status is AppointmentStatus.CANCELLED or AppointmentStatus.COMPLETED or AppointmentStatus.NO_SHOW)
            throw new BadRequestException("This appointment can no longer be rescheduled.");

        var date = TimeUtil.ParseDate(request.AppointmentDate);
        var startTime = TimeUtil.ParseTime(request.StartTime);
        var endTime = startTime + TimeSpan.FromMinutes(appt.Service!.DurationInMinutes);

        if (date < DateOnly.FromDateTime(DateTime.UtcNow))
            throw new BadRequestException("Cannot reschedule to a past date.");

        var bh = await _db.SalonBusinessHours
            .FirstOrDefaultAsync(h => h.SalonId == appt.SalonId && h.DayOfWeek == date.DayOfWeek);
        if (bh is null || bh.IsClosed || bh.OpenTime is null || bh.CloseTime is null)
            throw new ConflictException("The salon is closed on the selected day.");
        if (startTime < bh.OpenTime.Value || endTime > bh.CloseTime.Value)
            throw new ConflictException("The selected time is outside salon working hours.");

        await using var tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);

        // Exclude this appointment itself when checking availability.
        var chosenBarberId = await PickAvailableBarberForReschedule(
            appt.SalonId, appt.ServiceId, request.BarberId ?? appt.BarberId, date, startTime, endTime, appt.Id);

        if (chosenBarberId is null)
            throw new ConflictException("The selected time slot is no longer available.");

        appt.BarberId = chosenBarberId.Value;
        appt.AppointmentDate = date;
        appt.StartTime = startTime;
        appt.EndTime = endTime;
        appt.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException)
        {
            await tx.RollbackAsync();
            throw new ConflictException("The selected time slot is no longer available.");
        }

        return await GetByIdAsync(customerId, UserRole.CUSTOMER, appt.Id);
    }

    private async Task<int?> PickAvailableBarberForReschedule(int salonId, int serviceId, int? preferredBarberId,
        DateOnly date, TimeSpan startTime, TimeSpan endTime, int excludeAppointmentId)
    {
        var capable = await _db.Barbers
            .Where(b => b.SalonId == salonId && b.IsActive
                        && b.BarberServices.Any(bs => bs.ServiceId == serviceId))
            .Include(b => b.Schedules)
            .ToListAsync();

        if (preferredBarberId.HasValue)
        {
            var preferred = capable.Where(b => b.Id == preferredBarberId.Value).ToList();
            if (preferred.Count > 0) capable = preferred;
        }

        if (capable.Count == 0) return null;
        var barberIds = capable.Select(b => b.Id).ToList();

        var leaveDates = await _db.BarberLeaves
            .Where(l => barberIds.Contains(l.BarberId) && l.LeaveDate == date)
            .Select(l => l.BarberId).ToListAsync();

        var dayAppts = await _db.Appointments
            .Where(a => barberIds.Contains(a.BarberId) && a.AppointmentDate == date
                        && a.Status != AppointmentStatus.CANCELLED && a.Id != excludeAppointmentId)
            .Select(a => new { a.BarberId, a.StartTime, a.EndTime })
            .ToListAsync();

        foreach (var barber in capable)
        {
            if (leaveDates.Contains(barber.Id)) continue;
            var schedule = barber.Schedules.FirstOrDefault(s => s.DayOfWeek == date.DayOfWeek);
            if (schedule is null || schedule.IsOff || schedule.StartTime is null || schedule.EndTime is null) continue;
            if (startTime < schedule.StartTime.Value || endTime > schedule.EndTime.Value) continue;
            var overlaps = dayAppts.Any(a => a.BarberId == barber.Id && startTime < a.EndTime && a.StartTime < endTime);
            if (!overlaps) return barber.Id;
        }
        return null;
    }

    public async Task<AppointmentDto> CancelAsync(int userId, UserRole role, int appointmentId, string? reason)
    {
        var appt = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == appointmentId)
                   ?? throw new NotFoundException("Appointment not found.");

        if (role == UserRole.CUSTOMER && appt.CustomerId != userId)
            throw new ForbiddenException("You can only cancel your own bookings.");
        if (role == UserRole.SALON_OWNER)
        {
            var ownsSalon = await _db.Salons.AnyAsync(s => s.Id == appt.SalonId && s.OwnerId == userId);
            if (!ownsSalon) throw new ForbiddenException("You can only cancel appointments at your salon.");
        }

        if (appt.Status == AppointmentStatus.CANCELLED)
            throw new BadRequestException("This appointment is already cancelled.");
        if (appt.Status is AppointmentStatus.COMPLETED or AppointmentStatus.NO_SHOW)
            throw new BadRequestException("This appointment can no longer be cancelled.");

        appt.Status = AppointmentStatus.CANCELLED;
        appt.CancellationReason = reason;
        appt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetByIdAsync(userId, role, appt.Id);
    }

    public async Task<AppointmentDto> UpdateStatusAsync(int ownerId, int appointmentId, string status)
    {
        var appt = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == appointmentId)
                   ?? throw new NotFoundException("Appointment not found.");

        var ownsSalon = await _db.Salons.AnyAsync(s => s.Id == appt.SalonId && s.OwnerId == ownerId);
        if (!ownsSalon) throw new ForbiddenException("You can only manage appointments at your salon.");

        if (!Enum.TryParse<AppointmentStatus>(status, true, out var parsed))
            throw new BadRequestException("Invalid status value.");

        appt.Status = parsed;
        appt.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(ownerId, UserRole.SALON_OWNER, appt.Id);
    }

    public async Task<OwnerDashboardDto> GetOwnerDashboardAsync(int ownerId)
    {
        var salon = await _db.Salons.FirstOrDefaultAsync(s => s.OwnerId == ownerId)
                    ?? throw new NotFoundException("You do not have a salon yet.");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var appts = _db.Appointments.Where(a => a.SalonId == salon.Id);

        return new OwnerDashboardDto
        {
            TodayAppointments = await appts.CountAsync(a => a.AppointmentDate == today && a.Status != AppointmentStatus.CANCELLED),
            UpcomingAppointments = await appts.CountAsync(a => a.AppointmentDate >= today
                && (a.Status == AppointmentStatus.CONFIRMED || a.Status == AppointmentStatus.PENDING)),
            CompletedAppointments = await appts.CountAsync(a => a.Status == AppointmentStatus.COMPLETED),
            CancelledAppointments = await appts.CountAsync(a => a.Status == AppointmentStatus.CANCELLED),
            ActiveBarbers = await _db.Barbers.CountAsync(b => b.SalonId == salon.Id && b.IsActive),
            TotalServices = await _db.Services.CountAsync(s => s.SalonId == salon.Id && s.IsActive),
            TotalAppointments = await appts.CountAsync()
        };
    }

    private IQueryable<Appointment> BaseQuery() => _db.Appointments
        .Include(a => a.Customer)
        .Include(a => a.Salon)
        .Include(a => a.Barber)
        .Include(a => a.Service);

    private static IQueryable<Appointment> ApplyStatusFilter(IQueryable<Appointment> query, string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return query;

        if (status.Equals("upcoming", StringComparison.OrdinalIgnoreCase))
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            return query.Where(a => a.AppointmentDate >= today
                && (a.Status == AppointmentStatus.CONFIRMED || a.Status == AppointmentStatus.PENDING));
        }
        if (status.Equals("history", StringComparison.OrdinalIgnoreCase))
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            return query.Where(a => a.AppointmentDate < today
                || a.Status == AppointmentStatus.COMPLETED
                || a.Status == AppointmentStatus.CANCELLED
                || a.Status == AppointmentStatus.NO_SHOW);
        }
        if (Enum.TryParse<AppointmentStatus>(status, true, out var parsed))
            return query.Where(a => a.Status == parsed);

        return query;
    }

    private static AppointmentDto ToDto(Appointment a) => new()
    {
        Id = a.Id,
        CustomerId = a.CustomerId,
        CustomerName = a.Customer != null ? $"{a.Customer.FirstName} {a.Customer.LastName}".Trim() : string.Empty,
        SalonId = a.SalonId,
        SalonName = a.Salon?.Name ?? string.Empty,
        BarberId = a.BarberId,
        BarberName = a.Barber?.Name ?? string.Empty,
        ServiceId = a.ServiceId,
        ServiceName = a.Service?.Name ?? string.Empty,
        AppointmentDate = TimeUtil.FormatDate(a.AppointmentDate),
        StartTime = TimeUtil.FormatTime(a.StartTime),
        EndTime = TimeUtil.FormatTime(a.EndTime),
        Status = a.Status.ToString(),
        Amount = a.Amount,
        CancellationReason = a.CancellationReason,
        CreatedAt = a.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
    };
}
