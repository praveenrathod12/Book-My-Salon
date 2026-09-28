using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Controllers;

[Route("api/salons")]
public class SalonsController : ApiControllerBase
{
    private readonly ISalonService _salons;
    private readonly IServiceService _services;
    private readonly IBarberService _barbers;
    private readonly IAvailabilityService _availability;

    public SalonsController(ISalonService salons, IServiceService services,
        IBarberService barbers, IAvailabilityService availability)
    {
        _salons = salons;
        _services = services;
        _barbers = barbers;
        _availability = availability;
    }

    [HttpGet]
    public async Task<ActionResult<List<SalonDto>>> GetAll([FromQuery] string? search, [FromQuery] string? city)
        => Ok(await _salons.GetAllAsync(search, city));

    [HttpGet("mine")]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<ActionResult<SalonDto?>> GetMine()
        => Ok(await _salons.GetMySalonAsync(CurrentUserId));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SalonDto>> GetById(int id)
        => Ok(await _salons.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<ActionResult<SalonDto>> Create(SalonUpsertRequest request)
        => StatusCode(201, await _salons.CreateAsync(CurrentUserId, request));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<ActionResult<SalonDto>> Update(int id, SalonUpsertRequest request)
        => Ok(await _salons.UpdateAsync(CurrentUserId, id, request));

    // ----- Business hours -----
    [HttpGet("{id:int}/business-hours")]
    public async Task<ActionResult<List<BusinessHourDto>>> GetHours(int id)
        => Ok(await _salons.GetBusinessHoursAsync(id));

    [HttpPut("{id:int}/business-hours")]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<ActionResult<List<BusinessHourDto>>> UpdateHours(int id, BusinessHoursUpdateRequest request)
        => Ok(await _salons.UpdateBusinessHoursAsync(CurrentUserId, id, request));

    // ----- Nested services -----
    [HttpGet("{salonId:int}/services")]
    public async Task<ActionResult<List<ServiceDto>>> GetServices(int salonId, [FromQuery] bool includeInactive = false)
        => Ok(await _services.GetBySalonAsync(salonId, includeInactive));

    // ----- Nested barbers -----
    [HttpGet("{salonId:int}/barbers")]
    public async Task<ActionResult<List<BarberDto>>> GetBarbers(int salonId, [FromQuery] bool includeInactive = false)
        => Ok(await _barbers.GetBySalonAsync(salonId, includeInactive));

    [HttpPost("{salonId:int}/barbers")]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<ActionResult<BarberDto>> CreateBarber(int salonId, BarberUpsertRequest request)
        => StatusCode(201, await _barbers.CreateAsync(CurrentUserId, salonId, request));

    // ----- Availability (core feature) -----
    [HttpGet("{salonId:int}/availability")]
    public async Task<ActionResult<AvailabilityResponse>> GetAvailability(
        int salonId,
        [FromQuery] int serviceId,
        [FromQuery] string startDate,
        [FromQuery] string endDate)
    {
        var start = Services.TimeUtil.ParseDate(startDate, "startDate");
        var end = Services.TimeUtil.ParseDate(endDate, "endDate");
        return Ok(await _availability.GetAvailabilityAsync(salonId, serviceId, start, end));
    }
}
