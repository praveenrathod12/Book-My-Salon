using Microsoft.EntityFrameworkCore;
using SalonBooking.Api.Data;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Entities;
using SalonBooking.Api.Exceptions;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Services;

public class ServiceService : IServiceService
{
    private readonly AppDbContext _db;

    public ServiceService(AppDbContext db) => _db = db;

    public async Task<List<ServiceDto>> GetBySalonAsync(int salonId, bool includeInactive = false)
    {
        var query = _db.Services.Where(s => s.SalonId == salonId);
        if (!includeInactive) query = query.Where(s => s.IsActive);
        var list = await query.OrderBy(s => s.Name).ToListAsync();
        return list.Select(ToDto).ToList();
    }

    public async Task<ServiceDto> CreateAsync(int ownerId, ServiceUpsertRequest request)
    {
        if (request.SalonId is null)
            throw new BadRequestException("SalonId is required.");

        var salon = await LoadOwnedSalon(ownerId, request.SalonId.Value);

        var service = new Service
        {
            SalonId = salon.Id,
            Name = request.Name.Trim(),
            Description = request.Description,
            Price = request.Price,
            DurationInMinutes = request.DurationInMinutes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Services.Add(service);
        await _db.SaveChangesAsync();
        return ToDto(service);
    }

    public async Task<ServiceDto> UpdateAsync(int ownerId, int serviceId, ServiceUpsertRequest request)
    {
        var service = await LoadOwnedService(ownerId, serviceId);
        service.Name = request.Name.Trim();
        service.Description = request.Description;
        service.Price = request.Price;
        service.DurationInMinutes = request.DurationInMinutes;
        service.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ToDto(service);
    }

    public async Task<ServiceDto> SetStatusAsync(int ownerId, int serviceId, bool isActive)
    {
        var service = await LoadOwnedService(ownerId, serviceId);
        service.IsActive = isActive;
        service.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ToDto(service);
    }

    public async Task DeleteAsync(int ownerId, int serviceId)
    {
        var service = await LoadOwnedService(ownerId, serviceId);

        // Preserve history: if appointments reference it, soft-delete via IsActive.
        var hasAppointments = await _db.Appointments.AnyAsync(a => a.ServiceId == serviceId);
        if (hasAppointments)
        {
            service.IsActive = false;
            service.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            var links = await _db.BarberServices.Where(bs => bs.ServiceId == serviceId).ToListAsync();
            _db.BarberServices.RemoveRange(links);
            _db.Services.Remove(service);
        }
        await _db.SaveChangesAsync();
    }

    private async Task<Salon> LoadOwnedSalon(int ownerId, int salonId)
    {
        var salon = await _db.Salons.FirstOrDefaultAsync(s => s.Id == salonId)
                    ?? throw new NotFoundException("Salon not found.");
        if (salon.OwnerId != ownerId)
            throw new ForbiddenException("You can only manage services for your own salon.");
        return salon;
    }

    private async Task<Service> LoadOwnedService(int ownerId, int serviceId)
    {
        var service = await _db.Services.Include(s => s.Salon)
            .FirstOrDefaultAsync(s => s.Id == serviceId)
            ?? throw new NotFoundException("Service not found.");
        if (service.Salon!.OwnerId != ownerId)
            throw new ForbiddenException("You can only manage your own services.");
        return service;
    }

    private static ServiceDto ToDto(Service s) => new()
    {
        Id = s.Id,
        SalonId = s.SalonId,
        Name = s.Name,
        Description = s.Description,
        Price = s.Price,
        DurationInMinutes = s.DurationInMinutes,
        IsActive = s.IsActive
    };
}
