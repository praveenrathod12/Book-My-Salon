using Microsoft.EntityFrameworkCore;
using SalonBooking.Api.Data;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Entities;
using SalonBooking.Api.Exceptions;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Services;

// Slots are generated on this fixed grid; service duration determines how many
// consecutive minutes must be free, but slots always start on 30-minute boundaries.
public class AvailabilityService : IAvailabilityService
{
    private const int SlotStepMinutes = 30;
    private readonly AppDbContext _db;

    public AvailabilityService(AppDbContext db) => _db = db;

    public async Task<AvailabilityResponse> GetAvailabilityAsync(int salonId, int serviceId, DateOnly startDate, DateOnly endDate)
    {
        if (endDate < startDate)
            throw new BadRequestException("endDate must be on or after startDate.");
        if ((endDate.DayNumber - startDate.DayNumber) > 30)
            throw new BadRequestException("Date range cannot exceed 31 days.");

        var salon = await _db.Salons.FirstOrDefaultAsync(s => s.Id == salonId && s.IsActive)
                    ?? throw new NotFoundException("Salon not found.");

        var service = await _db.Services.FirstOrDefaultAsync(s => s.Id == serviceId && s.SalonId == salonId)
                      ?? throw new NotFoundException("Service not found for this salon.");
        if (!service.IsActive)
            throw new BadRequestException("This service is not currently available.");

        var duration = service.DurationInMinutes;

        var businessHours = await _db.SalonBusinessHours
            .Where(h => h.SalonId == salonId)
            .ToDictionaryAsync(h => h.DayOfWeek);

        // Barbers who can perform this service and are active.
        var capableBarbers = await _db.Barbers
            .Where(b => b.SalonId == salonId && b.IsActive
                        && b.BarberServices.Any(bs => bs.ServiceId == serviceId))
            .Include(b => b.Schedules)
            .ToListAsync();

        var barberIds = capableBarbers.Select(b => b.Id).ToList();

        // Preload leaves in range.
        var leaves = await _db.BarberLeaves
            .Where(l => barberIds.Contains(l.BarberId)
                        && l.LeaveDate >= startDate && l.LeaveDate <= endDate)
            .ToListAsync();
        var leaveLookup = leaves
            .GroupBy(l => l.BarberId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.LeaveDate).ToHashSet());

        // Preload existing (non-cancelled) appointments in range.
        var appts = await _db.Appointments
            .Where(a => barberIds.Contains(a.BarberId)
                        && a.AppointmentDate >= startDate && a.AppointmentDate <= endDate
                        && a.Status != AppointmentStatus.CANCELLED)
            .Select(a => new { a.BarberId, a.AppointmentDate, a.StartTime, a.EndTime })
            .ToListAsync();

        var response = new AvailabilityResponse
        {
            SalonId = salonId,
            ServiceId = serviceId,
            DurationInMinutes = duration
        };

        var now = DateTime.UtcNow;

        for (var date = startDate; date <= endDate; date = date.AddDays(1))
        {
            var dayDto = new DayAvailabilityDto
            {
                Date = TimeUtil.FormatDate(date),
                DayName = date.DayOfWeek.ToString()
            };

            businessHours.TryGetValue(date.DayOfWeek, out var bh);
            if (bh is null || bh.IsClosed || bh.OpenTime is null || bh.CloseTime is null)
            {
                dayDto.IsClosed = true;
                response.Days.Add(dayDto);
                continue;
            }

            var open = bh.OpenTime.Value;
            var close = bh.CloseTime.Value;

            for (var slotStart = open;
                 slotStart + TimeSpan.FromMinutes(duration) <= close;
                 slotStart += TimeSpan.FromMinutes(SlotStepMinutes))
            {
                var slotEnd = slotStart + TimeSpan.FromMinutes(duration);

                // Skip past times for today.
                if (date == DateOnly.FromDateTime(now) && slotStart <= now.TimeOfDay)
                    continue;

                int availableBarbers = 0;
                foreach (var barber in capableBarbers)
                {
                    if (IsBarberFree(barber, date, slotStart, slotEnd, leaveLookup, appts))
                        availableBarbers++;
                }

                dayDto.Slots.Add(new SlotDto
                {
                    Time = TimeUtil.FormatTime(slotStart),
                    EndTime = TimeUtil.FormatTime(slotEnd),
                    Available = availableBarbers > 0,
                    AvailableBarbers = availableBarbers
                });
            }

            response.Days.Add(dayDto);
        }

        return response;
    }

    private static bool IsBarberFree(
        Barber barber,
        DateOnly date,
        TimeSpan slotStart,
        TimeSpan slotEnd,
        Dictionary<int, HashSet<DateOnly>> leaveLookup,
        IEnumerable<dynamic> appts)
    {
        // Date-specific leave.
        if (leaveLookup.TryGetValue(barber.Id, out var leaveDates) && leaveDates.Contains(date))
            return false;

        // Weekly schedule.
        var schedule = barber.Schedules.FirstOrDefault(s => s.DayOfWeek == date.DayOfWeek);
        if (schedule is null || schedule.IsOff || schedule.StartTime is null || schedule.EndTime is null)
            return false;
        if (slotStart < schedule.StartTime.Value || slotEnd > schedule.EndTime.Value)
            return false;

        // Overlap with existing appointments (two intervals overlap when start < otherEnd && otherStart < end).
        foreach (var a in appts)
        {
            if (a.BarberId != barber.Id) continue;
            if (a.AppointmentDate != date) continue;
            if (slotStart < a.EndTime && a.StartTime < slotEnd)
                return false;
        }

        return true;
    }
}
