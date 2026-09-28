using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBooking.Api.DTOs;
using SalonBooking.Api.Entities;
using SalonBooking.Api.Interfaces;

namespace SalonBooking.Api.Controllers;

[Route("api/appointments")]
[Authorize]
public class AppointmentsController : ApiControllerBase
{
    private readonly IAppointmentService _appointments;

    public AppointmentsController(IAppointmentService appointments) => _appointments = appointments;

    // Customers list their own bookings; owners list appointments at their salon.
    [HttpGet]
    public async Task<ActionResult<List<AppointmentDto>>> Get([FromQuery] string? status, [FromQuery] string? date)
    {
        if (CurrentUserRole == UserRole.SALON_OWNER)
            return Ok(await _appointments.GetForOwnerAsync(CurrentUserId, status, date));
        return Ok(await _appointments.GetForCustomerAsync(CurrentUserId, status));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AppointmentDto>> GetById(int id)
        => Ok(await _appointments.GetByIdAsync(CurrentUserId, CurrentUserRole, id));

    [HttpPost]
    [Authorize(Roles = "CUSTOMER")]
    public async Task<ActionResult<AppointmentDto>> Create(CreateAppointmentRequest request)
        => StatusCode(201, await _appointments.CreateAsync(CurrentUserId, request));

    [HttpPut("{id:int}/reschedule")]
    [Authorize(Roles = "CUSTOMER")]
    public async Task<ActionResult<AppointmentDto>> Reschedule(int id, RescheduleRequest request)
        => Ok(await _appointments.RescheduleAsync(CurrentUserId, id, request));

    [HttpPatch("{id:int}/cancel")]
    public async Task<ActionResult<AppointmentDto>> Cancel(int id, CancelRequest request)
        => Ok(await _appointments.CancelAsync(CurrentUserId, CurrentUserRole, id, request.Reason));

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "SALON_OWNER")]
    public async Task<ActionResult<AppointmentDto>> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
        => Ok(await _appointments.UpdateStatusAsync(CurrentUserId, id, request.Status));
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
