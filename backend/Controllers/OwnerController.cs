using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Controllers;

[Route("api/owner")]
[Authorize(Roles = "SALON_OWNER")]
public class OwnerController : ApiControllerBase
{
    private readonly IAppointmentService _appointments;
    private readonly ISalonService _salons;

    public OwnerController(IAppointmentService appointments, ISalonService salons)
    {
        _appointments = appointments;
        _salons = salons;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<OwnerDashboardDto>> Dashboard()
        => Ok(await _appointments.GetOwnerDashboardAsync(CurrentUserId));

    [HttpGet("salon")]
    public async Task<ActionResult<SalonDto?>> MySalon()
        => Ok(await _salons.GetMySalonAsync(CurrentUserId));
}
