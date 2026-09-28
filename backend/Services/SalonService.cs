using Microsoft.EntityFrameworkCore;
using SalonBooking.Api.Data;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Entities;
using SalonBooking.Api.Exceptions;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Services;

public class SalonService : ISalonService
{
    private readonly AppDbContext _db;

    public SalonService(AppDbContext db) => _db = db;

    public async Task<List<SalonDto>> GetAllAsync(string? search, string? city)
    {
        var query = _db.Salons
            .Include(s => s.Services)
            .Include(s => s.Barbers)
            .Include(s => s.BusinessHours)
            .Where(s => s.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term)
                                     || (s.City != null && s.City.ToLower().Contains(term))
                                     || (s.Address != null && s.Address.ToLower().Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(city))
        {
            var c = city.Trim().ToLower();
            query = query.Where(s => s.City != null && s.City.ToLower().Contains(c));
        }

        var salons = await query.ToListAsync();
        return salons.Select(ToDto).ToList();
    }

    public async Task<SalonDto> GetByIdAsync(int id)
    {
        var salon = await _db.Salons
            .Include(s => s.Services)
            .Include(s => s.Barbers)
            .Include(s => s.BusinessHours)
            .FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException("Salon not found.");
        return ToDto(salon);
    }

    public async Task<SalonDto?> GetMySalonAsync(int ownerId)
    {
        var salon = await _db.Salons
            .Include(s => s.Services)
            .Include(s => s.Barbers)
            .Include(s => s.BusinessHours)
            .FirstOrDefaultAsync(s => s.OwnerId == ownerId);
        return salon is null ? null : ToDto(salon);
    }

    public async Task<SalonDto> CreateAsync(int ownerId, SalonUpsertRequest request)
    {
        var salon = new Salon
        {
            OwnerId = ownerId,
            Name = request.Name.Trim(),
            Description = request.Description,
            Address = request.Address,
            City = request.City,
            State = request.State,
            PostalCode = request.PostalCode,
            PhoneNumber = request.PhoneNumber,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Seed default business hours (Mon-Sat open, Sun open shorter) so availability works immediately.
        for (int day = 0; day < 7; day++)
        {
            var dow = (DayOfWeek)day;
            salon.BusinessHours.Add(new SalonBusinessHour
            {
                DayOfWeek = dow,
                IsClosed = false,
                OpenTime = dow == DayOfWeek.Sunday ? new TimeSpan(10, 0, 0) : new TimeSpan(9, 0, 0),
                CloseTime = dow == DayOfWeek.Saturday ? new TimeSpan(22, 0, 0)
                          : dow == DayOfWeek.Sunday ? new TimeSpan(18, 0, 0)
                          : new TimeSpan(21, 0, 0)
            });
        }

        _db.Salons.Add(salon);
        await _db.SaveChangesAsync();
        return ToDto(salon);
    }

    public async Task<SalonDto> UpdateAsync(int ownerId, int salonId, SalonUpsertRequest request)
    {
        var salon = await LoadOwnedSalon(ownerId, salonId);

        salon.Name = request.Name.Trim();
        salon.Description = request.Description;
        salon.Address = request.Address;
        salon.City = request.City;
        salon.State = request.State;
        salon.PostalCode = request.PostalCode;
        salon.PhoneNumber = request.PhoneNumber;
        salon.Latitude = request.Latitude;
        salon.Longitude = request.Longitude;
        salon.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return await GetByIdAsync(salon.Id);
    }

    public async Task<List<BusinessHourDto>> GetBusinessHoursAsync(int salonId)
    {
        var hours = await _db.SalonBusinessHours
            .Where(h => h.SalonId == salonId)
            .OrderBy(h => h.DayOfWeek)
            .ToListAsync();
        return hours.Select(ToHourDto).ToList();
    }

    public async Task<List<BusinessHourDto>> UpdateBusinessHoursAsync(int ownerId, int salonId, BusinessHoursUpdateRequest request)
    {
        var salon = await LoadOwnedSalon(ownerId, salonId);

        var existing = await _db.SalonBusinessHours.Where(h => h.SalonId == salonId).ToListAsync();
        _db.SalonBusinessHours.RemoveRange(existing);

        foreach (var h in request.Hours)
        {
            _db.SalonBusinessHours.Add(new SalonBusinessHour
            {
                SalonId = salonId,
                DayOfWeek = (DayOfWeek)h.DayOfWeek,
                IsClosed = h.IsClosed,
                OpenTime = h.IsClosed ? null : TimeUtil.ParseTimeOrNull(h.OpenTime),
                CloseTime = h.IsClosed ? null : TimeUtil.ParseTimeOrNull(h.CloseTime)
            });
        }

        salon.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetBusinessHoursAsync(salonId);
    }

    private async Task<Salon> LoadOwnedSalon(int ownerId, int salonId)
    {
        var salon = await _db.Salons.FirstOrDefaultAsync(s => s.Id == salonId)
                    ?? throw new NotFoundException("Salon not found.");
        if (salon.OwnerId != ownerId)
            throw new ForbiddenException("You can only manage your own salon.");
        return salon;
    }

    private static SalonDto ToDto(Salon s) => new()
    {
        Id = s.Id,
        OwnerId = s.OwnerId,
        Name = s.Name,
        Description = s.Description,
        Address = s.Address,
        City = s.City,
        State = s.State,
        PostalCode = s.PostalCode,
        PhoneNumber = s.PhoneNumber,
        Latitude = s.Latitude,
        Longitude = s.Longitude,
        Rating = s.Rating,
        IsActive = s.IsActive,
        StartingPrice = s.Services.Where(x => x.IsActive).Select(x => (decimal?)x.Price).Min(),
        ServiceCount = s.Services.Count(x => x.IsActive),
        ActiveBarberCount = s.Barbers.Count(x => x.IsActive),
        BusinessHours = s.BusinessHours.OrderBy(h => h.DayOfWeek).Select(ToHourDto).ToList()
    };

    private static BusinessHourDto ToHourDto(SalonBusinessHour h) => new()
    {
        DayOfWeek = (int)h.DayOfWeek,
        IsClosed = h.IsClosed,
        OpenTime = h.OpenTime.HasValue ? TimeUtil.FormatTime(h.OpenTime.Value) : null,
        CloseTime = h.CloseTime.HasValue ? TimeUtil.FormatTime(h.CloseTime.Value) : null
    };
}
