using Microsoft.EntityFrameworkCore;
using SalonBooking.Api.Data;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Entities;
using SalonBooking.Api.Exceptions;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Services;

public class BarberManagementService : IBarberService
{
    private readonly AppDbContext _db;

    public BarberManagementService(AppDbContext db) => _db = db;

    public async Task<List<BarberDto>> GetBySalonAsync(int salonId, bool includeInactive = false)
    {
        var query = _db.Barbers
            .Include(b => b.BarberServices).ThenInclude(bs => bs.Service)
            .Include(b => b.Schedules)
            .Include(b => b.Leaves)
            .Where(b => b.SalonId == salonId);

        if (!includeInactive) query = query.Where(b => b.IsActive);

        var list = await query.OrderBy(b => b.Name).ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<BarberDto> GetByIdAsync(int id)
    {
        var barber = await LoadBarberGraph(id);
        return ToDto(barber);
    }

    public async Task<BarberDto> CreateAsync(int ownerId, int salonId, BarberUpsertRequest request)
    {
        await EnsureOwnsSalon(ownerId, salonId);

        var barber = new Barber
        {
            SalonId = salonId,
            Name = request.Name.Trim(),
            PhoneNumber = request.PhoneNumber,
            ExperienceYears = request.ExperienceYears,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Default schedule: Mon-Sat 09:00-18:00, Sunday off.
        for (int day = 0; day < 7; day++)
        {
            var dow = (DayOfWeek)day;
            barber.Schedules.Add(new BarberSchedule
            {
                DayOfWeek = dow,
                IsOff = dow == DayOfWeek.Sunday,
                StartTime = dow == DayOfWeek.Sunday ? null : new TimeSpan(9, 0, 0),
                EndTime = dow == DayOfWeek.Sunday ? null : new TimeSpan(18, 0, 0)
            });
        }

        await AttachServices(barber, salonId, request.ServiceIds);

        _db.Barbers.Add(barber);
        await _db.SaveChangesAsync();
        return await GetByIdAsync(barber.Id);
    }

    public async Task<BarberDto> UpdateAsync(int ownerId, int barberId, BarberUpsertRequest request)
    {
        var barber = await LoadOwnedBarber(ownerId, barberId);
        barber.Name = request.Name.Trim();
        barber.PhoneNumber = request.PhoneNumber;
        barber.ExperienceYears = request.ExperienceYears;
        barber.UpdatedAt = DateTime.UtcNow;

        var existingLinks = await _db.BarberServices.Where(bs => bs.BarberId == barberId).ToListAsync();
        _db.BarberServices.RemoveRange(existingLinks);
        await AttachServices(barber, barber.SalonId, request.ServiceIds);

        await _db.SaveChangesAsync();
        return await GetByIdAsync(barber.Id);
    }

    public async Task<BarberDto> SetStatusAsync(int ownerId, int barberId, bool isActive)
    {
        var barber = await LoadOwnedBarber(ownerId, barberId);
        barber.IsActive = isActive;
        barber.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(barber.Id);
    }

    public async Task<BarberDto> UpdateScheduleAsync(int ownerId, int barberId, BarberScheduleUpdateRequest request)
    {
        var barber = await LoadOwnedBarber(ownerId, barberId);

        var existing = await _db.BarberSchedules.Where(s => s.BarberId == barberId).ToListAsync();
        _db.BarberSchedules.RemoveRange(existing);

        foreach (var s in request.Schedules)
        {
            _db.BarberSchedules.Add(new BarberSchedule
            {
                BarberId = barberId,
                DayOfWeek = (DayOfWeek)s.DayOfWeek,
                IsOff = s.IsOff,
                StartTime = s.IsOff ? null : TimeUtil.ParseTimeOrNull(s.StartTime),
                EndTime = s.IsOff ? null : TimeUtil.ParseTimeOrNull(s.EndTime)
            });
        }
        barber.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(barberId);
    }

    public async Task<BarberLeaveDto> AddLeaveAsync(int ownerId, int barberId, BarberLeaveRequest request)
    {
        await LoadOwnedBarber(ownerId, barberId);
        var date = TimeUtil.ParseDate(request.LeaveDate);

        var exists = await _db.BarberLeaves.AnyAsync(l => l.BarberId == barberId && l.LeaveDate == date);
        if (exists) throw new ConflictException("This barber already has leave on that date.");

        var leave = new BarberLeave
        {
            BarberId = barberId,
            LeaveDate = date,
            Reason = request.Reason,
            CreatedAt = DateTime.UtcNow
        };
        _db.BarberLeaves.Add(leave);
        await _db.SaveChangesAsync();

        return new BarberLeaveDto
        {
            Id = leave.Id,
            LeaveDate = TimeUtil.FormatDate(leave.LeaveDate),
            Reason = leave.Reason
        };
    }

    public async Task RemoveLeaveAsync(int ownerId, int barberId, int leaveId)
    {
        await LoadOwnedBarber(ownerId, barberId);
        var leave = await _db.BarberLeaves.FirstOrDefaultAsync(l => l.Id == leaveId && l.BarberId == barberId)
                    ?? throw new NotFoundException("Leave record not found.");
        _db.BarberLeaves.Remove(leave);
        await _db.SaveChangesAsync();
    }

    private async Task AttachServices(Barber barber, int salonId, List<int> serviceIds)
    {
        if (serviceIds.Count == 0) return;
        var valid = await _db.Services
            .Where(s => s.SalonId == salonId && serviceIds.Contains(s.Id))
            .Select(s => s.Id)
            .ToListAsync();

        foreach (var sid in valid.Distinct())
            barber.BarberServices.Add(new BarberService { ServiceId = sid });
    }

    private async Task EnsureOwnsSalon(int ownerId, int salonId)
    {
        var salon = await _db.Salons.FirstOrDefaultAsync(s => s.Id == salonId)
                    ?? throw new NotFoundException("Salon not found.");
        if (salon.OwnerId != ownerId)
            throw new ForbiddenException("You can only manage barbers for your own salon.");
    }

    private async Task<Barber> LoadOwnedBarber(int ownerId, int barberId)
    {
        var barber = await _db.Barbers.Include(b => b.Salon)
            .FirstOrDefaultAsync(b => b.Id == barberId)
            ?? throw new NotFoundException("Barber not found.");
        if (barber.Salon!.OwnerId != ownerId)
            throw new ForbiddenException("You can only manage your own barbers.");
        return barber;
    }

    private async Task<Barber> LoadBarberGraph(int id)
    {
        return await _db.Barbers
            .Include(b => b.BarberServices).ThenInclude(bs => bs.Service)
            .Include(b => b.Schedules)
            .Include(b => b.Leaves)
            .FirstOrDefaultAsync(b => b.Id == id)
            ?? throw new NotFoundException("Barber not found.");
    }

    private static BarberDto ToDto(Barber b)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todaySchedule = b.Schedules.FirstOrDefault(s => s.DayOfWeek == DateTime.UtcNow.DayOfWeek);
        var onLeaveToday = b.Leaves.Any(l => l.LeaveDate == today);

        return new BarberDto
        {
            Id = b.Id,
            SalonId = b.SalonId,
            Name = b.Name,
            PhoneNumber = b.PhoneNumber,
            ExperienceYears = b.ExperienceYears,
            IsActive = b.IsActive,
            OffToday = onLeaveToday || (todaySchedule?.IsOff ?? false),
            ServiceIds = b.BarberServices.Select(bs => bs.ServiceId).ToList(),
            ServiceNames = b.BarberServices.Where(bs => bs.Service != null).Select(bs => bs.Service!.Name).ToList(),
            Schedules = b.Schedules.OrderBy(s => s.DayOfWeek).Select(s => new BarberScheduleDto
            {
                DayOfWeek = (int)s.DayOfWeek,
                IsOff = s.IsOff,
                StartTime = s.StartTime.HasValue ? TimeUtil.FormatTime(s.StartTime.Value) : null,
                EndTime = s.EndTime.HasValue ? TimeUtil.FormatTime(s.EndTime.Value) : null
            }).ToList(),
            Leaves = b.Leaves.OrderBy(l => l.LeaveDate).Select(l => new BarberLeaveDto
            {
                Id = l.Id,
                LeaveDate = TimeUtil.FormatDate(l.LeaveDate),
                Reason = l.Reason
            }).ToList()
        };
    }
}
