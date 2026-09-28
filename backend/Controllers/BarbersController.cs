using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Controllers;

[Route("api/barbers")]
public class BarbersController : ApiControllerBase
{
    private readonly IBarberService _barbers;

    public BarbersController(IBarberService barbers) => _barbers = barbers;

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BarberDto>> GetById(int id)
        => Ok(await _barbers.GetByIdAsync(id));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<ActionResult<BarberDto>> Update(int id, BarberUpsertRequest request)
        => Ok(await _barbers.UpdateAsync(CurrentUserId, id, request));

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<ActionResult<BarberDto>> SetStatus(int id, BarberStatusRequest request)
        => Ok(await _barbers.SetStatusAsync(CurrentUserId, id, request.IsActive));

    [HttpPut("{id:int}/schedule")]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<ActionResult<BarberDto>> UpdateSchedule(int id, BarberScheduleUpdateRequest request)
        => Ok(await _barbers.UpdateScheduleAsync(CurrentUserId, id, request));

    [HttpPost("{id:int}/leaves")]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<ActionResult<BarberLeaveDto>> AddLeave(int id, BarberLeaveRequest request)
        => StatusCode(201, await _barbers.AddLeaveAsync(CurrentUserId, id, request));

    [HttpDelete("{id:int}/leaves/{leaveId:int}")]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<IActionResult> RemoveLeave(int id, int leaveId)
    {
        await _barbers.RemoveLeaveAsync(CurrentUserId, id, leaveId);
        return NoContent();
    }
}
